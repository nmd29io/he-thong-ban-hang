import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Permission, Payment, Report, Recommendation, Order } from "../lib/types";
import { dateInputValue } from "../lib/utils";
import { useState } from "react";

export function useStoreData(
  userId: string | null,
  selectedStoreId: string,
  selectedWarehouseId: string,
  permissions: Permission[],
) {
  const queryClient = useQueryClient();
  const [reportFrom, setReportFrom] = useState(() =>
    dateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [reportUntil, setReportUntil] = useState(() => dateInputValue(new Date()));

  const isReady = Boolean(userId && selectedStoreId && selectedWarehouseId);

  const queryKey = [
    "store-data",
    userId,
    selectedStoreId,
    selectedWarehouseId,
    reportFrom,
    reportUntil,
    [...new Set(permissions)].sort().join(","),
  ];
  const has = (permission: Permission) => permissions.includes(permission);
  const canSell = has("sales.create");
  const canReadProducts =
    has("products.read") ||
    has("products.manage") ||
    has("inventory.read") ||
    has("inventory.manage") ||
    canSell;
  const canReadInventory = has("inventory.read") || has("inventory.manage") || canSell;
  const canReadOrders =
    has("orders.read") ||
    has("orders.manage") ||
    has("payments.read") ||
    has("payments.manage") ||
    canSell;
  const canReadCustomers = has("customers.read") || has("customers.manage") || canSell;
  const canReadPayments = has("payments.read") || has("payments.manage");

  const {
    data,
    isLoading: loading,
    error: rawError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey,
    enabled: isReady,
    staleTime: 30_000,
    queryFn: async () => {
      const from = new Date(`${reportFrom}T00:00:00`);
      const until = new Date(`${reportUntil}T00:00:00`);
      until.setDate(until.getDate() + 1);
      if (
        Number.isNaN(from.getTime()) ||
        Number.isNaN(until.getTime()) ||
        until <= from
      ) {
        throw new Error("Khoảng ngày báo cáo không hợp lệ.");
      }

      const [
        productResult,
        variantResult,
        balanceResult,
        orderResult,
        customerResult,
        ledgerResult,
        recommendationResult,
        reportResult,
      ] = await Promise.all([
        canReadProducts ? supabase
          .from("products")
          .select("id,name,description,image_path,category,brand,is_active,created_at")
          .order("name") : Promise.resolve({ data: [], error: null }),
        canReadProducts ? supabase
          .from("product_variants")
          .select("id,product_id,sku,variant_name,unit_price,unit,is_active,created_at")
          .order("sku") : Promise.resolve({ data: [], error: null }),
        canReadInventory ? supabase
          .from("inventory_balances")
          .select("warehouse_id,variant_id,on_hand,reserved,updated_at")
          .eq("warehouse_id", selectedWarehouseId) : Promise.resolve({ data: [], error: null }),
        canReadOrders ? supabase
          .from("sales_orders")
          .select(
            "id,order_number,store_id,warehouse_id,customer_id,created_by,status,currency,subtotal,discount_amount,tax_amount,total_amount,created_at,updated_at",
          )
          .eq("store_id", selectedStoreId)
          .order("created_at", { ascending: false })
          .limit(250) : Promise.resolve({ data: [], error: null }),
        canReadCustomers ? supabase
          .from("customers")
          .select("id,store_id,name,phone,email,notes,shipping_address,created_at,updated_at")
          .eq("store_id", selectedStoreId)
          .order("name")
          .limit(500) : Promise.resolve({ data: [], error: null }),
        has("inventory.read") || has("inventory.manage") || has("reports.read") ? supabase
          .from("inventory_ledger")
          .select(
            "id,warehouse_id,variant_id,event_type,quantity_delta,reference_type,reference_id,idempotency_key,metadata,created_at",
          )
          .eq("warehouse_id", selectedWarehouseId)
          .order("created_at", { ascending: false })
          .limit(100) : Promise.resolve({ data: [], error: null }),
        canSell ? supabase.rpc("get_store_recommendations", {
          p_store_id: selectedStoreId,
          p_limit: 8,
        }) : Promise.resolve({ data: [], error: null }),
        has("reports.read") ? supabase.rpc("get_store_report", {
          p_store_id: selectedStoreId,
          p_from: from.toISOString(),
          p_until: until.toISOString(),
        }) : Promise.resolve({ data: [], error: null }),
      ]);

      const firstError =
        productResult.error ??
        variantResult.error ??
        balanceResult.error ??
        orderResult.error ??
        customerResult.error ??
        ledgerResult.error ??
        recommendationResult.error ??
        reportResult.error;
      if (firstError) throw firstError;

      const orderRows: Order[] = orderResult.data ?? [];
      let paymentRows: Payment[] = [];
      if (orderRows.length > 0 && canReadPayments) {
        const paymentResult = await supabase
          .from("payments")
          .select(
            "id,order_id,provider,provider_payment_id,amount,currency,status,payment_method,received_by,idempotency_key,created_at,updated_at",
          )
          .in(
            "order_id",
            orderRows.map((o) => o.id),
          )
          .order("created_at", { ascending: false });
        if (paymentResult.error) throw paymentResult.error;
        paymentRows = paymentResult.data ?? [];
      }

      return {
        products: productResult.data ?? [],
        variants: variantResult.data ?? [],
        balances: balanceResult.data ?? [],
        orders: orderRows,
        customers: customerResult.data ?? [],
        ledger: ledgerResult.data ?? [],
        payments: paymentRows,
        recommendations: recommendationResult.data as Recommendation[] ?? [],
        report: (reportResult.data as Report[] ?? [])[0] ?? null,
      };
    },
  });

  function invalidateData() {
    void queryClient.invalidateQueries({ queryKey });
  }

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const error = rawError instanceof Error ? rawError.message : rawError ? String(rawError) : "";

  return {
    products: data?.products ?? [],
    variants: data?.variants ?? [],
    balances: data?.balances ?? [],
    orders: data?.orders ?? [],
    customers: data?.customers ?? [],
    ledger: data?.ledger ?? [],
    payments: data?.payments ?? [],
    recommendations: data?.recommendations ?? [],
    report: data?.report ?? null,
    loading,
    error,
    lastUpdated,
    refetch: () => void refetch(),
    invalidateData,
    reportFrom,
    reportUntil,
    setReportFrom,
    setReportUntil,
  };
}
