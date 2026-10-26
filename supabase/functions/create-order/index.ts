
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type OrderItem = {
  variant_id: string;
  quantity: number;
};

type CreateOrderBody = {
  store_id: string;
  warehouse_id: string;
  customer_id: string | null;
  items: OrderItem[];
  paid_amount: number;
  payment_method: "cash" | "bank_transfer";
  idempotency_key: string;
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0;
}

function parseOrderBody(value: unknown): CreateOrderBody | null {
  if (!isRecord(value)) return null;

  const {
    store_id,
    warehouse_id,
    customer_id,
    items,
    paid_amount,
    payment_method,
    idempotency_key,
  } = value;
  const customerId = customer_id === undefined || customer_id === null
    ? null
    : isUuid(customer_id)
      ? customer_id
      : undefined;
  const paidAmount = paid_amount === undefined
    ? 0
    : isNonNegativeInteger(paid_amount)
      ? paid_amount
      : undefined;

  if (
    !isUuid(store_id) ||
    !isUuid(warehouse_id) ||
    customerId === undefined ||
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 100 ||
    !isUuid(idempotency_key) ||
    paidAmount === undefined ||
    (payment_method !== undefined &&
      payment_method !== "cash" &&
      payment_method !== "bank_transfer")
  ) {
    return null;
  }

  const parsedItems: OrderItem[] = [];
  for (const item of items) {
    if (
      !isRecord(item) ||
      !isUuid(item.variant_id) ||
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      return null;
    }
    parsedItems.push({
      variant_id: item.variant_id,
      quantity: item.quantity,
    });
  }

  return {
    store_id,
    warehouse_id,
    customer_id: customerId,
    items: parsedItems,
    paid_amount: paidAmount,
    payment_method: payment_method === "bank_transfer"
      ? "bank_transfer"
      : "cash",
    idempotency_key,
  };
}

function databaseErrorResponse(error: { code?: string; message: string }) {
  console.error("Create order failed:", error.code, error.message);
  if (error.code === "42501") {
    return jsonResponse({ error: "Tài khoản không có quyền tạo đơn." }, 403);
  }
  if (["22023", "23503", "23514", "23505", "55000"].includes(error.code ?? "")) {
    return jsonResponse(
      { error: "Không thể tạo đơn. Kiểm tra tồn kho, thanh toán và dữ liệu sản phẩm." },
      error.code === "23505" ? 409 : 400,
    );
  }
  return jsonResponse({ error: "Lỗi máy chủ khi tạo đơn." }, 500);
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

    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "JSON không hợp lệ." }, 400);
    }

    const body = parseOrderBody(rawBody);
    if (!body) {
      return jsonResponse(
        { error: "Thông tin cửa hàng, kho, khách hàng, thanh toán hoặc sản phẩm không hợp lệ." },
        400,
      );
    }
    const {
      store_id,
      warehouse_id,
      customer_id,
      items,
      paid_amount,
      payment_method,
      idempotency_key,
    } = body;

    // Kiểm tra quyền cửa hàng bằng client server-side.
    // Không tin user_id do trình duyệt gửi lên.
    const { data: membership, error: membershipError } =
      await ctx.supabaseAdmin
        .from("store_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("store_id", store_id)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup failed:", membershipError.message);
      return jsonResponse(
        { error: "Không thể xác minh quyền cửa hàng." },
        500,
      );
    }

    if (
      !membership ||
      !["owner", "manager", "cashier"].includes(membership.role)
    ) {
      return jsonResponse(
        { error: "Tài khoản không có quyền bán hàng tại cửa hàng này." },
        403,
      );
    }

    // RPC kiểm tra dữ liệu, lấy giá từ DB và giữ tồn kho
    // trong cùng transaction PostgreSQL.
    const { data: orderId, error: orderError } =
      await ctx.supabaseAdmin.rpc("create_and_reserve_order", {
        p_store_id: store_id,
        p_warehouse_id: warehouse_id,
        p_items: items,
        p_actor_id: userId,
        p_customer_id: customer_id,
        p_paid_amount: paid_amount,
        p_payment_method: payment_method,
        p_idempotency_key: idempotency_key,
      });

    if (orderError) {
      return databaseErrorResponse(orderError);
    }

    return jsonResponse({ order_id: orderId }, 201);
  }),
};
