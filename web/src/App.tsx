import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Permission, Role, Screen } from "./lib/types";
import { useAuth } from "./hooks/useAuth";
import { useStoreAccess } from "./hooks/useStoreAccess";
import { useStoreData } from "./hooks/useStoreData";
import { useCatalog } from "./hooks/useCatalog";
import { useCart } from "./hooks/useCart";
import { useInventory } from "./hooks/useInventory";
import { useOrder } from "./hooks/useOrder";
import { useCatalogManagement } from "./hooks/useCatalogManagement";
import { useCustomer } from "./hooks/useCustomer";
import { useAccess } from "./hooks/useAccess";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { LoginPage } from "./components/auth/LoginPage";
import { PosView } from "./components/views/PosView";
import { OrdersView } from "./components/views/OrdersView";
import { ProductsView } from "./components/views/ProductsView";
import { InventoryView } from "./components/views/InventoryView";
import { CustomersView } from "./components/views/CustomersView";
import { ReportsView } from "./components/views/ReportsView";
import { AccessView } from "./components/views/AccessView";
import { StorefrontPage } from "./components/storefront/StorefrontPage";
import type { Notice } from "./lib/types";
import { permissionKeys, rolePermissionPresets } from "./lib/permissions";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function isPermission(value: string): value is Permission {
  return permissionKeys.some((permission) => permission === value);
}

