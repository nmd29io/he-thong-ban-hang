import { LogOut, RefreshCw, LoaderCircle } from "lucide-react";
import type { Role, Screen, StoreOption, WarehouseOption } from "../../lib/types";
import { roleNames } from "../../lib/types";

const screenTitles: Record<Screen, string> = {
  pos: "Bán tại quầy",
  orders: "Đơn hàng",
  products: "Sản phẩm & SKU",
  inventory: "Tồn kho",
  customers: "Khách hàng",
  reports: "Báo cáo",
  access: "Phân quyền",
};

type TopBarProps = {
  activeScreen: Screen;
  currentRole: Role;
  activeStore: StoreOption | undefined;
  stores: StoreOption[];
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  setSelectedWarehouseId: (id: string) => void;
  warehouses: WarehouseOption[];
  selectedWarehouseId: string;
  userEmail: string;
  loading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
};

export function TopBar({
  activeScreen,
  currentRole,
  activeStore,
  stores,
  selectedStoreId,
  setSelectedStoreId,
  setSelectedWarehouseId,
  warehouses,
  selectedWarehouseId,
  userEmail,
  loading,
  onRefresh,
  onSignOut,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{activeStore?.code ?? "CỬA HÀNG"} / {roleNames[currentRole]}</div>
        <h1>{screenTitles[activeScreen]}</h1>
      </div>
      <div className="topbar-actions">
        {stores.length > 1 && (
          <select
            aria-label="Chọn cửa hàng"
            value={selectedStoreId}
            onChange={(event) => {
              setSelectedStoreId(event.target.value);
              setSelectedWarehouseId("");
            }}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        )}
        {warehouses.length > 1 && (
          <select
            aria-label="Chọn kho"
            value={selectedWarehouseId}
            onChange={(event) => setSelectedWarehouseId(event.target.value)}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
        )}
        <span className="user-email">{userEmail}</span>
        <button className="button button-secondary" onClick={onRefresh} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
          Làm mới
        </button>
        <button className="button button-secondary" onClick={onSignOut}>
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </header>
  );
}

