import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type StorefrontItem = {
  variant_id: string;
  quantity: number;
};

type StorefrontBody =
  | { action: "catalog" }
  | {
    action: "checkout";
    store_id: string;
    warehouse_id: string;
    items: StorefrontItem[];
    customer_name: string;
    customer_phone: string;
    shipping_address: string;
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

function parseBody(value: unknown): StorefrontBody | null {
  if (!isRecord(value) || (value.action !== "catalog" && value.action !== "checkout")) {
    return null;
  }
  if (value.action === "catalog") return { action: "catalog" };

  const { store_id, warehouse_id, items, customer_name, customer_phone, shipping_address, idempotency_key } = value;
  if (
    !isUuid(store_id) ||
    !isUuid(warehouse_id) ||
    !isUuid(idempotency_key) ||
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 100 ||
    typeof customer_name !== "string" ||
    customer_name.trim().length < 1 ||
    customer_name.trim().length > 120 ||
    typeof customer_phone !== "string" ||
    customer_phone.trim().length < 1 ||
    customer_phone.trim().length > 32 ||
    typeof shipping_address !== "string" ||
    shipping_address.trim().length < 1 ||
    shipping_address.trim().length > 500
  ) {
    return null;
  }

  const quantities = new Map<string, number>();
  for (const item of items) {
    if (
      !isRecord(item) ||
      !isUuid(item.variant_id) ||
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) return null;
    quantities.set(item.variant_id, (quantities.get(item.variant_id) ?? 0) + item.quantity);
  }
  if (quantities.size > 100 || [...quantities.values()].some((quantity) => quantity > 99)) {
    return null;
  }

  return {
    action: "checkout",
    store_id,
    warehouse_id,
    items: [...quantities].map(([variant_id, quantity]) => ({ variant_id, quantity })),
    customer_name: customer_name.trim(),
    customer_phone: customer_phone.trim(),
    shipping_address: shipping_address.trim(),
    idempotency_key,
  };
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Chỉ hỗ trợ POST." }, 405);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "JSON không hợp lệ." }, 400);
    }

    const body = parseBody(rawBody);
    if (!body) {
      return jsonResponse({ error: "Thông tin yêu cầu không hợp lệ." }, 400);
    }

    if (body.action === "catalog") {
      const { data: store, error: storeError } = await ctx.supabaseAdmin
        .from("stores")
        .select("id,name")
        .eq("is_active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (storeError) {
        console.error("Storefront store lookup failed:", storeError.message);
        return jsonResponse({ error: "Không tải được cửa hàng." }, 500);
      }
      if (!store) return jsonResponse({ error: "Cửa hàng chưa sẵn sàng bán online." }, 404);

      const { data: warehouses, error: warehouseError } = await ctx.supabaseAdmin
        .from("warehouses")
        .select("id")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("created_at")
        .limit(1);
      if (warehouseError) {
        console.error("Storefront warehouse lookup failed:", warehouseError.message);
        return jsonResponse({ error: "Không tải được danh sách sản phẩm." }, 500);
      }
      const warehouse = warehouses?.[0];
      if (!warehouse) return jsonResponse({ error: "Cửa hàng chưa có kho hoạt động." }, 404);

      const [productsResult, variantsResult, balancesResult] = await Promise.all([
        ctx.supabaseAdmin.from("products").select("id,name,description,image_path,category,brand").eq("is_active", true).order("name"),
        ctx.supabaseAdmin
          .from("product_variants")
          .select("id,product_id,sku,variant_name,unit_price,unit")
          .eq("is_active", true)
          .order("sku"),
        ctx.supabaseAdmin
          .from("inventory_balances")
          .select("variant_id,on_hand,reserved")
          .eq("warehouse_id", warehouse.id),
      ]);
      const firstError = productsResult.error ?? variantsResult.error ?? balancesResult.error;
      if (firstError) {
        console.error("Storefront catalog lookup failed:", firstError.message);
        return jsonResponse({ error: "Không tải được danh sách sản phẩm." }, 500);
      }

      const productById = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
      const balanceByVariant = new Map((balancesResult.data ?? []).map((balance) => [balance.variant_id, balance]));
      const items = (variantsResult.data ?? []).flatMap((variant) => {
        const product = productById.get(variant.product_id);
        if (!product) return [];
        const balance = balanceByVariant.get(variant.id);
        const imageUrl = product.image_path
          ? ctx.supabaseAdmin.storage.from("product-images").getPublicUrl(product.image_path).data.publicUrl
          : null;
        return [{
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          description: product.description,
          imageUrl,
          category: product.category,
          brand: product.brand,
          sku: variant.sku,
          variantName: variant.variant_name ?? "Mặc định",
          unitPrice: Number(variant.unit_price),
          unit: variant.unit,
          available: Math.max(0, Number(balance?.on_hand ?? 0) - Number(balance?.reserved ?? 0)),
        }];
      });

      return jsonResponse({
        storeId: store.id,
        storeName: store.name,
        warehouseId: warehouse.id,
        items,
      });
    }

    const authorization = req.headers.get("Authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return jsonResponse({ error: "Vui lòng đăng nhập để đặt hàng." }, 401);
    }
    const { data: userData, error: userError } = await ctx.supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." }, 401);
    }
    const userId = userData.user.id;

    const { data: orderId, error: orderError } = await ctx.supabaseAdmin.rpc(
      "create_storefront_order_for_user",
      {
        p_store_id: body.store_id,
        p_warehouse_id: body.warehouse_id,
        p_items: body.items,
        p_customer_name: body.customer_name,
        p_customer_phone: body.customer_phone,
        p_shipping_address: body.shipping_address,
        p_idempotency_key: body.idempotency_key,
        p_user_id: userId,
      },
    );
    if (orderError) {
      console.error("Storefront order failed:", orderError.code, orderError.message);
      if (orderError.code === "42501") {
        return jsonResponse({ error: "Không thể xác nhận quyền tạo đơn." }, 403);
      }
      if (["22023", "23503", "23514", "23505", "55000"].includes(orderError.code ?? "")) {
        return jsonResponse(
          { error: "Không thể đặt hàng. Vui lòng kiểm tra tồn kho và thử lại." },
          orderError.code === "23505" ? 409 : 400,
        );
      }
      return jsonResponse({ error: "Lỗi máy chủ khi tạo đơn." }, 500);
    }

    const { data: order, error: lookupError } = await ctx.supabaseAdmin
      .from("sales_orders")
      .select("order_number")
      .eq("id", orderId)
      .maybeSingle();
    if (lookupError || !order) {
      console.error("Storefront order reference lookup failed:", lookupError?.message ?? "No order");
      return jsonResponse({ error: "Đơn đã được tạo nhưng không tải được mã đơn." }, 500);
    }
    return jsonResponse({ order_number: order.order_number }, 201);
  }),
};
