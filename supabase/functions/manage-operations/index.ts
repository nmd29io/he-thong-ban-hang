import { withSupabase } from "@supabase/server";

type Action =
  | "inventory_movement"
  | "inventory_movement_batch"
  | "record_payment"
  | "complete_order"
  | "cancel_order";

type InventoryBatchRow = {
  row_id: string;
  variant_id: string;
  quantity_delta: number;
  idempotency_key: string;
  validation_error?: string;
};

type InventoryBatchResult = {
  row_id: string;
  success: boolean;
  result?: unknown;
  error?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

function getRequiredPermission(action: Action): string {
  if (action === "inventory_movement" || action === "inventory_movement_batch") {
    return "inventory.manage";
  }
  if (action === "record_payment") {
    return "payments.manage";
  }
  return "orders.manage";
}

function errorResponse(error: { code?: string; message: string }) {
  console.error("Operation failed:", error.code, error.message);
  if (error.code === "42501") {
    return jsonResponse({ error: "Tài khoản không có quyền thực hiện thao tác này." }, 403);
  }
  if (["22023", "23503", "23514", "23505", "55000", "P0002"].includes(error.code ?? "")) {
    return jsonResponse({ error: "Dữ liệu không hợp lệ hoặc trạng thái đã thay đổi." }, 400);
  }
  return jsonResponse({ error: "Lỗi máy chủ khi xử lý thao tác." }, 500);
}

function inventoryErrorMessage(code?: string) {
  if (code === "42501") return "Không có quyền ghi biến động kho.";
  if (code === "23503") return "SKU hoặc kho không tồn tại/không khả dụng.";
  if (code === "23514") return "Không thể giảm tồn thấp hơn số đang giữ.";
  if (code === "23505") return "Khóa gửi lặp đã được dùng cho dữ liệu khác.";
  if (code === "22023") return "Số lượng hoặc lý do nhập không hợp lệ.";
  return "Lỗi máy chủ khi ghi dòng này.";
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Chỉ hỗ trợ POST." }, 405);
    }

    const userId = ctx.userClaims?.id;
    if (!userId) {
      return jsonResponse({ error: "Chưa đăng nhập." }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON không hợp lệ." }, 400);
    }
    if (!isRecord(body)) {
      return jsonResponse({ error: "Thông tin thao tác không hợp lệ." }, 400);
    }

    const { action, store_id, warehouse_id, variant_id, quantity_delta,
      event_type, note, order_id, amount, payment_method, idempotency_key,
      rows } = body;

    if (
      (action !== "inventory_movement" &&
        action !== "inventory_movement_batch" &&
        action !== "record_payment" &&
        action !== "complete_order" &&
        action !== "cancel_order") ||
      !isUuid(store_id)
    ) {
      return jsonResponse({ error: "Thao tác hoặc cửa hàng không hợp lệ." }, 400);
    }

    if (action === "inventory_movement") {
      if (
        !isUuid(warehouse_id) ||
        !isUuid(variant_id) ||
        typeof quantity_delta !== "number" ||
        !Number.isSafeInteger(quantity_delta) ||
        quantity_delta === 0 ||
        (event_type !== "receipt" && event_type !== "adjustment") ||
        typeof note !== "string" ||
        note.trim().length < 1 ||
        note.trim().length > 500 ||
        !isUuid(idempotency_key)
      ) {
        return jsonResponse({ error: "Thông tin biến động kho không hợp lệ." }, 400);
      }
    } else if (action === "inventory_movement_batch") {
      if (
        !isUuid(warehouse_id) ||
        typeof note !== "string" ||
        note.trim().length < 1 ||
        note.trim().length > 500 ||
        !Array.isArray(rows) ||
        rows.length < 1 ||
        rows.length > 200
      ) {
        return jsonResponse({ error: "Thông tin lô nhập kho không hợp lệ (tối đa 200 dòng)." }, 400);
      }
    } else if (action === "record_payment") {
      if (
        !isUuid(order_id) ||
        typeof amount !== "number" ||
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        (payment_method !== "cash" && payment_method !== "bank_transfer") ||
        !isUuid(idempotency_key)
      ) {
        return jsonResponse({ error: "Thông tin thanh toán không hợp lệ." }, 400);
      }
    } else if (!isUuid(order_id)) {
      return jsonResponse({ error: "Đơn hàng không hợp lệ." }, 400);
    }

    const { data: membership, error: membershipError } =
      await ctx.supabaseAdmin
        .from("store_memberships")
        .select("role,permissions")
        .eq("user_id", userId)
        .eq("store_id", store_id)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup failed:", membershipError.message);
      return jsonResponse({ error: "Không thể xác minh quyền cửa hàng." }, 500);
    }
    if (
      !membership ||
      (membership.role !== "owner" &&
        !membership.permissions.includes(getRequiredPermission(action)))
    ) {
      return jsonResponse({ error: "Tài khoản không có quyền thực hiện thao tác này." }, 403);
    }

    if (action === "inventory_movement_batch") {
      if (!Array.isArray(rows) || typeof note !== "string") {
        return jsonResponse({ error: "Thông tin lô nhập kho không hợp lệ." }, 400);
      }
      const batchRows: unknown[] = rows;
      const batchNote = note.trim();
      const seenRowIds = new Set<string>();
      const parsedRows: InventoryBatchRow[] = batchRows.map((row, index) => {
        const fallbackRowId = `row-${index + 1}`;
        if (!isRecord(row)) {
          return {
            row_id: fallbackRowId,
            variant_id: "",
            quantity_delta: 0,
            idempotency_key: "",
            validation_error: "Dữ liệu dòng không hợp lệ.",
          };
        }

        const rowId = isUuid(row.row_id) ? row.row_id : fallbackRowId;
        let validationError: string | undefined;
        if (!isUuid(row.row_id)) validationError = "Mã dòng không hợp lệ.";
        else if (seenRowIds.has(row.row_id)) validationError = "Mã dòng bị trùng.";
        else if (!isUuid(row.variant_id)) validationError = "SKU không hợp lệ.";
        else if (
          typeof row.quantity_delta !== "number" ||
          !Number.isSafeInteger(row.quantity_delta) ||
          row.quantity_delta <= 0
        ) validationError = "Số lượng nhập phải là số nguyên dương.";
        else if (!isUuid(row.idempotency_key)) validationError = "Khóa gửi lặp không hợp lệ.";

        if (isUuid(row.row_id)) seenRowIds.add(row.row_id);
        return {
          row_id: rowId,
          variant_id: typeof row.variant_id === "string" ? row.variant_id : "",
          quantity_delta: typeof row.quantity_delta === "number" ? row.quantity_delta : 0,
          idempotency_key: typeof row.idempotency_key === "string" ? row.idempotency_key : "",
          ...(validationError ? { validation_error: validationError } : {}),
        };
      });

      const results: InventoryBatchResult[] = [];
      for (let start = 0; start < parsedRows.length; start += 10) {
        const chunk = parsedRows.slice(start, start + 10);
        const chunkResults = await Promise.all(chunk.map(async (row) => {
          if (row.validation_error) {
            return { row_id: row.row_id, success: false, error: row.validation_error };
          }
          const { data, error } = await ctx.supabaseAdmin.rpc("record_inventory_movement", {
            p_store_id: store_id,
            p_warehouse_id: warehouse_id,
            p_variant_id: row.variant_id,
            p_quantity_delta: row.quantity_delta,
            p_event_type: "receipt",
            p_note: batchNote,
            p_actor_id: userId,
            p_idempotency_key: row.idempotency_key,
          });
          if (error) {
            console.error("Inventory batch row failed:", row.row_id, error.code, error.message);
            return {
              row_id: row.row_id,
              success: false,
              error: inventoryErrorMessage(error.code),
            };
          }
          return { row_id: row.row_id, success: true, result: data };
        }));
        results.push(...chunkResults);
      }
      return jsonResponse({ results });
    }

    let result: { data: unknown; error: { code?: string; message: string } | null };
    if (action === "inventory_movement") {
      if (typeof note !== "string") {
        return jsonResponse({ error: "Lý do biến động kho không hợp lệ." }, 400);
      }
      result = await ctx.supabaseAdmin.rpc("record_inventory_movement", {
        p_store_id: store_id,
        p_warehouse_id: warehouse_id,
        p_variant_id: variant_id,
        p_quantity_delta: quantity_delta,
        p_event_type: event_type,
        p_note: note.trim(),
        p_actor_id: userId,
        p_idempotency_key: idempotency_key,
      });
    } else if (action === "record_payment") {
      result = await ctx.supabaseAdmin.rpc("record_order_payment", {
        p_store_id: store_id,
        p_order_id: order_id,
        p_amount: amount,
        p_payment_method: payment_method,
        p_actor_id: userId,
        p_idempotency_key: idempotency_key,
      });
    } else if (action === "complete_order") {
      result = await ctx.supabaseAdmin.rpc("complete_sales_order", {
        p_store_id: store_id,
        p_order_id: order_id,
        p_actor_id: userId,
      });
    } else {
      result = await ctx.supabaseAdmin.rpc("cancel_sales_order", {
        p_store_id: store_id,
        p_order_id: order_id,
        p_actor_id: userId,
      });
    }

    if (result.error) return errorResponse(result.error);
    return jsonResponse({ result: result.data });
  }),
};
