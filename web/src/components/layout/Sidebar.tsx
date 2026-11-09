import {
  Store,
  ShoppingCart,
  ClipboardList,
  Package,
  Boxes,
  Users,
  BarChart3,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Role, Screen, StoreOption, WarehouseOption } from "../../lib/types";
import { roleNames, type Permission } from "../../lib/permissions";

type MenuItem = { id: Screen; label: string; icon: ReactNode; visible: boolean };

type SidebarProps = {
  currentRole: Role;
  permissions: Permission[];
  screen: Screen;
  setScreen: (screen: Screen) => void;
  clearMessages: () => void;
  orders: { length: number };
  activeStore: StoreOption | undefined;
  warehouses: WarehouseOption[];
  selectedWarehouseId: string;
  hasStoreAccess: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({
  currentRole,
  permissions,
  screen,
  setScreen,
  clearMessages,
  orders,
  activeStore,
  warehouses,
  selectedWarehouseId,
  hasStoreAccess,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const can = (permission: Permission) => currentRole === "owner" || permissions.includes(permission);
  const canSell = can("sales.create");
  const canReadOrders =
    can("orders.read") ||
    can("orders.manage") ||
    can("payments.read") ||
    can("payments.manage") ||
    canSell;
  const canReadProducts = can("products.read") || can("products.manage");
  const canManageStock = can("inventory.manage");
  const canReadStock = can("inventory.read") || canManageStock;
  const canReadCustomers = can("customers.read") || can("customers.manage") || canSell;
  const canViewReports = can("reports.read");

  const menu: MenuItem[] = [
    { id: "pos", label: "Bán tại quầy", icon: <ShoppingCart size={18} />, visible: canSell },
    { id: "orders", label: "Đơn hàng", icon: <ClipboardList size={18} />, visible: canReadOrders },
    { id: "products", label: "Sản phẩm & SKU", icon: <Package size={18} />, visible: canReadProducts },
    { id: "inventory", label: "Tồn kho", icon: <Boxes size={18} />, visible: canReadStock },
    { id: "customers", label: "Khách hàng", icon: <Users size={18} />, visible: canReadCustomers },
    { id: "reports", label: "Báo cáo", icon: <BarChart3 size={18} />, visible: canViewReports },
    { id: "access", label: "Phân quyền", icon: <ShieldCheck size={18} />, visible: can("members.manage") },
    { id: "shop", label: "Shop", icon: <ShoppingBag size={18} />, visible: !hasStoreAccess },
    { id: "profile", label: "Hồ sơ cá nhân", icon: <UserRound size={18} />, visible: true },
  ];
  const visibleMenu = menu.filter((item) =>
    item.visible && (hasStoreAccess || item.id === "shop" || item.id === "profile"),
  );

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Store size={22} /></div>
        <div>
          <strong>Hệ thống bán hàng</strong>
          <span>{activeStore ? roleNames[currentRole] : "TÀI KHOẢN CÁ NHÂN"}</span>
        </div>
        <button
          aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          aria-expanded={!collapsed}
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <div className="side-label">CỬA HÀNG</div>
      {visibleMenu.map((item) => (
        <button
          className={`nav-item ${screen === item.id ? "active" : ""}`}
          key={item.id}
          title={collapsed ? item.label : undefined}
          onClick={() => {
            clearMessages();
            setScreen(item.id);
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.id === "orders" && <span className="nav-count">{orders.length}</span>}
        </button>
      ))}
      <div className="sidebar-bottom">
        <div className="connection-dot" />
        <div>
          <strong>{activeStore?.name ?? "Chưa được cấp quyền"}</strong>
          <span>{activeStore
            ? warehouses.find((item) => item.id === selectedWarehouseId)?.name ?? "Chưa chọn kho"
            : "Shop và hồ sơ cá nhân"}
          </span>
        </div>
      </div>
    </aside>
  );
}
