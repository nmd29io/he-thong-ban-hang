import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { AuthUser } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { orderStatusNames } from "../../lib/types";
import { formatMoney } from "../../lib/utils";
import { FormField } from "../FormField";

type ProfileSection = "overview" | "orders" | "profile" | "settings";

type ProfilePageProps = {
  user: AuthUser;
  authBusy: boolean;
  authError: string;
  accessError: string;
  hasStoreAccess: boolean;
  onUpdateProfile: (fullName: string) => Promise<boolean>;
  onRefreshAccess: () => void;
  onSignOut: () => void;
  onOpenShop: () => void;
};

const sections: { id: ProfileSection; label: string; icon: typeof UserRound }[] = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "orders", label: "Đơn mua", icon: ClipboardList },
  { id: "profile", label: "Thông tin cá nhân", icon: UserRound },
  { id: "settings", label: "Cài đặt tài khoản", icon: Settings },
];

export function ProfilePage({
  user,
  authBusy,
  authError,
  accessError,
  hasStoreAccess,
  onUpdateProfile,
  onRefreshAccess,
  onSignOut,
  onOpenShop,
}: ProfilePageProps) {
  const [section, setSection] = useState<ProfileSection>("overview");
  const [fullName, setFullName] = useState(user.fullName);
  const [saved, setSaved] = useState(false);
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["profile-shop-orders", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id,order_number,status,total_amount,currency,created_at")
        .eq("created_by", user.id)
        .eq("sales_channel", "shop")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const displayName = user.fullName.trim() || user.email.split("@")[0] || user.phone || "Tài khoản của tôi";
  const initial = [...displayName][0]?.toLocaleUpperCase("vi-VN") ?? "T";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const updated = await onUpdateProfile(fullName);
    if (updated) setFullName(fullName.trim());
    setSaved(updated);
  }

  return (
    <div className="profile-screen">
      <header className="profile-heading">
        <div>
          <div className="eyebrow">TÀI KHOẢN</div>
          <h1>Tài khoản của tôi</h1>
        </div>
        <button className="button button-secondary" onClick={onOpenShop} type="button">
          <ShoppingBag size={16} /> Đi đến Shop
        </button>
      </header>

      <div className="profile-layout">
        <aside className="profile-nav">
          <div className="profile-nav-user">
            <div className="profile-avatar" aria-hidden="true">{initial}</div>
            <div className="profile-nav-identity">
              <strong>{displayName}</strong>
              <span>{user.email || user.phone}</span>
            </div>
          </div>
          <div className="profile-nav-label">QUẢN LÝ TÀI KHOẢN</div>
          <nav aria-label="Điều hướng tài khoản">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                aria-current={section === id ? "page" : undefined}
                className={`profile-nav-item ${section === id ? "active" : ""}`}
                key={id}
                onClick={() => setSection(id)}
                type="button"
              >
                <Icon size={17} />
                <span>{label}</span>
                {section === id && <ArrowRight className="profile-nav-arrow" size={15} />}
              </button>
            ))}
          </nav>
          <button className="profile-signout" onClick={onSignOut} type="button">
            <LogOut size={16} /> Đăng xuất
          </button>
        </aside>

        <section className="profile-content" aria-live="polite">
          {section === "overview" && (
            <>
              <div className="profile-welcome">
                <div>
                  <span className="profile-welcome-eyebrow">XIN CHÀO</span>
                  <h2>{displayName}</h2>
                  <p>Quản lý đơn mua và thông tin tài khoản của bạn tại đây.</p>
                </div>
                <div className="profile-welcome-icon"><UserRound size={34} /></div>
              </div>
              <div className="profile-panel profile-overview-panel">
                <div className="profile-panel-heading">
                  <div><h2>Tài khoản của bạn</h2><p>Thông tin đăng nhập và các mục quản lý</p></div>
                </div>
                <div className="profile-account-summary">
                  <div className="profile-avatar profile-avatar-large" aria-hidden="true">{initial}</div>
                  <div>
                    <strong>{displayName}</strong>
                    <span>{user.email || user.phone}</span>
                    {user.email && user.phone && <span>{user.phone}</span>}
                  </div>
                  <button className="button button-secondary" onClick={() => setSection("profile")} type="button">
                    Chỉnh sửa hồ sơ
                  </button>
                </div>
                <div className="profile-shortcuts">
                  <button className="profile-shortcut" onClick={() => setSection("orders")} type="button">
                    <span className="profile-shortcut-icon orders"><ClipboardList size={20} /></span>
                    <span><strong>Đơn mua</strong><small>Xem lịch sử mua hàng</small></span>
                    <ArrowRight size={16} />
                  </button>
                  <button className="profile-shortcut" onClick={() => setSection("settings")} type="button">
                    <span className="profile-shortcut-icon settings"><Settings size={20} /></span>
                    <span><strong>Cài đặt tài khoản</strong><small>Quản lý quyền truy cập</small></span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {section === "orders" && (
            <div className="profile-panel profile-orders-panel">
              <div className="profile-panel-heading">
                <div><h2>Đơn mua</h2><p>Đơn hàng bạn đặt qua Shop</p></div>
              </div>
              {ordersLoading ? (
                <div className="profile-orders-state"><LoaderCircle className="spin" size={22} /> Đang tải lịch sử đơn mua...</div>
              ) : ordersError ? (
                <div className="profile-orders-state profile-orders-error" role="alert">
                  <span>{ordersError instanceof Error ? ordersError.message : "Không tải được lịch sử đơn mua."}</span>
                  <button className="button button-secondary" onClick={() => void refetchOrders()} type="button">
                    <RefreshCw size={15} /> Thử lại
                  </button>
                </div>
              ) : orders.length === 0 ? (
                <div className="profile-empty-orders">
                  <div className="profile-empty-icon"><ShoppingBag size={28} /></div>
                  <h3>Bạn chưa có đơn mua nào</h3>
                  <p>Các đơn hàng đặt qua Shop khi đăng nhập sẽ được lưu và hiển thị tại đây.</p>
                  <button className="button button-primary" onClick={onOpenShop} type="button">
                    <ShoppingBag size={16} /> Đi đến Shop
                  </button>
                </div>
              ) : (
                <div className="profile-order-list">
                  {orders.map((order) => (
                    <article className="profile-order-card" key={order.id}>
                      <div className="profile-order-main">
                        <strong>{order.order_number}</strong>
                        <span>{new Date(order.created_at).toLocaleString("vi-VN")}</span>
                      </div>
                      <span className={`status status-${order.status}`}>
                        {orderStatusNames[order.status] ?? order.status}
                      </span>
                      <strong className="profile-order-total">
                        {formatMoney(Number(order.total_amount), order.currency)}
                      </strong>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "profile" && (
            <div className="profile-panel profile-form-panel">
              <div className="profile-panel-heading">
                <div><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin hiển thị trên tài khoản của bạn</p></div>
              </div>
              {(authError || accessError) && (
                <div className="error-banner" role="alert">{authError || accessError}</div>
              )}
              {saved && (
                <div className="auth-success-message" role="status">
                  <CheckCircle2 size={18} />
                  <span>Đã cập nhật hồ sơ.</span>
                </div>
              )}
              <form className="profile-settings-form" onSubmit={(event) => void submit(event)}>
                <FormField label="Tên hiển thị">
                  <input
                    autoComplete="name"
                    maxLength={100}
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </FormField>
                <FormField label="Email">
                  <input autoComplete="email" readOnly type="email" value={user.email} />
                </FormField>
                {user.phone && (
                  <FormField label="Số điện thoại">
                    <input autoComplete="tel" readOnly value={user.phone} />
                  </FormField>
                )}
                <p className="profile-field-note">Email và số điện thoại đăng nhập hiện chỉ có thể xem, chưa thể chỉnh sửa tại đây.</p>
                <button className="button button-primary" type="submit" disabled={authBusy}>
                  {authBusy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
                  Lưu thay đổi
                </button>
              </form>
            </div>
          )}

          {section === "settings" && (
            <div className="profile-panel profile-settings-panel">
              <div className="profile-panel-heading">
                <div><h2>Cài đặt tài khoản</h2><p>Quản lý trạng thái quyền và phiên đăng nhập</p></div>
              </div>
              {(authError || accessError) && (
                <div className="error-banner" role="alert">{authError || accessError}</div>
              )}
              <div className="profile-setting-row">
                <span className="profile-setting-icon"><ShieldCheck size={19} /></span>
                <div>
                  <strong>Quyền truy cập cửa hàng</strong>
                  <p>{hasStoreAccess ? "Tài khoản của bạn đã được cấp quyền cửa hàng." : "Tài khoản chưa được cấp quyền cửa hàng."}</p>
                </div>
                <button className="button button-secondary" onClick={onRefreshAccess} type="button">
                  <RefreshCw size={15} /> Kiểm tra lại
                </button>
              </div>
              <div className="profile-security-note">
                <ShieldCheck size={17} />
                <span>Thông tin và dữ liệu cửa hàng chỉ khả dụng theo quyền được cấp cho tài khoản.</span>
              </div>
              <button className="profile-danger-action" onClick={onSignOut} type="button">
                <LogOut size={16} /> Đăng xuất khỏi tài khoản
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
