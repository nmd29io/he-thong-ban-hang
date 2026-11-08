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
  | "variantId"
  | "productId"
  | "productName"
  | "description"
  | "imageUrl"
  | "category"
  | "brand"
  | "sku"
  | "variantName"
  | "unitPrice"
  | "unit"
  | "available"
>;
const EMPTY_CATALOG: StorefrontItem[] = [];
const CART_STORAGE_KEY = "storefront-cart-v1";

function readStoredCart(): CartLine[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((line): line is CartLine =>
      typeof line === "object" &&
      line !== null &&
      "variantId" in line &&
      typeof line.variantId === "string" &&
      "quantity" in line &&
      typeof line.quantity === "number" &&
      Number.isSafeInteger(line.quantity) &&
      line.quantity > 0 &&
      line.quantity <= 99,
    );
  } catch (storageError) {
    console.warn("Could not restore storefront cart:", storageError);
    return [];
  }
}

function productIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/shop\/product\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function StorefrontPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [sortOrder, setSortOrder] = useState("featured");
  const [cart, setCart] = useState<CartLine[]>(readStoredCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(() =>
    productIdFromPathname(window.location.pathname),
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!isCartOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCartOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isCartOpen]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["storefront-catalog"],
    queryFn: () => invokeEdgeFunction<StorefrontCatalog>("storefront", { action: "catalog" }),
    staleTime: 30_000,
  });

  const catalog = data?.items ?? EMPTY_CATALOG;
  const products = useMemo(() => {
    const grouped = new Map<string, StorefrontItem[]>();
    for (const item of catalog) {
      const variants = grouped.get(item.productId) ?? [];
      variants.push(item);
      grouped.set(item.productId, variants);
    }
    return [...grouped.values()];
  }, [catalog]);
  const categories = useMemo(
    () => [...new Set(products.map((variants) => variants[0]?.category?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "vi")),
    [products],
  );
  const brands = useMemo(
    () => [...new Set(products.map((variants) => variants[0]?.brand?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "vi")),
    [products],
  );
  const productVariants = products.find((variants) => variants[0]?.productId === selectedProductId) ?? [];
  const selectedProduct = productVariants[0];
  const selectedVariant = productVariants.find((item) => item.variantId === selectedVariantId)
    ?? productVariants.find((item) => item.available > 0)
    ?? productVariants[0];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = selectedProductId && selectedProduct
      ? `${selectedProduct.productName} | ${data?.storeName ?? "Cửa hàng"}`
      : data?.storeName
        ? `${data.storeName} | Cửa hàng trực tuyến`
        : "Cửa hàng trực tuyến";
    return () => {
      document.title = previousTitle;
    };
  }, [data?.storeName, selectedProduct, selectedProductId]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    const priceByProductId = new Map<string, number>();
    for (const variants of products) {
      if (variants[0]) {
        priceByProductId.set(variants[0].productId, Math.min(...variants.map((variant) => variant.unitPrice)));
      }
    }
    const filtered = products
      .map((variants) => variants[0])
      .filter((item) =>
      (!term ||
        item.productName.toLocaleLowerCase("vi").includes(term) ||
        item.variantName.toLocaleLowerCase("vi").includes(term) ||
        item.sku.toLocaleLowerCase("vi").includes(term) ||
        item.category?.toLocaleLowerCase("vi").includes(term) ||
        item.brand?.toLocaleLowerCase("vi").includes(term)) &&
      (activeCategory === "all" || item.category === activeCategory) &&
      (activeBrand === "all" || item.brand === activeBrand),
    );
    return filtered.sort((a, b) => {
      const priceA = priceByProductId.get(a.productId) ?? a.unitPrice;
      const priceB = priceByProductId.get(b.productId) ?? b.unitPrice;
      if (sortOrder === "price-low") return priceA - priceB || a.productName.localeCompare(b.productName, "vi");
      if (sortOrder === "price-high") return priceB - priceA || a.productName.localeCompare(b.productName, "vi");
      if (sortOrder === "name") return a.productName.localeCompare(b.productName, "vi");
      return 0;
    });
  }, [activeBrand, activeCategory, products, search, sortOrder]);

  function browseCategory(category: string) {
    setActiveCategory(category);
    setActiveBrand("all");
    setSelectedProductId(null);
    window.history.pushState(null, "", "/shop#products");
    window.requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }));
  }

  function openCart() {
    setIsCartOpen(true);
  }

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (storageError) {
      console.warn("Could not save storefront cart:", storageError);
    }
  }, [cart]);

  useEffect(() => {
    const syncProductRoute = () => {
      setSelectedProductId(productIdFromPathname(window.location.pathname));
      setSelectedVariantId("");
    };
    window.addEventListener("popstate", syncProductRoute);
    return () => window.removeEventListener("popstate", syncProductRoute);
  }, []);

  const cartDetails = cart.flatMap((line) => {
    const item = catalog.find((entry) => entry.variantId === line.variantId);
    return item ? [{ ...item, quantity: line.quantity }] : [];
  });
  const missingCartLines = data
    ? cart.filter((line) => !catalog.some((item) => item.variantId === line.variantId))
    : [];
  const unresolvedCartLines = data ? missingCartLines : cart;
  const cartHasInsufficientStock = cartDetails.some((line) => line.quantity > line.available);
  const cartTotal = cartDetails.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const availableCartQuantity = cartDetails.reduce((total, item) => total + item.quantity, 0);

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

  function navigateToProduct(productId: string) {
    window.history.pushState(null, "", `/shop/product/${encodeURIComponent(productId)}`);
    setSelectedProductId(productId);
    setSelectedVariantId("");
    window.scrollTo({ top: 0 });
  }

  function navigateToCatalog() {
    window.history.pushState(null, "", "/shop#products");
    setSelectedProductId(null);
    setSelectedVariantId("");
    window.scrollTo({ top: 0 });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !data ||
      cartDetails.length === 0 ||
      missingCartLines.length > 0 ||
      cartHasInsufficientStock ||
      checkoutBusy
    ) return;
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
      if (typeof result.order_number !== "string" || !result.order_number.trim()) {
        throw new Error("Máy chủ chưa trả về mã đơn hàng. Vui lòng kiểm tra lại trạng thái đơn.");
      }
      setOrderNumber(result.order_number.trim());
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
        <a className="storefront-brand" href="/shop#home" aria-label="Trang chủ cửa hàng">
          <span className="storefront-brand-mark"><ShoppingBag size={21} /></span>
          <span>{data?.storeName ?? "Cửa hàng"}<small>ONLINE STORE</small></span>
        </a>
        <nav className="storefront-nav" aria-label="Điều hướng cửa hàng">
          <a href="/shop#home">Trang chủ</a>
          <a href="/shop#categories">Danh mục</a>
          <a href="/shop#products">Sản phẩm</a>
          <button type="button" onClick={openCart}>Đặt hàng</button>
        </nav>
        <button
          className="storefront-cart-link"
          type="button"
          aria-label={`Giỏ hàng, ${cartQuantity} sản phẩm`}
          aria-haspopup="dialog"
          aria-expanded={isCartOpen}
          onClick={() => setIsCartOpen((open) => !open)}
        >
          <ShoppingCart size={19} /><span>Giỏ hàng</span>
          {cartQuantity > 0 && <b>{cartQuantity}</b>}
        </button>
      </header>

      {selectedProductId ? (
        selectedProduct ? (
          <section className="storefront-product-detail">
            <button className="storefront-back-link" type="button" onClick={navigateToCatalog}>
              <ArrowRight size={16} /> Quay lại danh sách sản phẩm
            </button>
            <div className="storefront-product-detail-card">
              <div className="storefront-product-detail-art">
                {selectedProduct.imageUrl
                  ? <img src={selectedProduct.imageUrl} alt={selectedProduct.productName} />
                  : <Package size={64} strokeWidth={1.2} />}
              </div>
              <div className="storefront-product-detail-copy">
                <p className="storefront-eyebrow">THÔNG TIN SẢN PHẨM</p>
                <h1>{selectedProduct.productName}</h1>
                <p className="storefront-product-description">
                  {selectedProduct.description?.trim() || "Cửa hàng chưa cập nhật mô tả cho sản phẩm này."}
                </p>
                <div className="storefront-detail-meta">
                  {selectedProduct.category && <span>Danh mục: {selectedProduct.category}</span>}
                  {selectedProduct.brand && <span>Thương hiệu: {selectedProduct.brand}</span>}
                </div>
                {productVariants.length > 1 && (
                  <label className="storefront-variant-picker">
                    Phân loại sản phẩm
                    <select
                      value={selectedVariant?.variantId ?? ""}
                      onChange={(event) => setSelectedVariantId(event.target.value)}
                    >
                      {productVariants.map((variant) => (
                        <option key={variant.variantId} value={variant.variantId} disabled={variant.available < 1}>
                          {variant.variantName} · {formatMoney(variant.unitPrice)}
                          {variant.available < 1 ? " · Hết hàng" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selectedVariant && (
                  <>
                    <div className="storefront-detail-meta">
                      <span>SKU: {selectedVariant.sku}</span>
                      <span>Đơn vị: {selectedVariant.unit}</span>
                      <span>{selectedVariant.available > 0 ? `Còn ${selectedVariant.available} ${selectedVariant.unit}` : "Tạm hết hàng"}</span>
                    </div>
                    <div className="storefront-detail-price">{formatMoney(selectedVariant.unitPrice)}</div>
                    <button
                      className="storefront-button storefront-button-primary"
                      type="button"
                      disabled={selectedVariant.available < 1}
                      onClick={() => addToCart(selectedVariant)}
                    >
                      <Plus size={17} /> Thêm vào giỏ hàng
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : isLoading ? (
          <div className="storefront-state"><LoaderCircle className="spin" size={27} /><p>Đang tải thông tin sản phẩm...</p></div>
        ) : error ? (
          <section className="storefront-state storefront-state-error">
            <Package size={28} />
            <p>{error instanceof Error ? error.message : "Không tải được thông tin sản phẩm."}</p>
            <button
              className="storefront-back-link"
              type="button"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["storefront-catalog"] })}
            >
              Thử tải lại
            </button>
          </section>
        ) : (
          <section className="storefront-state">
            <Package size={28} />
            <p>Không tìm thấy sản phẩm này.</p>
            <button className="storefront-back-link" type="button" onClick={navigateToCatalog}>Quay lại danh sách sản phẩm</button>
          </section>
        )
      ) : (
        <>
          <section className="storefront-hero" id="home">
            <div>
              <p className="storefront-eyebrow">THIẾT BỊ ĐIỆN · VẬT TƯ NƯỚC</p>
              <h1>Tìm đúng vật tư,<br />đặt hàng thật dễ dàng.</h1>
              <p>Tra cứu theo danh mục, thương hiệu hoặc mã sản phẩm. Cửa hàng sẽ liên hệ xác nhận đơn hàng.</p>
              <a className="storefront-button storefront-button-primary" href="#products">Khám phá sản phẩm <ArrowRight size={17} /></a>
            </div>
            <div className="storefront-hero-art" aria-hidden="true">
              <div className="storefront-hero-circle"><ShoppingBag size={74} strokeWidth={1.2} /></div>
              <span className="storefront-art-dot dot-one" />
              <span className="storefront-art-dot dot-two" />
            </div>
          </section>

          {categories.length > 0 && (
            <section className="storefront-category-section" id="categories">
              <div className="storefront-category-heading">
                <div>
                  <p className="storefront-eyebrow">MUA SẮM THEO NHÓM HÀNG</p>
                  <h2>Danh mục sản phẩm</h2>
                </div>
                <button className="storefront-category-all" type="button" onClick={() => browseCategory("all")}>
                  Xem tất cả <ArrowRight size={15} />
                </button>
              </div>
              <div className="storefront-category-grid">
                {categories.map((category) => {
                  const count = products.filter((variants) => variants[0]?.category === category).length;
                  return (
                    <button className="storefront-category-card" type="button" key={category} onClick={() => browseCategory(category)}>
                      <span className="storefront-category-icon"><Package size={20} /></span>
                      <span><strong>{category}</strong><small>{count} sản phẩm</small></span>
                      <ArrowRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="storefront-products-section" id="products">
            <div className="storefront-section-heading">
              <div>
                <p className="storefront-eyebrow">DANH MỤC CỬA HÀNG</p>
                <h2>Sản phẩm {activeCategory !== "all" ? `· ${activeCategory}` : "nổi bật"}</h2>
              </div>
              <label className="storefront-search">
                <Search size={17} />
                <input aria-label="Tìm theo tên, thương hiệu hoặc mã SKU" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, thương hiệu, mã SKU..." />
              </label>
            </div>

            <div className="storefront-filter-toolbar">
              <label className="storefront-filter-select">
                <span>Thương hiệu</span>
                <select aria-label="Lọc theo thương hiệu" value={activeBrand} onChange={(event) => setActiveBrand(event.target.value)}>
                  <option value="all">Tất cả</option>
                  {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </label>
              <label className="storefront-filter-select">
                <span>Sắp xếp</span>
                <select aria-label="Sắp xếp sản phẩm" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                  <option value="featured">Mặc định</option>
                  <option value="price-low">Giá: thấp đến cao</option>
                  <option value="price-high">Giá: cao đến thấp</option>
                  <option value="name">Tên sản phẩm A–Z</option>
                </select>
              </label>
              <span className="storefront-result-count">{visibleItems.length} sản phẩm</span>
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
              const variants = products.find((group) => group[0]?.productId === item.productId) ?? [item];
              const quantity = cart
                .filter((line) => variants.some((variant) => variant.variantId === line.variantId))
                .reduce((total, line) => total + line.quantity, 0);
              const startingPrice = Math.min(...variants.map((variant) => variant.unitPrice));
              const purchasableVariant = variants.find((variant) => variant.available > 0);
              return (
                <article className="storefront-product-card" key={item.variantId}>
                  <a
                    className="storefront-product-card-link"
                    href={`/shop/product/${encodeURIComponent(item.productId)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToProduct(item.productId);
                    }}
                  >
                    <div className="storefront-product-art">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} loading="lazy" />
                        : <Package size={39} strokeWidth={1.3} />}
                    </div>
                    <div className="storefront-product-copy">
                      <span className="storefront-product-variant">{item.variantName}</span>
                      <h3>{item.productName}</h3>
                      {item.description && <p>{item.description}</p>}
                      {(item.category || item.brand) && (
                        <span className="storefront-product-category">
                          {[item.category, item.brand].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </a>
                  <div className="storefront-product-bottom">
                    <span>
                      <strong>{variants.length > 1 ? `Từ ${formatMoney(startingPrice)}` : formatMoney(item.unitPrice)}</strong>
                      <small className={purchasableVariant ? "storefront-stock-available" : "storefront-stock-empty"}>
                        {purchasableVariant ? `Còn ${purchasableVariant.available} ${purchasableVariant.unit}` : "Tạm hết hàng"}
                      </small>
                    </span>
                    <button
                      className="storefront-add-button"
                      type="button"
                      disabled={!purchasableVariant}
                      onClick={() => variants.length > 1
                        ? navigateToProduct(item.productId)
                        : purchasableVariant && addToCart(purchasableVariant)}
                    >
                      {purchasableVariant
                        ? variants.length > 1 ? <>Chọn loại <ArrowRight size={13} /></> : <><Plus size={14} /> Thêm</>
                        : "Hết hàng"}
                    </button>
                  </div>
                  {quantity > 0 && <span className="storefront-product-in-cart"><CheckCircle2 size={14} /> {quantity} trong giỏ</span>}
                </article>
              );
            })}
          </div>
        )}
          </section>
        </>
      )}

      {isCartOpen && (
        <div className="storefront-cart-overlay" onClick={() => setIsCartOpen(false)}>
          <section
            className="storefront-checkout"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storefront-cart-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="storefront-cart-close"
              type="button"
              aria-label="Đóng giỏ hàng"
              onClick={() => setIsCartOpen(false)}
            >
              <X size={19} />
            </button>
            <div className="storefront-checkout-info">
              <p className="storefront-eyebrow">HOÀN TẤT ĐƠN HÀNG</p>
              <h2 id="storefront-cart-title">Giỏ hàng của bạn</h2>
              <p className="storefront-checkout-caption"><Truck size={16} /> Cửa hàng sẽ liên hệ xác nhận đơn và giao hàng.</p>
              {!data && cart.length > 0 && (
                <p className="storefront-form-error" role="status">
                  {error
                    ? "Không thể xác minh sản phẩm trong giỏ. Hãy thử tải lại danh mục trước khi đặt hàng."
                    : "Đang kiểm tra sản phẩm trong giỏ hàng..."}
                </p>
              )}
              {missingCartLines.length > 0 && (
                <p className="storefront-form-error" role="alert">
                  Có sản phẩm không còn trong danh mục. Hãy xóa sản phẩm đó khỏi giỏ trước khi đặt hàng.
                </p>
              )}
              {cartHasInsufficientStock && (
                <p className="storefront-form-error" role="alert">
                  Số lượng trong giỏ vượt quá tồn kho hiện tại. Hãy điều chỉnh số lượng để tiếp tục.
                </p>
              )}
              {cart.length === 0 ? (
                <div className="storefront-empty-cart"><ShoppingCart size={28} /><p>Giỏ hàng đang trống.</p><span>Thêm sản phẩm để tiếp tục đặt hàng.</span></div>
              ) : (
                <div className="storefront-cart-lines">
                  {cartDetails.map((line) => (
                    <div className="storefront-cart-line" key={line.variantId}>
                      <div className="storefront-cart-product"><strong>{line.productName}</strong><span>{formatMoney(line.unitPrice)} / {line.unit}</span></div>
                      <div className="storefront-quantity">
                        <button aria-label="Giảm số lượng" onClick={() => updateQuantity(line.variantId, -1)}><Minus size={13} /></button>
                        <span>{line.quantity}</span>
                        <button aria-label="Tăng số lượng" disabled={line.quantity >= Math.min(line.available, 99)} onClick={() => updateQuantity(line.variantId, 1)}><Plus size={13} /></button>
                      </div>
                      <strong className="storefront-line-total">{formatMoney(line.unitPrice * line.quantity)}</strong>
                      <button className="storefront-remove" aria-label={`Xóa ${line.productName}`} onClick={() => updateQuantity(line.variantId, -line.quantity)}><X size={15} /></button>
                    </div>
                  ))}
                  {unresolvedCartLines.map((line) => (
                    <div className="storefront-cart-line" key={line.variantId}>
                      <div className="storefront-cart-product">
                        <strong>{data ? "Sản phẩm không còn khả dụng" : "Đang kiểm tra sản phẩm"}</strong>
                        <span>{data ? "Vui lòng xóa khỏi giỏ hàng" : "Chưa thể xác minh tồn kho"}</span>
                      </div>
                      <span>{line.quantity}</span>
                      <button
                        className="storefront-remove"
                        type="button"
                        aria-label="Xóa sản phẩm không còn khả dụng"
                        onClick={() => updateQuantity(line.variantId, -line.quantity)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="storefront-total"><span>Tạm tính · {availableCartQuantity} sản phẩm</span><strong>{formatMoney(cartTotal)}</strong></div>
            </div>

            <form className="storefront-customer-form" onSubmit={(event) => void submitOrder(event)}>
              <p className="storefront-eyebrow">THÔNG TIN NHẬN HÀNG</p>
              <h2>Giao hàng cho bạn</h2>
              <label>Tên người nhận<input required maxLength={120} value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" placeholder="Nguyễn Văn A" /></label>
              <label>Số điện thoại<input required type="tel" inputMode="tel" maxLength={32} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" placeholder="09xx xxx xxx" /></label>
              <label>Địa chỉ giao hàng<textarea required maxLength={500} rows={3} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /></label>
              {checkoutError && <p className="storefront-form-error" role="alert">{checkoutError}</p>}
              <button
                className="storefront-button storefront-button-primary storefront-submit"
                type="submit"
                disabled={
                  !data ||
                  cartDetails.length === 0 ||
                  missingCartLines.length > 0 ||
                  cartHasInsufficientStock ||
                  checkoutBusy
                }
              >
                {checkoutBusy ? <><LoaderCircle className="spin" size={17} /> Đang gửi đơn...</> : <>Đặt hàng · {formatMoney(cartTotal)} <ArrowRight size={17} /></>}
              </button>
              <p className="storefront-checkout-terms">Đặt hàng không yêu cầu thanh toán trước. Cửa hàng sẽ xác nhận lại thông tin.</p>
            </form>
          </section>
        </div>
      )}

      <footer className="storefront-footer">
        <span>© {data?.storeName ?? "Cửa hàng"}</span>
        <span>Đặt hàng trực tuyến · Xác nhận nhanh chóng</span>
      </footer>
    </main>
  );
}
