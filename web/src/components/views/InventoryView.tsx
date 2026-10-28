import {
  Activity,
  Boxes,
  Download,
  FileUp,
  LoaderCircle,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { FormField } from "../FormField";
import type { BulkReceiptLine, CatalogItem, LedgerEntry } from "../../lib/types";
import { formatDate } from "../../lib/utils";

type InventoryViewProps = {
  catalog: CatalogItem[];
  ledger: LedgerEntry[];
  loading: boolean;
  canManageStock: boolean;
  selectedWarehouseId: string;
  lowStockCount: number;
  // Single movement
  stockVariantId: string;
  setStockVariantId: (id: string) => void;
  stockMovementType: "receipt" | "adjustment";
  setStockMovementType: (type: "receipt" | "adjustment") => void;
  stockQuantity: string;
  setStockQuantity: (v: string) => void;
  stockNote: string;
  setStockNote: (v: string) => void;
  handleInventoryMovement: (event: React.FormEvent<HTMLFormElement>) => void;
  // Bulk receipt
  bulkReceiptMode: "grid" | "csv";
  setBulkReceiptMode: (mode: "grid" | "csv") => void;
  bulkReceiptRows: BulkReceiptLine[];
  setBulkReceiptRows: (rows: BulkReceiptLine[] | ((prev: BulkReceiptLine[]) => BulkReceiptLine[])) => void;
  bulkReceiptNote: string;
  setBulkReceiptNote: (v: string) => void;
  bulkReceiptFileName: string;
  bulkReceiptBusy: boolean;
  bulkReceiptFileRef: RefObject<HTMLInputElement | null>;
  handleBulkCsvChange: (event: ChangeEvent<HTMLInputElement>) => void;
  downloadBulkCsvTemplate: () => void;
  addBulkReceiptLine: () => void;
  updateBulkReceiptLine: (id: string, patch: Partial<BulkReceiptLine>) => void;
  handleBulkReceiptSubmit: () => void;
  getBulkReceiptLine: (line: BulkReceiptLine) => { item: CatalogItem | null; error: string };
};

export function InventoryView({
  catalog,
  ledger,
  canManageStock,
  selectedWarehouseId,
  lowStockCount,
  stockVariantId,
  setStockVariantId,
  stockMovementType,
  setStockMovementType,
  stockQuantity,
  setStockQuantity,
  stockNote,
  setStockNote,
  handleInventoryMovement,
  bulkReceiptMode,
  setBulkReceiptMode,
  bulkReceiptRows,
  setBulkReceiptRows,
  bulkReceiptNote,
  setBulkReceiptNote,
  bulkReceiptFileName,
  bulkReceiptBusy,
  bulkReceiptFileRef,
  handleBulkCsvChange,
  downloadBulkCsvTemplate,
  addBulkReceiptLine,
  updateBulkReceiptLine,
  handleBulkReceiptSubmit,
  getBulkReceiptLine,
}: InventoryViewProps) {
  const totalOnHand = catalog.reduce((sum, item) => sum + item.onHand, 0);
  const totalReserved = catalog.reduce((sum, item) => sum + item.reserved, 0);

  return (
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Warehouse size={19} /></div>
          <div><span>Tồn vật lý</span><strong>{totalOnHand}</strong><small>Đơn vị trong kho đang chọn</small></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Boxes size={19} /></div>
          <div><span>Đang giữ</span><strong>{totalReserved}</strong><small>Đơn hàng chưa hoàn tất</small></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Activity size={19} /></div>
          <div><span>SKU tồn thấp</span><strong>{lowStockCount}</strong><small>Tồn khả dụng ≤ 3</small></div>
        </div>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Ghi nhận biến động kho</h2><p>Mọi thay đổi được khóa đồng thời và ghi sổ bất biến</p></div>
        </div>
        <form className="data-form form-grid" onSubmit={(event) => void handleInventoryMovement(event)}>
          <FormField label="SKU">
            <select required value={stockVariantId} onChange={(event) => setStockVariantId(event.target.value)}>
              <option value="">Chọn SKU</option>
              {catalog.map((item) => (
                <option key={item.variantId} value={item.variantId}>{item.productName} · {item.sku}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Loại nghiệp vụ">
            <select value={stockMovementType} onChange={(event) => setStockMovementType(event.target.value as "receipt" | "adjustment")}>
              <option value="receipt">Nhập hàng</option>
              <option value="adjustment">Điều chỉnh</option>
            </select>
          </FormField>
          <FormField label={stockMovementType === "receipt" ? "Số lượng nhập" : "Điều chỉnh (+/-)"}>
            <input
              type="number" step="1" required
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              placeholder={stockMovementType === "receipt" ? "Ví dụ: 25" : "Ví dụ: -2 hoặc 5"}
            />
          </FormField>
          <FormField label="Lý do / chứng từ">
            <input required maxLength={500} value={stockNote} onChange={(event) => setStockNote(event.target.value)} placeholder="Ví dụ: Nhập hàng theo phiếu PN-001" />
          </FormField>
          <button className="button button-primary" type="submit"><Boxes size={16} /> Ghi biến động</button>
        </form>
      </section>

      <section className="panel data-panel bulk-receipt-panel">
        <div className="panel-heading">
          <div>
            <h2>Nhập nhiều SKU cùng lúc</h2>
            <p>Phiếu nhập tăng tồn; các dòng hợp lệ được ghi độc lập, dòng lỗi có thể sửa và thử lại.</p>
          </div>
          <span className="subtle-count">{bulkReceiptRows.length}/200 dòng</span>
        </div>
        <div className="bulk-receipt-toolbar">
          <div className="bulk-receipt-modes" role="group" aria-label="Cách nhập nhiều SKU">
            <button
              className={`button ${bulkReceiptMode === "grid" ? "button-primary" : "button-secondary"}`}
              type="button"
              onClick={() => setBulkReceiptMode("grid")}
            >
              Nhập nhanh
            </button>
            <button
              className={`button ${bulkReceiptMode === "csv" ? "button-primary" : "button-secondary"}`}
              type="button"
              onClick={() => setBulkReceiptMode("csv")}
            >
              Tải CSV
            </button>
          </div>
          <div className="bulk-receipt-file-actions">
            <button className="button button-secondary" type="button" onClick={downloadBulkCsvTemplate}>
              <Download size={15} /> Tải mẫu CSV
            </button>
            <input
              ref={bulkReceiptFileRef}
              className="visually-hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleBulkCsvChange(event)}
            />
            <button className="button button-secondary" type="button" onClick={() => bulkReceiptFileRef.current?.click()}>
              <FileUp size={15} /> Chọn tệp CSV
            </button>
          </div>
        </div>
        {bulkReceiptMode === "grid" ? (
          <div className="bulk-receipt-hint">
            Chọn SKU và số lượng cho từng dòng. Dòng nhập nhanh và CSV dùng chung một lý do/chứng từ.
          </div>
        ) : (
          <div className="bulk-receipt-hint">
            {bulkReceiptFileName
              ? `Tệp: ${bulkReceiptFileName}. CSV UTF-8 cần có tiêu đề sku,quantity.`
              : "Chọn CSV UTF-8 có tiêu đề sku,quantity. Có thể dùng file mẫu ở trên."}
          </div>
        )}
        <FormField label="Lý do / mã chứng từ chung">
          <input
            required maxLength={500}
            value={bulkReceiptNote}
            onChange={(event) => setBulkReceiptNote(event.target.value)}
            placeholder="Ví dụ: Nhập theo phiếu PN-2026-015"
          />
        </FormField>
        <div className="table-scroll bulk-receipt-table">
          <table>
            <thead>
              <tr>
                <th>Dòng</th><th>SKU</th><th>Số lượng nhập</th><th>Kiểm tra / trạng thái</th><th></th>
              </tr>
            </thead>
            <tbody>
              {bulkReceiptRows.map((line, index) => {
                const validation = getBulkReceiptLine(line);
                const catalogItem = validation.item;
                const lineError = line.error ?? validation.error;
                return (
                  <tr key={line.id}>
                    <td>{bulkReceiptMode === "csv" ? `CSV ${line.sourceLine}` : index + 1}</td>
                    <td>
                      <select
                        aria-label={`SKU dòng ${index + 1}`}
                        value={line.sku}
                        disabled={line.status === "saved"}
                        onChange={(event) => updateBulkReceiptLine(line.id, { sku: event.target.value })}
                      >
                        <option value="">Chọn SKU</option>
                        {catalog.map((item) => (
                          <option key={item.variantId} value={item.sku}>{item.productName} · {item.sku}</option>
                        ))}
                      </select>
                      {catalogItem && <small className="bulk-receipt-product">{catalogItem.productName} · {catalogItem.variantName}</small>}
                    </td>
                    <td>
                      <input
                        aria-label={`Số lượng nhập dòng ${index + 1}`}
                        type="number" min="1" step="1" inputMode="numeric"
                        value={line.quantity}
                        disabled={line.status === "saved"}
                        onChange={(event) => updateBulkReceiptLine(line.id, { quantity: event.target.value })}
                      />
                    </td>
                    <td>
                      {line.status === "saved" ? (
                        <span className="bulk-receipt-status saved">Đã ghi nhận</span>
                      ) : lineError ? (
                        <span className="bulk-receipt-status error">{lineError}</span>
                      ) : (
                        <span className="bulk-receipt-status ready">Sẵn sàng ghi</span>
                      )}
                    </td>
                    <td>
                      {line.status !== "saved" && (
                        <button
                          className="remove-button" type="button"
                          aria-label={`Xóa dòng ${index + 1}`}
                          onClick={() => setBulkReceiptRows((current) => current.filter((row) => row.id !== line.id))}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {bulkReceiptRows.length === 0 && (
                <tr><td colSpan={5} className="table-empty">Chưa có dòng nhập. Thêm SKU hoặc tải tệp CSV.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bulk-receipt-actions">
          {bulkReceiptMode === "grid" && (
            <button
              className="button button-secondary" type="button"
              disabled={bulkReceiptRows.length >= 200 || bulkReceiptBusy}
              onClick={addBulkReceiptLine}
            >
              <Plus size={15} /> Thêm dòng
            </button>
          )}
          <button
            className="button button-primary" type="button"
            disabled={bulkReceiptBusy || !canManageStock || !selectedWarehouseId || bulkReceiptRows.length === 0}
            onClick={() => void handleBulkReceiptSubmit()}
          >
            {bulkReceiptBusy ? <LoaderCircle className="spin" size={16} /> : <Boxes size={16} />}
            {bulkReceiptBusy ? "Đang ghi..." : "Ghi các dòng hợp lệ"}
          </button>
        </div>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Tồn kho theo SKU</h2><p>Khả dụng = tồn vật lý - tồn giữ</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Tồn vật lý</th><th>Đang giữ</th><th>Khả dụng</th></tr></thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.variantId}>
                  <td>{item.productName}</td><td>{item.sku}</td>
                  <td>{item.onHand}</td><td>{item.reserved}</td><td>{item.available}</td>
                </tr>
              ))}
              {catalog.length === 0 && <tr><td colSpan={5} className="table-empty">Chưa có dữ liệu tồn kho.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Lịch sử kho</h2><p>100 biến động gần nhất</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>Thay đổi</th><th>Lý do / chứng từ</th></tr></thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.created_at)}</td>
                  <td>{catalog.find((item) => item.variantId === entry.variant_id)?.productName ?? entry.variant_id}</td>
                  <td>{entry.event_type}</td>
                  <td>{entry.quantity_delta > 0 ? "+" : ""}{entry.quantity_delta}</td>
                  <td>{typeof entry.metadata.note === "string" ? entry.metadata.note : entry.reference_type ?? "—"}</td>
                </tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={5} className="table-empty">Chưa có biến động kho.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
