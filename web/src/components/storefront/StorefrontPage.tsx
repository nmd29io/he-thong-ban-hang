import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { invokeEdgeFunction } from "../../lib/edge-functions";
import { formatMoney } from "../../lib/utils";
import type { CatalogItem } from "../../lib/types";

type StorefrontCatalog = {
  storeId: string;
  storeName: string;
  warehouseId: string;
  items: StorefrontItem[];
};

type StorefrontOrder = {
  order_number: string;
};

type CartLine = { variantId: string; quantity: number };
type StorefrontItem = Pick<
  CatalogItem,
  "variantId" | "productId" | "productName" | "description" | "imageUrl" | "sku" | "variantName" | "unitPrice" | "available"
>;
const EMPTY_CATALOG: StorefrontItem[] = [];

export function StorefrontPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["storefront-catalog"],
    queryFn: () => invokeEdgeFunction<StorefrontCatalog>("storefront", { action: "catalog" }),
    staleTime: 30_000,
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = data?.storeName
      ? `${data.storeName} | Cửa hàng trực tuyến`
      : "Cửa hàng trực tuyến";
    return () => {
      document.title = previousTitle;
    };
  }, [data?.storeName]);

  const catalog = data?.items ?? EMPTY_CATALOG;
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return catalog.filter((item) =>
      (!term ||
        item.productName.toLocaleLowerCase("vi").includes(term) ||
        item.variantName.toLocaleLowerCase("vi").includes(term) ||
        item.sku.toLocaleLowerCase("vi").includes(term)),
    );
  }, [catalog, search]);

  const cartDetails = cart.flatMap((line) => {
    const item = catalog.find((entry) => entry.variantId === line.variantId);
    return item ? [{ ...item, quantity: line.quantity }] : [];
  });
  const cartTotal = cartDetails.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const cartQuantity = cartDetails.reduce((total, item) => total + item.quantity, 0);

  function updateQuantity(variantId: string, delta: number) {
    idempotencyRef.current = null;
    setCart((current) => current.flatMap((line) => {
      if (line.variantId !== variantId) return [line];
      const item = catalog.find((entry) => entry.variantId === variantId);
      const next = line.quantity + delta;
      if (next < 1) return [];
      if (!item || next > Math.min(item.available, 99)) return [line];
      return [{ ...line, quantity: next }];
    }));
  }

  function addToCart(item: StorefrontItem) {
    if (item.available < 1) return;
    idempotencyRef.current = null;
    setCart((current) => {
      const existing = current.find((line) => line.variantId === item.variantId);
      if (existing) {
        if (existing.quantity >= Math.min(item.available, 99)) return current;
        return current.map((line) =>
          line.variantId === item.variantId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { variantId: item.variantId, quantity: 1 }];
    });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || cartDetails.length === 0 || checkoutBusy) return;
    setCheckoutBusy(true);
    setCheckoutError("");

    try {
      const payload = {
        action: "checkout",
        store_id: data.storeId,
        warehouse_id: data.warehouseId,
        items: cartDetails.map(({ variantId, quantity }) => ({
          variant_id: variantId,
          quantity,
        })),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
      };
      const signature = JSON.stringify(payload);
      if (!idempotencyRef.current || idempotencyRef.current.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }

      const result = await invokeEdgeFunction<StorefrontOrder>("storefront", {
        ...payload,
        idempotency_key: idempotencyRef.current.key,
      });
      setOrderNumber(result.order_number);
      void queryClient.invalidateQueries({ queryKey: ["storefront-catalog"] });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setShippingAddress("");
      idempotencyRef.current = null;
    } catch (submitError) {
      setCheckoutError(
        submitError instanceof Error ? submitError.message : "Không thể gửi đơn hàng.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (orderNumber) {
    return (
      <main className="storefront-page">
        <section className="storefront-success">
          <div className="storefront-success-icon"><CheckCircle2 size={35} /></div>
          <p className="storefront-eyebrow">ĐẶT HÀNG THÀNH CÔNG</p>
          <h1>Cảm ơn bạn đã mua hàng!</h1>
          <p>Đơn hàng <strong>{orderNumber}</strong> đã được ghi nhận. Cửa hàng sẽ liên hệ để xác nhận giao hàng.</p>
          <button className="storefront-button storefront-button-primary" onClick={() => setOrderNumber("")}>
            Tiếp tục mua sắm <ArrowRight size={17} />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="storefront-page">
      <header className="storefront-header">
        <a className="storefront-brand" href="/shop" aria-label="Trang chủ cửa hàng">
          <span className="storefront-brand-mark"><ShoppingBag size={21} /></span>
          <span>{data?.storeName ?? "Cửa hàng"}<small>ONLINE STORE</small></span>
        </a>
        <a className="storefront-cart-link" href="#checkout" aria-label={`Giỏ hàng, ${cartQuantity} sản phẩm`}>
          <ShoppingCart size={19} /><span>Giỏ hàng</span>
          {cartQuantity > 0 && <b>{cartQuantity}</b>}
        </a>
      </header>

      <section className="storefront-hero">
        <div>
          <p className="storefront-eyebrow">MUA SẮM THẬT DỄ DÀNG</p>
          <h1>Sản phẩm được chọn,<br />giao tận nơi cho bạn.</h1>
          <p>Khám phá danh mục của {data?.storeName ?? "cửa hàng"} và đặt hàng chỉ trong vài bước.</p>
          <a className="storefront-button storefront-button-primary" href="#products">Khám phá sản phẩm <ArrowRight size={17} /></a>
        </div>
        <div className="storefront-hero-art" aria-hidden="true">
          <div className="storefront-hero-circle"><ShoppingBag size={74} strokeWidth={1.2} /></div>
          <span className="storefront-art-dot dot-one" />
          <span className="storefront-art-dot dot-two" />
        </div>
      </section>

      <section className="storefront-products-section" id="products">
        <div className="storefront-section-heading">
          <div>
            <p className="storefront-eyebrow">DANH MỤC CỬA HÀNG</p>
            <h2>Sản phẩm nổi bật</h2>
          </div>
          <label className="storefront-search">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
          </label>
        </div>

        {isLoading ? (
          <div className="storefront-state"><LoaderCircle className="spin" size={27} /><p>Đang tải sản phẩm...</p></div>
        ) : error ? (
          <div className="storefront-state storefront-state-error"><Package size={28} /><p>{error instanceof Error ? error.message : "Không tải được sản phẩm."}</p></div>
        ) : visibleItems.length === 0 ? (
          <div className="storefront-state"><Package size={28} /><p>Chưa có sản phẩm phù hợp.</p></div>
        ) : (
          <div className="storefront-product-grid">
            {visibleItems.map((item) => {
              const quantity = cart.find((line) => line.variantId === item.variantId)?.quantity ?? 0;
              return (
                <article className="storefront-product-card" key={item.variantId}>
                  <div className="storefront-product-art">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.productName} loading="lazy" />
                      : <Package size={39} strokeWidth={1.3} />}
                  </div>
                  <div className="storefront-product-copy">
                    <span className="storefront-product-variant">{item.variantName}</span>
                    <h3>{item.productName}</h3>
                    {item.description && <p>{item.description}</p>}
                    <div className="storefront-product-bottom">
                      <strong>{formatMoney(item.unitPrice)}</strong>
                      {item.available > 0 ? (
                        <button
                          className="storefront-add-button"
                          aria-label={`Thêm ${item.productName} vào giỏ`}
                          disabled={quantity >= Math.min(item.available, 99)}
                          onClick={() => addToCart(item)}
                        >
                          {quantity > 0 ? <><CheckCircle2 size={16} /> {quantity}</> : <><Plus size={17} /> Thêm</>}
                        </button>
                      ) : <span className="storefront-out-of-stock">Tạm hết hàng</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="storefront-checkout" id="checkout">
        <div className="storefront-checkout-info">
          <p className="storefront-eyebrow">HOÀN TẤT ĐƠN HÀNG</p>
          <h2>Giỏ hàng của bạn</h2>
          <p className="storefront-checkout-caption"><Truck size={16} /> Cửa hàng sẽ liên hệ xác nhận đơn và giao hàng.</p>
          {cartDetails.length === 0 ? (
            <div className="storefront-empty-cart"><ShoppingCart size={28} /><p>Giỏ hàng đang trống.</p><span>Thêm sản phẩm để tiếp tục đặt hàng.</span></div>
          ) : (
            <div className="storefront-cart-lines">
              {cartDetails.map((line) => (
                <div className="storefront-cart-line" key={line.variantId}>
                  <div className="storefront-cart-product"><strong>{line.productName}</strong><span>{formatMoney(line.unitPrice)} / sản phẩm</span></div>
                  <div className="storefront-quantity">
                    <button aria-label="Giảm số lượng" onClick={() => updateQuantity(line.variantId, -1)}><Minus size={13} /></button>
                    <span>{line.quantity}</span>
                    <button aria-label="Tăng số lượng" disabled={line.quantity >= Math.min(line.available, 99)} onClick={() => updateQuantity(line.variantId, 1)}><Plus size={13} /></button>
                  </div>
                  <strong className="storefront-line-total">{formatMoney(line.unitPrice * line.quantity)}</strong>
                  <button className="storefront-remove" aria-label={`Xóa ${line.productName}`} onClick={() => updateQuantity(line.variantId, -line.quantity)}><X size={15} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="storefront-total"><span>Tạm tính · {cartQuantity} sản phẩm</span><strong>{formatMoney(cartTotal)}</strong></div>
        </div>

        <form className="storefront-customer-form" onSubmit={(event) => void submitOrder(event)}>
          <p className="storefront-eyebrow">THÔNG TIN NHẬN HÀNG</p>
          <h2>Giao hàng cho bạn</h2>
          <label>Tên người nhận<input required maxLength={120} value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" placeholder="Nguyễn Văn A" /></label>
          <label>Số điện thoại<input required maxLength={32} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" placeholder="09xx xxx xxx" /></label>
          <label>Địa chỉ giao hàng<textarea required maxLength={500} rows={3} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /></label>
          {checkoutError && <p className="storefront-form-error" role="alert">{checkoutError}</p>}
          <button className="storefront-button storefront-button-primary storefront-submit" type="submit" disabled={!data || cartDetails.length === 0 || checkoutBusy}>
            {checkoutBusy ? <><LoaderCircle className="spin" size={17} /> Đang gửi đơn...</> : <>Đặt hàng · {formatMoney(cartTotal)} <ArrowRight size={17} /></>}
          </button>
          <p className="storefront-checkout-terms">Đặt hàng không yêu cầu thanh toán trước. Cửa hàng sẽ xác nhận lại thông tin.</p>
        </form>
      </section>

      <footer className="storefront-footer">
        <span>© {data?.storeName ?? "Cửa hàng"}</span>
        <span>Đặt hàng trực tuyến · Xác nhận nhanh chóng</span>
      </footer>
    </main>
  );
}
