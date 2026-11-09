import { useState } from "react";
import { invokeEdgeFunction } from "../lib/edge-functions";
import type { Notice, Order } from "../lib/types";
import { errorText } from "../lib/utils";

export function useOrder(
  selectedStoreId: string,
  canSell: boolean,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
  getOperationKey: (sig: string) => string,
  deleteOperationKey: (sig: string) => void,
) {
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  async function handleRecordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Số tiền thanh toán phải là số nguyên dương.");
      return;
    }
    const signature = `payment:${paymentOrderId}:${amount}:${paymentMethod}`;
    setError("");
    setNotice(null);
    try {
      await invokeEdgeFunction<{ result: unknown }>("manage-operations", {
        action: "record_payment",
        store_id: selectedStoreId,
        order_id: paymentOrderId,
        amount,
        payment_method: paymentMethod,
        idempotency_key: getOperationKey(signature),
      });
      setNotice({ kind: "success", text: "Đã lưu thay đổi." });
      deleteOperationKey(signature);
      setPaymentOrderId("");
      setPaymentAmount("");
      onSuccess();
    } catch (paymentError) {
      setError(errorText(paymentError, "Không ghi nhận được thanh toán."));
    }
  }

  async function completeOrder(order: Order) {
    if (!window.confirm(`Hoàn tất đơn ${order.order_number} và xuất tồn kho?`)) return;
    setError("");
    try {
      await invokeEdgeFunction<{ result: unknown }>("manage-operations", {
        action: "complete_order",
        store_id: selectedStoreId,
        order_id: order.id,
      });
      setNotice({ kind: "success", text: "Đã lưu thay đổi." });
      onSuccess();
    } catch (operationError) {
      setError(errorText(operationError, "Không hoàn tất được đơn hàng."));
    }
  }

  async function confirmOrder(order: Order) {
    if (!window.confirm(`Xác nhận đơn online ${order.order_number}?`)) return;
    setError("");
    try {
      await invokeEdgeFunction<{ result: unknown }>("manage-operations", {
        action: "confirm_order",
        store_id: selectedStoreId,
        order_id: order.id,
      });
      setNotice({ kind: "success", text: `Đã xác nhận đơn ${order.order_number}.` });
      onSuccess();
    } catch (operationError) {
      setError(errorText(operationError, "Không xác nhận được đơn hàng."));
    }
  }

  async function cancelOrder(order: Order) {
    if (!window.confirm(`Hủy đơn ${order.order_number} và nhả hàng đã giữ?`)) return;
    setError("");
    try {
      await invokeEdgeFunction<{ result: unknown }>("manage-operations", {
        action: "cancel_order",
        store_id: selectedStoreId,
        order_id: order.id,
      });
      setNotice({ kind: "success", text: "Đã lưu thay đổi." });
      onSuccess();
    } catch (operationError) {
      setError(errorText(operationError, "Không hủy được đơn hàng."));
    }
  }

  return {
    paymentOrderId,
    setPaymentOrderId,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    handleRecordPayment,
    completeOrder,
    confirmOrder,
    cancelOrder,
    canSell,
  };
}
