import { useRef, useState } from "react";
import { invokeEdgeFunction } from "../lib/edge-functions";
import type { CartLine, CatalogItem, Notice, Payment } from "../lib/types";
import { errorText } from "../lib/utils";
import { useMemo } from "react";

export function useCart(
  catalog: CatalogItem[],
  payments: Payment[],
  selectedStoreId: string,
  selectedWarehouseId: string,
  userId: string | null,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [initialPaidAmount, setInitialPaidAmount] = useState("0");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("cash");
  const [creatingOrder, setCreatingOrder] = useState(false);

  const pendingOrderRef = useRef<{ signature: string; key: string } | null>(null);

  const cartDetails = useMemo(
    () =>
      cart.flatMap((line) => {
        const item = catalog.find((entry) => entry.variantId === line.variantId);
        return item ? [{ ...item, quantity: line.quantity }] : [];
      }),
    [cart, catalog],
  );

  const cartTotal = cartDetails.reduce(
    (total, line) => total + line.unitPrice * line.quantity,
    0,
  );
  const cartQuantity = cartDetails.reduce((total, line) => total + line.quantity, 0);

  const paymentsByOrder = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of payments) {
      if (payment.status === "succeeded") {
        totals.set(
          payment.order_id,
          (totals.get(payment.order_id) ?? 0) + Number(payment.amount),
        );
      }
    }
    return totals;
  }, [payments]);

  function invalidatePendingOrder() {
    pendingOrderRef.current = null;
  }

  function addToCart(item: CatalogItem) {
    if (item.available < 1) return;
    invalidatePendingOrder();
    setCart((current) => {
      const existing = current.find((line) => line.variantId === item.variantId);
      if (existing) {
        if (existing.quantity >= item.available) return current;
        return current.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { variantId: item.variantId, quantity: 1 }];
    });
  }

  function changeQuantity(variantId: string, delta: number) {
    const item = catalog.find((entry) => entry.variantId === variantId);
    if (!item) return;
    invalidatePendingOrder();
    setCart((current) =>
      current.flatMap((line) => {
        if (line.variantId !== variantId) return [line];
        const nextQuantity = line.quantity + delta;
        if (nextQuantity < 1) return [];
        if (nextQuantity > item.available) return [line];
        return [{ ...line, quantity: nextQuantity }];
      }),
    );
  }

  function clearCart() {
    invalidatePendingOrder();
    setCart([]);
  }

  function removeFromCart(variantId: string) {
    invalidatePendingOrder();
    setCart((current) => current.filter((entry) => entry.variantId !== variantId));
  }

  async function handleCreateOrder() {
    if (!userId || !selectedStoreId || !selectedWarehouseId || cartDetails.length === 0 || creatingOrder) {
      return;
    }
    setCreatingOrder(true);
    setError("");
    setNotice(null);
    try {
      const paidAmount = Number(initialPaidAmount);
      if (!Number.isSafeInteger(paidAmount) || paidAmount < 0 || paidAmount > cartTotal) {
        throw new Error(
          "Số tiền nhận trước phải là số nguyên không âm, không vượt quá tổng đơn.",
        );
      }
      const payload: Record<string, unknown> = {
        store_id: selectedStoreId,
        warehouse_id: selectedWarehouseId,
        customer_id: selectedCustomerId || null,
        items: cartDetails.map((line) => ({
          variant_id: line.variantId,
          quantity: line.quantity,
        })),
        paid_amount: paidAmount,
        payment_method: initialPaymentMethod,
      };
      const signature = JSON.stringify(payload);
      if (!pendingOrderRef.current || pendingOrderRef.current.signature !== signature) {
        pendingOrderRef.current = { signature, key: crypto.randomUUID() };
      }
      payload.idempotency_key = pendingOrderRef.current.key;
      const result = await invokeEdgeFunction<{ order_id: string }>("create-order", payload);
      if (!result.order_id) throw new Error("Máy chủ không trả về mã đơn hàng.");

      pendingOrderRef.current = null;
      setCart([]);
      setSelectedCustomerId("");
      setInitialPaidAmount("0");
      setNotice({
        kind: "success",
        text: `Đã tạo đơn hàng ${result.order_id}. Tồn kho được giữ trong giao dịch.`,
      });
      onSuccess();
    } catch (createError) {
      setError(errorText(createError, "Không tạo được đơn hàng."));
    } finally {
      setCreatingOrder(false);
    }
  }

  return {
    cart,
    cartDetails,
    cartTotal,
    cartQuantity,
    paymentsByOrder,
    selectedCustomerId,
    setSelectedCustomerId: (id: string) => { invalidatePendingOrder(); setSelectedCustomerId(id); },
    initialPaidAmount,
    setInitialPaidAmount: (v: string) => { invalidatePendingOrder(); setInitialPaidAmount(v); },
    initialPaymentMethod,
    setInitialPaymentMethod: (v: string) => { invalidatePendingOrder(); setInitialPaymentMethod(v); },
    creatingOrder,
    addToCart,
    changeQuantity,
    clearCart,
    removeFromCart,
    handleCreateOrder,
  };
}

