import {
  Activity,
  ClipboardList,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { FormField } from "../FormField";
import type { CatalogItem, Customer, Notice } from "../../lib/types";
import { formatMoney } from "../../lib/utils";

type PosViewProps = {
  catalog: CatalogItem[];
  filteredCatalog: CatalogItem[];
  search: string;
  setSearch: (v: string) => void;
  loading: boolean;
  cart: { variantId: string; quantity: number }[];
  cartDetails: (CatalogItem & { quantity: number })[];
  cartTotal: number;
  cartQuantity: number;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  initialPaidAmount: string;
  setInitialPaidAmount: (v: string) => void;
  initialPaymentMethod: string;
  setInitialPaymentMethod: (v: string) => void;
  creatingOrder: boolean;
  customers: Customer[];
  canSell: boolean;
  selectedWarehouseId: string;
  orders: { length: number };
  lowStockCount: number;
  recommendations: CatalogItem[];
  addToCart: (item: CatalogItem) => void;
  changeQuantity: (variantId: string, delta: number) => void;
  clearCart: () => void;
  removeFromCart: (variantId: string) => void;
  handleCreateOrder: () => void;
};

export function PosView({
  catalog,
  filteredCatalog,
  search,
  setSearch,
  loading,
  cart,
  cartDetails,
  cartTotal,
  cartQuantity,
  selectedCustomerId,
  setSelectedCustomerId,
  initialPaidAmount,
  setInitialPaidAmount,
  initialPaymentMethod,
  setInitialPaymentMethod,
  creatingOrder,
  customers,
  canSell,
  selectedWarehouseId,
  orders,
  lowStockCount,
  recommendations,
  addToCart,
  changeQuantity,
  clearCart,
  removeFromCart,
  handleCreateOrder,
}: PosViewProps) {
  return (
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><Package size={19} /></div>
          <div>
            <span>Sản phẩm đang bán</span>
            <strong>{catalog.filter((item) => item.isActive).length}</strong>
            <small>SKU hoạt động</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ClipboardList size={19} /></div>
          <div>
            <span>Đơn gần đây</span>
            <strong>{orders.length}</strong>
            <small>Đơn thuộc cửa hàng</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Activity size={19} /></div>
          <div>
            <span>SKU tồn thấp</span>
            <strong>{lowStockCount}</strong>
            <small>Tồn khả dụng từ 3 trở xuống</small>
          </div>
        </div>
      </section>

      <section className="panel recommendation-panel">
        <div className="panel-heading">
          <div>
            <h2>Gợi ý sản phẩm</h2>
            <p>{recommendations.length > 0
              ? "Dựa trên mặt hàng bán chạy trong 90 ngày"
              : "Gợi ý danh mục còn hàng khi chưa có lịch sử bán"}</p>
          </div>
        </div>
        <div className="recommendation-list">
          {recommendations.map((item) => (
            <button className="recommendation-item" key={item.variantId} onClick={() => addToCart(item)}>
              <Package size={16} />
              <span>{item.productName}<small>{item.sku}</small></span>
              <strong>{formatMoney(item.unitPrice)}</strong>
              <Plus size={16} />
            </button>
          ))}
          {recommendations.length === 0 && <p className="muted-copy">Chưa có sản phẩm còn hàng để gợi ý.</p>}
        </div>
      </section>

      <section className="pos-layout">
        <div className="panel product-panel">
          <div className="panel-heading">
            <div><h2>Chọn sản phẩm</h2><p>Tìm theo tên, SKU hoặc biến thể</p></div>
            <span className="subtle-count">{filteredCatalog.length} SKU</span>
          </div>
          <label className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
          </label>
          {loading && catalog.length === 0 ? (
            <div className="empty-state"><LoaderCircle className="spin" size={24} /><p>Đang tải dữ liệu...</p></div>
          ) : filteredCatalog.length === 0 ? (
            <div className="empty-state"><Package size={30} /><strong>Chưa tìm thấy SKU</strong><p>Thử đổi từ khóa hoặc kiểm tra danh mục sản phẩm.</p></div>
          ) : (
            <div className="product-list">
              {filteredCatalog.map((item) => {
                const quantity = cart.find((line) => line.variantId === item.variantId)?.quantity ?? 0;
                return (
                  <article className="product-row" key={item.variantId}>
                    <div className="product-icon"><Package size={21} /></div>
                    <div className="product-info"><strong>{item.productName}</strong><span>{item.variantName}</span><small>SKU: {item.sku}</small></div>
                    <div className="product-stock"><strong>{formatMoney(item.unitPrice)}</strong><span className={item.available === 0 ? "stock-zero" : "stock-ok"}>Còn {item.available}</span></div>
                    <button
                      className="icon-button add-button"
                      aria-label={`Thêm ${item.productName} vào giỏ`}
                      disabled={item.available === 0 || quantity >= item.available}
                      onClick={() => addToCart(item)}
                    >
                      <Plus size={19} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel cart-panel">
          <div className="panel-heading">
            <div><h2>Giỏ hàng</h2><p>{cartQuantity} sản phẩm</p></div>
            {cart.length > 0 && <button className="text-button" onClick={clearCart}>Xóa giỏ</button>}
          </div>
          {cartDetails.length === 0 ? (
            <div className="empty-cart">
              <div className="cart-illustration"><ShoppingCart size={29} /></div>
              <strong>Giỏ hàng đang trống</strong>
              <p>Chọn sản phẩm để bắt đầu tạo đơn.</p>
            </div>
          ) : (
            <div className="cart-lines">
              {cartDetails.map((line) => (
                <div className="cart-line" key={line.variantId}>
                  <div className="cart-line-info">
                    <strong>{line.productName}</strong>
                    <span>{line.sku}</span>
                    <small>{formatMoney(line.unitPrice)} / sản phẩm</small>
                  </div>
                  <div className="quantity-control">
                    <button aria-label="Giảm số lượng" onClick={() => changeQuantity(line.variantId, -1)}><Minus size={13} /></button>
                    <span>{line.quantity}</span>
                    <button aria-label="Tăng số lượng" disabled={line.quantity >= line.available} onClick={() => changeQuantity(line.variantId, 1)}><Plus size={13} /></button>
                  </div>
                  <button className="remove-button" aria-label="Xóa sản phẩm khỏi giỏ" onClick={() => removeFromCart(line.variantId)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="cart-checkout-fields">
            <FormField label="Khách hàng (không bắt buộc)">
              <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="">Khách lẻ</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="form-grid two-columns">
              <FormField label="Nhận trước">
                <input type="number" min="0" step="1" value={initialPaidAmount} onChange={(event) => setInitialPaidAmount(event.target.value)} />
              </FormField>
              <FormField label="Hình thức">
                <select value={initialPaymentMethod} onChange={(event) => setInitialPaymentMethod(event.target.value)}>
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                </select>
              </FormField>
            </div>
          </div>
          <div className="cart-summary">
            <div className="summary-row"><span>Tạm tính</span><strong>{formatMoney(cartTotal)}</strong></div>
            <div className="summary-total"><span>Tổng thanh toán</span><strong>{formatMoney(cartTotal)}</strong></div>
            <button
              className="button button-primary checkout-button"
              disabled={!canSell || cartDetails.length === 0 || creatingOrder || !selectedWarehouseId}
              onClick={handleCreateOrder}
            >
              {creatingOrder ? <LoaderCircle className="spin" size={17} /> : <ShoppingCart size={17} />}
              {creatingOrder ? "Đang tạo đơn..." : "Tạo đơn và giữ tồn kho"}
            </button>
            <p className="checkout-note"><AlertCircle size={14} /> Giá và tồn kho được kiểm tra lại trong giao dịch phía máy chủ.</p>
          </div>
        </div>
      </section>
    </>
  );
}

