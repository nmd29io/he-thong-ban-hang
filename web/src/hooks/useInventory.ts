import { useRef, useState } from "react";
import { invokeEdgeFunction } from "../lib/edge-functions";
import { supabase } from "../lib/supabase";
import type { BulkReceiptLine, BulkReceiptResponse, CatalogItem, Notice } from "../lib/types";
import { errorText } from "../lib/utils";
import { parseInventoryCsv } from "../lib/inventory-csv";
import type { ChangeEvent } from "react";

export function useInventory(
  catalog: CatalogItem[],
  selectedStoreId: string,
  selectedWarehouseId: string,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const [stockVariantId, setStockVariantId] = useState("");
  const [stockMovementType, setStockMovementType] = useState<"receipt" | "adjustment">("receipt");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [bulkReceiptMode, setBulkReceiptMode] = useState<"grid" | "csv">("grid");
  const [bulkReceiptRows, setBulkReceiptRows] = useState<BulkReceiptLine[]>([]);
  const [bulkReceiptNote, setBulkReceiptNote] = useState("");
  const [bulkReceiptFileName, setBulkReceiptFileName] = useState("");
  const [bulkReceiptBusy, setBulkReceiptBusy] = useState(false);
  const bulkReceiptFileRef = useRef<HTMLInputElement>(null);
  const operationKeysRef = useRef(new Map<string, string>());

  function getOperationKey(signature: string) {
    const current = operationKeysRef.current.get(signature);
    if (current) return current;
    const key = crypto.randomUUID();
    operationKeysRef.current.set(signature, key);
    return key;
  }

  async function runOperation(body: Record<string, unknown>) {
    await invokeEdgeFunction<{ result: unknown }>("manage-operations", body);
    setNotice({ kind: "success", text: "Đã lưu thay đổi." });
    onSuccess();
  }

  function getBulkReceiptLine(line: BulkReceiptLine) {
    if (line.sourceError) return { item: null, error: line.sourceError };
    const sku = line.sku.trim().toLocaleLowerCase("vi");
    if (!sku) return { item: null, error: "Chọn SKU." };
    const matches = catalog.filter(
      (item) => item.sku.trim().toLocaleLowerCase("vi") === sku,
    );
    if (matches.length === 0) return { item: null, error: "Không tìm thấy SKU này." };
    if (matches.length > 1) return { item: null, error: "SKU bị trùng, không thể xác định sản phẩm." };
    if (!/^\d+$/.test(line.quantity.trim())) {
      return { item: null, error: "Số lượng phải là số nguyên dương." };
    }
    const quantity = Number(line.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return { item: null, error: "Số lượng phải là số nguyên dương hợp lệ." };
    }
    return { item: matches[0], error: "" };
  }

  async function handleInventoryMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(stockQuantity);
    if (!Number.isSafeInteger(amount) || amount === 0) {
      setError("Nhập số lượng nguyên khác 0. Điều chỉnh có thể dùng số âm.");
      return;
    }
    if (stockMovementType === "receipt" && amount < 0) {
      setError("Phiếu nhập phải có số lượng dương.");
      return;
    }
    if (!stockNote.trim()) {
      setError("Nhập lý do nhập hàng hoặc điều chỉnh tồn.");
      return;
    }
    const signature = `stock:${selectedStoreId}:${selectedWarehouseId}:${stockVariantId}:${stockMovementType}:${amount}:${stockNote.trim()}`;
    setError("");
    setNotice(null);
    try {
      await runOperation({
        action: "inventory_movement",
        store_id: selectedStoreId,
        warehouse_id: selectedWarehouseId,
        variant_id: stockVariantId,
        quantity_delta: amount,
        event_type: stockMovementType,
        note: stockNote.trim(),
        idempotency_key: getOperationKey(signature),
      });
      operationKeysRef.current.delete(signature);
      setStockQuantity("");
      setStockNote("");
    } catch (movementError) {
      setError(errorText(movementError, "Không lưu được biến động kho."));
    }
  }

  async function handleBulkCsvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError("");
    setNotice(null);
    try {
      const parsedRows = parseInventoryCsv(await file.text());
      setBulkReceiptRows(
        parsedRows.map((row) => ({
          id: crypto.randomUUID(),
          sku: row.sku,
          quantity: row.quantity,
          sourceLine: row.sourceLine,
          status: "ready",
          ...(row.error ? { sourceError: row.error } : {}),
        })),
      );
      setBulkReceiptFileName(file.name);
      setBulkReceiptMode("csv");
    } catch (csvError) {
      setError(errorText(csvError, "Không đọc được tệp CSV."));
    }
  }

  function downloadBulkCsvTemplate() {
    const content = "\uFEFFsku,quantity\r\nSKU-001,10\r\nSKU-002,5\r\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-nhap-kho.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function addBulkReceiptLine() {
    setBulkReceiptRows((current) =>
      current.length >= 200
        ? current
        : [
            ...current,
            {
              id: crypto.randomUUID(),
              sku: "",
              quantity: "",
              sourceLine: current.length + 1,
              status: "ready",
            },
          ],
    );
  }

  function updateBulkReceiptLine(id: string, patch: Partial<BulkReceiptLine>) {
    setBulkReceiptRows((current) =>
      current.map((line) =>
        line.id === id && line.status !== "saved"
          ? { ...line, ...patch, status: "ready", error: undefined, sourceError: undefined }
          : line,
      ),
    );
  }

  async function handleBulkReceiptSubmit() {
    if (!selectedStoreId || !selectedWarehouseId || bulkReceiptBusy) return;
    if (!bulkReceiptNote.trim()) {
      setError("Nhập lý do hoặc mã chứng từ chung cho lô hàng.");
      return;
    }
    if (bulkReceiptRows.length === 0) {
      setError("Thêm dòng SKU hoặc tải tệp CSV trước khi ghi nhận.");
      return;
    }
    if (bulkReceiptNote.trim().length > 500) {
      setError("Lý do hoặc mã chứng từ không được vượt quá 500 ký tự.");
      return;
    }

    const checkedRows = bulkReceiptRows.map((line) => ({
      line,
      ...getBulkReceiptLine(line),
    }));
    setBulkReceiptRows((current) =>
      current.map((line) => {
        if (line.status === "saved") return line;
        const validation = checkedRows.find((c) => c.line.id === line.id);
        if (!validation?.error) return { ...line, status: "ready", error: undefined };
        return { ...line, status: "error", error: validation.error };
      }),
    );
    const readyRows = checkedRows.filter(
      (checked): checked is typeof checked & { item: CatalogItem } =>
        checked.line.status !== "saved" && !checked.error && checked.item !== null,
    );
    if (readyRows.length === 0) {
      setError("Không có dòng hợp lệ để ghi. Kiểm tra lỗi ngay trong bảng.");
      return;
    }

    setBulkReceiptBusy(true);
    setError("");
    setNotice(null);
    try {
      const response = await invokeEdgeFunction<BulkReceiptResponse>("manage-operations", {
        action: "inventory_movement_batch",
        store_id: selectedStoreId,
        warehouse_id: selectedWarehouseId,
        note: bulkReceiptNote.trim(),
        rows: readyRows.map(({ line, item }) => {
          const quantity = Number(line.quantity);
          const signature = `bulk-stock:${line.id}:${selectedStoreId}:${selectedWarehouseId}:${item.variantId}:${quantity}:${bulkReceiptNote.trim()}`;
          return {
            row_id: line.id,
            variant_id: item.variantId,
            quantity_delta: quantity,
            idempotency_key: getOperationKey(signature),
          };
        }),
      });
      const resultByRowId = new Map(response.results.map((r) => [r.row_id, r]));
      const savedCount = readyRows.filter(({ line }) => resultByRowId.get(line.id)?.success).length;
      for (const { line, item } of readyRows) {
        if (resultByRowId.get(line.id)?.success) {
          const signature = `bulk-stock:${line.id}:${selectedStoreId}:${selectedWarehouseId}:${item.variantId}:${Number(line.quantity)}:${bulkReceiptNote.trim()}`;
          operationKeysRef.current.delete(signature);
        }
      }
      setBulkReceiptRows((current) =>
        current.map((line) => {
          if (line.status === "saved" || !readyRows.some((c) => c.line.id === line.id)) {
            return line;
          }
          const result = resultByRowId.get(line.id);
          if (result?.success) return { ...line, status: "saved", error: undefined };
          return {
            ...line,
            status: "error",
            error: result?.error ?? "Máy chủ không trả kết quả cho dòng này. Có thể thử lại an toàn.",
          };
        }),
      );

      const submittedIds = new Set(readyRows.map(({ line }) => line.id));
      const failedCount = checkedRows.filter(
        (c) =>
          c.line.status !== "saved" &&
          (Boolean(c.error) ||
            (submittedIds.has(c.line.id) && !resultByRowId.get(c.line.id)?.success)),
      ).length;
      if (savedCount > 0) onSuccess();
      setNotice({
        kind: failedCount > 0 ? "error" : "success",
        text:
          failedCount > 0
            ? `Đã ghi ${savedCount} dòng; ${failedCount} dòng chưa ghi và được giữ lại để sửa/thử lại.`
            : `Đã ghi nhận ${savedCount} dòng nhập kho.`,
      });
    } catch (bulkError) {
      setError(
        errorText(
          bulkError,
          "Không ghi được lô nhập kho. Các khóa gửi lặp được giữ để thử lại an toàn.",
        ),
      );
    } finally {
      setBulkReceiptBusy(false);
    }
  }

  return {
    stockVariantId,
    setStockVariantId,
    stockMovementType,
    setStockMovementType,
    stockQuantity,
    setStockQuantity,
    stockNote,
    setStockNote,
    bulkReceiptMode,
    setBulkReceiptMode,
    bulkReceiptRows,
    setBulkReceiptRows,
    bulkReceiptNote,
    setBulkReceiptNote,
    bulkReceiptFileName,
    bulkReceiptBusy,
    bulkReceiptFileRef,
    handleInventoryMovement,
    handleBulkCsvChange,
    downloadBulkCsvTemplate,
    addBulkReceiptLine,
    updateBulkReceiptLine,
    handleBulkReceiptSubmit,
    getBulkReceiptLine,
    getOperationKey,
    runOperation,
  };
}

