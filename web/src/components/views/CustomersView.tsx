import { UserRound } from "lucide-react";
import { FormField } from "../FormField";
import type { Customer, Order } from "../../lib/types";
import { formatMoney } from "../../lib/utils";
import type { UseFormReturn } from "react-hook-form";

type CustomerFormData = {
  customerName: string;
  customerPhone: string;
};

type CustomersViewProps = {
  customers: Customer[];
  orders: Order[];
  loading: boolean;
  form: UseFormReturn<CustomerFormData>;
  handleCreateCustomer: (data: CustomerFormData) => void;
};

export function CustomersView({
  customers,
  orders,
  loading,
  form,
  handleCreateCustomer,
}: CustomersViewProps) {
  const { register, handleSubmit } = form;

  return (
    <>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Thêm khách hàng</h2><p>Lưu hồ sơ cơ bản và tra cứu đơn mua</p></div>
        </div>
        <form className="data-form form-grid two-columns" onSubmit={(e) => void handleSubmit(handleCreateCustomer)(e)}>
          <FormField label="Tên khách hàng">
            <input required maxLength={160} {...register("customerName")} />
          </FormField>
          <FormField label="Số điện thoại">
            <input type="tel" maxLength={32} {...register("customerPhone")} />
          </FormField>
          <button className="button button-primary" type="submit"><UserRound size={16} /> Thêm khách hàng</button>
        </form>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Khách hàng</h2><p>{customers.length} hồ sơ cửa hàng</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Khách hàng</th><th>Điện thoại</th><th>Đơn mua gần đây</th><th>Tổng chi tiêu trong danh sách</th></tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const customerOrders = orders.filter(
                  (order) => order.customer_id === customer.id && order.status !== "cancelled",
                );
                return (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone ?? "—"}</td>
                    <td>{customerOrders.length}</td>
                    <td>{formatMoney(customerOrders.reduce((sum, order) => sum + Number(order.total_amount), 0))}</td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr><td colSpan={4} className="table-empty">Chưa có khách hàng.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

