import { Store, ShoppingCart, ClipboardList, Package, Boxes, Users, BarChart3, ShieldCheck, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import type { Role, Screen, StoreOption, WarehouseOption } from "../../lib/types";
import { roleNames } from "../../lib/types";

type MenuItem = { id: Screen; label: string; icon: ReactNode; visible: boolean };

type SidebarProps = {
  currentRole: Role;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  clearMessages: () => void;
  orders: { length: number };
  activeStore: StoreOption | undefined;
  warehouses: WarehouseOption[];
  selectedWarehouseId: string;
};

export function Sidebar({
  currentRole,
  screen,
  setScreen,
  clearMessages,
  orders,
  activeStore,
  warehouses,
  selectedWarehouseId,
}: SidebarProps) {
  const canSell = ["owner", "manager", "cashier"].includes(currentRole);
  const canManage = ["owner", "manager"].includes(currentRole);
  const canManageStock = ["owner", "manager", "stock_clerk"].includes(currentRole);
  const canViewReports = ["owner", "manager", "accountant"].includes(currentRole);

  const menu: MenuItem[] = [
    { id: "pos", label: "Bán tại quầy", icon: <ShoppingCart size={18} />, visible: canSell },
    { id: "orders", label: "Đơn hàng", icon: <ClipboardList size={18} />, visible: canSell },
    { id: "products", label: "Sản phẩm & SKU", icon: <Package size={18} />, visible: canManage },
    { id: "inventory", label: "Tồn kho", icon: <Boxes size={18} />, visible: canManageStock },
    { id: "customers", label: "Khách hàng", icon: <Users size={18} />, visible: canSell },
    { id: "reports", label: "Báo cáo", icon: <BarChart3 size={18} />, visible: canViewReports },
    { id: "access", label: "Phân quyền", icon: <ShieldCheck size={18} />, visible: currentRole === "owner" },
  ];
  const visibleMenu = menu.filter((item) => item.visible);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Store size={22} /></div>
        <div>
          <strong>Hệ thống bán hàng</strong>
          <span>{roleNames[currentRole]}</span>
        </div>
      </div>
      <div className="side-label">CỬA HÀNG</div>
      {visibleMenu.map((item) => (
        <button
          className={`nav-item ${screen === item.id ? "active" : ""}`}
          key={item.id}
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
          <strong>{activeStore?.name ?? "Đang kết nối"}</strong>
          <span>{warehouses.find((item) => item.id === selectedWarehouseId)?.name ?? "Chưa chọn kho"}</span>
        </div>
      </div>
    </aside>
  );
}

