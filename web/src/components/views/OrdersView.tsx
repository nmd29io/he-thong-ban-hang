import { FormField } from "../FormField";
import type { Customer, Order, Payment } from "../../lib/types";
import { formatDate, formatMoney } from "../../lib/utils";
import { orderStatusNames } from "../../lib/types";

type OrdersViewProps = {
  orders: Order[];
  customers: Customer[];
  payments: Payment[];
  paymentsByOrder: Map<string, number>;
  customerById: Map<string, string | null>;
  loading: boolean;
  canManageOrders: boolean;
  canManagePayments: boolean;
  canViewPayments: boolean;
  paymentOrderId: string;
  setPaymentOrderId: (id: string) => void;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  handleRecordPayment: (event: React.FormEvent<HTMLFormElement>) => void;
  completeOrder: (order: Order) => void;
  confirmOrder: (order: Order) => void;
  cancelOrder: (order: Order) => void;
  setError: (error: string) => void;
};

export function OrdersView({
  orders,
  loading,
  canManageOrders,
  canManagePayments,
  canViewPayments,
  paymentsByOrder,
  customerById,
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
  setError,
}: OrdersViewProps) {
  return (
    <section className="panel data-panel">
      <div className="panel-heading">
        <div><h2>Lịch sử đơn hàng</h2><p>Hiển thị tối đa 250 đơn gần nhất của cửa hàng</p></div>
        <span className="subtle-count">{orders.length} đơn</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th>
              <th>Tổng tiền</th><th>Đã thu</th><th>Thời gian</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const paid = paymentsByOrder.get(order.id) ?? 0;
              return (
                <tr key={order.id}>
                  <td className="order-number">{order.order_number}</td>
                  <td>{order.customer_id ? customerById.get(order.customer_id) ?? "Khách hàng" : "Khách lẻ"}</td>
                  <td><span className={`status status-${order.status}`}>{orderStatusNames[order.status] ?? order.status}</span></td>
                  <td className="amount">{formatMoney(Number(order.total_amount), order.currency)}</td>
                  <td>{canViewPayments ? formatMoney(paid, order.currency) : "—"}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td className="table-actions">
                    <div className="table-action-buttons">
                      {order.status === "pending_confirmation" && canManageOrders && (
                        <>
                          <button className="text-button" onClick={() => confirmOrder(order)}>Xác nhận</button>
                          <button className="text-button danger-text" onClick={() => cancelOrder(order)}>Hủy</button>
                        </>
                      )}
                      {order.status === "confirmed" && (canManageOrders || canManagePayments) && (
                        <>
                          {canManagePayments && <button className="text-button" onClick={() => { setPaymentOrderId(order.id); setPaymentAmount(""); setError(""); }}>Thu tiền</button>}
                          {canManageOrders && <button className="text-button" onClick={() => completeOrder(order)}>Hoàn tất</button>}
                          {canManageOrders && <button className="text-button danger-text" onClick={() => cancelOrder(order)}>Hủy</button>}
                        </>
                      )}
                      {order.status === "fulfilled" && canManagePayments && paid < Number(order.total_amount) && (
                        <button className="text-button" onClick={() => { setPaymentOrderId(order.id); setPaymentAmount(""); }}>Thu tiền</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="table-empty">Chưa có đơn hàng.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {paymentOrderId && canManagePayments && (
        <form className="inline-form payment-form" onSubmit={(event) => void handleRecordPayment(event)}>
          <strong>Ghi nhận thanh toán</strong>
          <FormField label="Số tiền">
            <input type="number" min="1" step="1" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
          </FormField>
          <FormField label="Hình thức">
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
          </FormField>
          <button className="button button-primary" type="submit">Lưu thanh toán</button>
          <button className="button button-secondary" type="button" onClick={() => setPaymentOrderId("")}>Đóng</button>
        </form>
      )}
    </section>
  );
}
