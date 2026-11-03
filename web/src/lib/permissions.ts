import type { Role } from "./types";

export const permissionKeys = [
  "sales.create",
  "orders.read",
  "orders.manage",
  "payments.read",
  "payments.manage",
  "customers.read",
  "customers.manage",
  "products.read",
  "products.manage",
  "inventory.read",
  "inventory.manage",
  "reports.read",
  "members.manage",
] as const;

export type Permission = typeof permissionKeys[number];

export const permissionLabels: Record<Permission, string> = {
  "sales.create": "Tạo đơn bán hàng",
  "orders.read": "Xem đơn hàng",
  "orders.manage": "Hoàn tất hoặc hủy đơn (bao gồm xem)",
  "payments.read": "Xem thanh toán",
  "payments.manage": "Ghi nhận thanh toán (bao gồm xem)",
  "customers.read": "Xem khách hàng",
  "customers.manage": "Quản lý khách hàng (bao gồm xem)",
  "products.read": "Xem sản phẩm",
  "products.manage": "Quản lý sản phẩm và giá (bao gồm xem)",
  "inventory.read": "Xem tồn kho và sổ kho",
  "inventory.manage": "Ghi nhận nhập/điều chỉnh kho (bao gồm xem)",
  "reports.read": "Xem báo cáo",
  "members.manage": "Quản lý thành viên và quyền",
};

const salesPermissions: Permission[] = [
  "sales.create",
  "orders.read",
  "orders.manage",
  "payments.read",
  "payments.manage",
  "customers.read",
  "customers.manage",
  "products.read",
];

export const rolePermissionPresets: Record<Role, Permission[]> = {
  owner: [...permissionKeys],
  manager: permissionKeys.filter((permission) => permission !== "members.manage"),
  cashier: salesPermissions,
  stock_clerk: ["products.read", "inventory.read", "inventory.manage"],
  accountant: [
    "orders.read",
    "payments.read",
    "payments.manage",
    "customers.read",
    "products.read",
    "inventory.read",
    "reports.read",
  ],
};

export const roleNames: Record<Role, string> = {
  owner: "Chủ cửa hàng",
  manager: "Quản lý",
  cashier: "Thu ngân",
  stock_clerk: "Nhân viên kho",
  accountant: "Kế toán",
};
