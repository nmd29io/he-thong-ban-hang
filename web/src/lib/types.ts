import type { Database } from "./database.types";

export type Tables = Database["public"]["Tables"];
export type Product = Tables["products"]["Row"];
export type Variant = Tables["product_variants"]["Row"];
export type Balance = Tables["inventory_balances"]["Row"];
export type Order = Tables["sales_orders"]["Row"];
export type Customer = Tables["customers"]["Row"];
export type Payment = Tables["payments"]["Row"];
export type LedgerEntry = Tables["inventory_ledger"]["Row"];
export type Role = "owner" | "manager" | "cashier" | "stock_clerk" | "accountant";
export type Screen = "pos" | "orders" | "products" | "inventory" | "customers" | "reports" | "access";
export type StoreOption = Pick<Tables["stores"]["Row"], "id" | "code" | "name">;
export type WarehouseOption = Pick<Tables["warehouses"]["Row"], "id" | "name">;
export type Membership = Pick<Tables["store_memberships"]["Row"], "store_id" | "user_id" | "role" | "is_active" | "created_at">;
export type Report = Database["public"]["Functions"]["get_store_report"]["Returns"][number];
export type Recommendation = Database["public"]["Functions"]["get_store_recommendations"]["Returns"][number];

export type CatalogItem = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: number;
  onHand: number;
  reserved: number;
  available: number;
  isActive: boolean;
};

export type CartLine = { variantId: string; quantity: number };

export type Notice = { kind: "success" | "error"; text: string };

export type PendingOrder = { signature: string; key: string };

export type BulkReceiptLine = {
  id: string;
  sku: string;
  quantity: string;
  sourceLine: number;
  status: "ready" | "saved" | "error";
  error?: string;
  sourceError?: string;
};

export type BulkReceiptResponse = {
  results: Array<{
    row_id: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
};

export const roleNames: Record<Role, string> = {
  owner: "Chủ cửa hàng",
  manager: "Quản lý",
  cashier: "Thu ngân",
  stock_clerk: "Nhân viên kho",
  accountant: "Kế toán",
};

export const orderStatusNames: Record<string, string> = {
  draft: "Nháp",
  confirmed: "Đã xác nhận",
  fulfilled: "Hoàn tất",
  cancelled: "Đã hủy",
};