function AppShell() {
  const {
    user,
    authReady,
    authBusy,
    authError,
    signInWithPhone,
    signInWithEmail,
    signUpWithPhone,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const {
    stores,
    selectedStoreId,
    setSelectedStoreId,
    warehouses,
    selectedWarehouseId,
    setSelectedWarehouseId,
    memberships,
    accessLoading,
    accessError,
    refreshAccess,
  } = useStoreAccess(user?.id ?? null);

  const [screen, setScreen] = useState<Screen>("pos");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState("");

  const operationKeysRef = useRef(new Map<string, string>());
  function getOperationKey(signature: string) {
    const current = operationKeysRef.current.get(signature);
    if (current) return current;
    const key = crypto.randomUUID();
    operationKeysRef.current.set(signature, key);
    return key;
  }
  function deleteOperationKey(signature: string) {
    operationKeysRef.current.delete(signature);
  }

  const activeMembership = memberships.find(
    (m) => m.is_active && m.user_id === user?.id && m.store_id === selectedStoreId,
  );
  const currentRole = (activeMembership?.role ?? "cashier") as Role;
  const currentPermissions: Permission[] = currentRole === "owner"
    ? [...permissionKeys]
    : activeMembership?.permissions.filter(isPermission) ?? rolePermissionPresets[currentRole];
  const hasPermission = (permission: Permission) =>
    currentRole === "owner" || currentPermissions.includes(permission);
  const canSell = hasPermission("sales.create");
  const canReadOrders =
    hasPermission("orders.read") ||
    hasPermission("orders.manage") ||
    hasPermission("payments.read") ||
    hasPermission("payments.manage") ||
    canSell;
  const canManageOrders = hasPermission("orders.manage");
  const canViewPayments = hasPermission("payments.read") || hasPermission("payments.manage");
  const canManagePayments = hasPermission("payments.manage");
  const canManageProducts = hasPermission("products.manage");
  const canReadProducts = hasPermission("products.read") || canManageProducts;
  const canManageStock = hasPermission("inventory.manage");
  const canReadStock = hasPermission("inventory.read") || canManageStock;
  const canReadCustomers = hasPermission("customers.read") || hasPermission("customers.manage") || canSell;
  const canManageCustomers = hasPermission("customers.manage");
  const canViewReports = hasPermission("reports.read");
  const canManageMembers = hasPermission("members.manage");
  const storeData = useStoreData(
    user?.id ?? null,
    selectedStoreId,
    selectedWarehouseId,
    currentPermissions,
  );

  // Build catalog before cart (cart needs catalog; recommendations need cart)
  const { catalog, lowStockCount } = useCatalog(
    storeData.products,
    storeData.variants,
    storeData.balances,
    storeData.recommendations,
    [], // placeholder – recommendations computed after cart
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return catalog.filter(
      (item) =>
        item.isActive &&
        (!term ||
          item.productName.toLocaleLowerCase("vi").includes(term) ||
          item.sku.toLocaleLowerCase("vi").includes(term) ||
          item.variantName.toLocaleLowerCase("vi").includes(term)),
    );
  }, [catalog, search]);

  const cartHook = useCart(
    catalog,
    storeData.payments,
    selectedStoreId,
    selectedWarehouseId,
    user?.id ?? null,
    storeData.invalidateData,
    setNotice,
    setError,
  );

  // Compute recommendations after cart so we can exclude in-cart items
  const recommended = useMemo(() => {
    const inCart = new Set(cartHook.cart.map((l) => l.variantId));
    const base = storeData.recommendations
      .map((r) => catalog.find((item) => item.variantId === r.variant_id))
      .filter((item): item is typeof catalog[number] => Boolean(item?.isActive && item.available > 0))
      .filter((item) => !inCart.has(item.variantId))
      .slice(0, 4);
    return base.length > 0
      ? base
      : catalog.filter((item) => item.isActive && item.available > 0 && !inCart.has(item.variantId)).slice(0, 4);
  }, [catalog, cartHook.cart, storeData.recommendations]);

  const customerById = useMemo(
    () => new Map(storeData.customers.map((c) => [c.id, c.name])),
    [storeData.customers],
  );

  const inventoryHook = useInventory(
    catalog,
    selectedStoreId,
    selectedWarehouseId,
    storeData.invalidateData,
    setNotice,
    setError,
  );

  const orderHook = useOrder(
    selectedStoreId,
    canSell,
    storeData.invalidateData,
    setNotice,
    setError,
    getOperationKey,
    deleteOperationKey,
  );

  const catalogMgmt = useCatalogManagement(
    storeData.products,
    storeData.variants,
    storeData.invalidateData,
    setNotice,
    setError,
  );

  const customerHook = useCustomer(selectedStoreId, storeData.invalidateData, setNotice, setError);
  const accessHook = useAccess(
    selectedStoreId,
    user?.id ?? "",
    canManageMembers,
    () => {
      storeData.invalidateData();
      if (user?.id) void refreshAccess(user.id);
    },
    setNotice,
    setError,
  );

  const activeStore = stores.find((s) => s.id === selectedStoreId);

  const menu = [
    { id: "pos" as Screen, visible: canSell },
    { id: "orders" as Screen, visible: canReadOrders },
    { id: "products" as Screen, visible: canReadProducts },
    { id: "inventory" as Screen, visible: canReadStock },
    { id: "customers" as Screen, visible: canReadCustomers },
    { id: "reports" as Screen, visible: canViewReports },
    { id: "access" as Screen, visible: canManageMembers },
  ];
  const visibleScreens = menu.filter((m) => m.visible).map((m) => m.id);
  const activeScreen = visibleScreens.includes(screen) ? screen : (visibleScreens[0] ?? "pos");

  function clearMessages() {
    setError("");
    setNotice(null);
  }

  // ── Auth gates ────────────────────────────────────────────────
  if (!authReady) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <LoaderCircle className="spin" size={28} />
          <h1>Hệ thống bán hàng</h1>
          <p>Đang kiểm tra phiên đăng nhập...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginPage
        authError={authError}
        authBusy={authBusy}
        onSignInWithPhone={signInWithPhone}
        onSignInWithEmail={signInWithEmail}
        onSignUpWithPhone={signUpWithPhone}
        onSendPhoneOtp={sendPhoneOtp}
        onVerifyPhoneOtp={verifyPhoneOtp}
        onSignInWithGoogle={signInWithGoogle}
      />
    );
  }

  if (accessLoading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <LoaderCircle className="spin" size={28} />
          <h1>Đang tải cửa hàng</h1>
        </section>
      </main>
    );
  }

  if (stores.length === 0) {
    return (
      <main className="auth-page">
        <section className="auth-card onboarding-card">
          <ShieldCheck size={30} />
          <h1>Chưa được cấp quyền cửa hàng</h1>
          <p>
            Đăng ký hoặc đăng nhập trước, sau đó nhờ chủ cửa hàng thêm email hoặc số điện thoại của bạn vào cửa hàng.
          </p>
          {accessError && <div className="error-banner" role="alert">{accessError}</div>}
          <button className="button button-secondary" onClick={() => void refreshAccess(user.id)}>
            <RefreshCw size={16} /> Kiểm tra lại
          </button>
          <button className="text-button" onClick={() => void signOut()}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </section>
      </main>
    );
  }

  // ── Main shell ────────────────────────────────────────────────
  return (
    <main className="app-shell">
      <Sidebar
        currentRole={currentRole}
        permissions={currentPermissions}
        screen={activeScreen}
        setScreen={setScreen}
        clearMessages={clearMessages}
        orders={storeData.orders}
        activeStore={activeStore}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
      />

      <section className="main-area">
        <TopBar
          activeScreen={activeScreen}
          currentRole={currentRole}
          activeStore={activeStore}
          stores={stores}
          selectedStoreId={selectedStoreId}
          setSelectedStoreId={setSelectedStoreId}
          setSelectedWarehouseId={setSelectedWarehouseId}
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          userEmail={user.email || user.phone}
          loading={storeData.loading}
          onRefresh={() => {
            if (user?.id) void refreshAccess(user.id);
            storeData.refetch();
          }}
          onSignOut={() => void signOut()}
        />

        {/* Global error/notice banners */}
        {(error || storeData.error) && (
          <div className="error-banner" role="alert">
            <AlertCircle size={19} />
            <div>
              <strong>Không thể hoàn tất thao tác</strong>
              <p>{error || storeData.error}</p>
            </div>
            <button className="text-button" onClick={() => { setError(""); }}>Đóng</button>
          </div>
        )}
        {notice && (
          <div className={notice.kind === "success" ? "success-banner" : "error-banner"} role="status">
            {notice.kind === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
            <p>{notice.text}</p>
          </div>
        )}
        {warehouses.length === 0 && (
          <div className="error-banner" role="status">
            <Warehouse size={19} />
            <div>
              <strong>Chưa có kho hoạt động</strong>
              <p>Hãy tạo kho cho cửa hàng trong Supabase trước khi bán hàng hoặc quản lý tồn.</p>
            </div>
          </div>
        )}

        {/* Screen routing */}
        {activeScreen === "pos" && (
          <PosView
            catalog={catalog}
            filteredCatalog={filteredCatalog}
            search={search}
            setSearch={setSearch}
            loading={storeData.loading}
            cart={cartHook.cart}
            cartDetails={cartHook.cartDetails}
            cartTotal={cartHook.cartTotal}
            cartQuantity={cartHook.cartQuantity}
            selectedCustomerId={cartHook.selectedCustomerId}
            setSelectedCustomerId={cartHook.setSelectedCustomerId}
            initialPaidAmount={cartHook.initialPaidAmount}
            setInitialPaidAmount={cartHook.setInitialPaidAmount}
            initialPaymentMethod={cartHook.initialPaymentMethod}
            setInitialPaymentMethod={cartHook.setInitialPaymentMethod}
            creatingOrder={cartHook.creatingOrder}
            customers={storeData.customers}
            canSell={canSell}
            selectedWarehouseId={selectedWarehouseId}
            orders={storeData.orders}
            lowStockCount={lowStockCount}
            recommendations={recommended}
            addToCart={cartHook.addToCart}
            changeQuantity={cartHook.changeQuantity}
            clearCart={cartHook.clearCart}
            removeFromCart={cartHook.removeFromCart}
            handleCreateOrder={() => void cartHook.handleCreateOrder()}
          />
        )}

        {activeScreen === "orders" && (
          <OrdersView
            orders={storeData.orders}
            customers={storeData.customers}
            payments={storeData.payments}
            paymentsByOrder={cartHook.paymentsByOrder}
            customerById={customerById}
            loading={storeData.loading}
            canManageOrders={canManageOrders}
            canManagePayments={canManagePayments}
            canViewPayments={canViewPayments}
            paymentOrderId={orderHook.paymentOrderId}
            setPaymentOrderId={orderHook.setPaymentOrderId}
            paymentAmount={orderHook.paymentAmount}
            setPaymentAmount={orderHook.setPaymentAmount}
            paymentMethod={orderHook.paymentMethod}
            setPaymentMethod={orderHook.setPaymentMethod}
            handleRecordPayment={(e) => void orderHook.handleRecordPayment(e)}
            completeOrder={(o) => void orderHook.completeOrder(o)}
            cancelOrder={(o) => void orderHook.cancelOrder(o)}
            setError={setError}
          />
        )}

        {activeScreen === "products" && (
          <ProductsView
            catalog={catalog}
            products={storeData.products}
            loading={storeData.loading}
            canManageProducts={canManageProducts}
            createProductForm={catalogMgmt.createProductForm}
            addVariantForm={catalogMgmt.addVariantForm}
            editingVariantId={catalogMgmt.editingVariantId}
            setEditingVariantId={catalogMgmt.setEditingVariantId}
            editingPrice={catalogMgmt.editingPrice}
            setEditingPrice={catalogMgmt.setEditingPrice}
            imageBusyProductId={catalogMgmt.imageBusyProductId}
            handleCreateProduct={(d) => void catalogMgmt.handleCreateProduct(d)}
            handleAddVariant={(d) => void catalogMgmt.handleAddVariant(d)}
            handleUpdatePrice={(e, id) => void catalogMgmt.handleUpdatePrice(e, id)}
            handleUploadProductImage={(id, image) => void catalogMgmt.handleUploadProductImage(id, image)}
            toggleProduct={(item) => void catalogMgmt.toggleProduct(item)}
          />
        )}

        {activeScreen === "inventory" && (
          <InventoryView
            catalog={catalog}
            ledger={storeData.ledger}
            loading={storeData.loading}
            canManageStock={canManageStock}
            selectedWarehouseId={selectedWarehouseId}
            lowStockCount={lowStockCount}
            stockVariantId={inventoryHook.stockVariantId}
            setStockVariantId={inventoryHook.setStockVariantId}
            stockMovementType={inventoryHook.stockMovementType}
            setStockMovementType={inventoryHook.setStockMovementType}
            stockQuantity={inventoryHook.stockQuantity}
            setStockQuantity={inventoryHook.setStockQuantity}
            stockNote={inventoryHook.stockNote}
            setStockNote={inventoryHook.setStockNote}
            handleInventoryMovement={(e) => void inventoryHook.handleInventoryMovement(e)}
            bulkReceiptMode={inventoryHook.bulkReceiptMode}
            setBulkReceiptMode={inventoryHook.setBulkReceiptMode}
            bulkReceiptRows={inventoryHook.bulkReceiptRows}
            setBulkReceiptRows={inventoryHook.setBulkReceiptRows}
            bulkReceiptNote={inventoryHook.bulkReceiptNote}
            setBulkReceiptNote={inventoryHook.setBulkReceiptNote}
            bulkReceiptFileName={inventoryHook.bulkReceiptFileName}
            bulkReceiptBusy={inventoryHook.bulkReceiptBusy}
            bulkReceiptFileRef={inventoryHook.bulkReceiptFileRef}
            handleBulkCsvChange={(e) => void inventoryHook.handleBulkCsvChange(e)}
            downloadBulkCsvTemplate={inventoryHook.downloadBulkCsvTemplate}
            addBulkReceiptLine={inventoryHook.addBulkReceiptLine}
            updateBulkReceiptLine={inventoryHook.updateBulkReceiptLine}
            handleBulkReceiptSubmit={() => void inventoryHook.handleBulkReceiptSubmit()}
            getBulkReceiptLine={inventoryHook.getBulkReceiptLine}
          />
        )}

        {activeScreen === "customers" && (
          <CustomersView
            customers={storeData.customers}
            orders={storeData.orders}
            loading={storeData.loading}
            form={customerHook.form}
            canManageCustomers={canManageCustomers}
            canReadOrders={canReadOrders}
            handleCreateCustomer={(d) => void customerHook.handleCreateCustomer(d)}
          />
        )}

        {activeScreen === "reports" && (
          <ReportsView
            report={storeData.report}
            loading={storeData.loading}
            reportFrom={storeData.reportFrom}
            reportUntil={storeData.reportUntil}
            setReportFrom={storeData.setReportFrom}
            setReportUntil={storeData.setReportUntil}
            onRefresh={storeData.refetch}
          />
        )}

        {activeScreen === "access" && canManageMembers && (
          <AccessView
            members={accessHook.members}
            loading={accessHook.loading}
            loadError={accessHook.error}
            form={accessHook.form}
            handleMembership={(d) => void accessHook.handleMembership(d)}
          />
        )}

        <footer className="page-footer">
          <span><CheckCircle2 size={15} /> Quyền và tồn kho được xác thực phía máy chủ</span>
          <span>{storeData.lastUpdated ? `Cập nhật ${storeData.lastUpdated.toLocaleTimeString("vi-VN")}` : "Đang đồng bộ"}</span>
        </footer>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {window.location.pathname === "/shop" || window.location.pathname.startsWith("/shop/")
        ? <StorefrontPage />
        : <AppShell />}
    </QueryClientProvider>
  );
}
