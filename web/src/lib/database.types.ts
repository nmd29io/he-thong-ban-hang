type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      stores: Table<{
        id: string;
        code: string;
        name: string;
        is_active: boolean;
        created_at: string;
      }>;
      warehouses: Table<{
        id: string;
        store_id: string;
        code: string;
        name: string;
        is_active: boolean;
        created_at: string;
      }>;
      store_memberships: Table<{
        store_id: string;
        user_id: string;
        role: string;
        permissions: string[];
        is_active: boolean;
        created_at: string;
      }>;
      products: Table<{
        id: string;
        name: string;
        description: string | null;
        image_path: string | null;
        category: string | null;
        brand: string | null;
        is_active: boolean;
        created_at: string;
      }>;
      product_variants: Table<{
        id: string;
        product_id: string;
        sku: string;
        variant_name: string | null;
        unit_price: number;
        unit: string;
        is_active: boolean;
        created_at: string;
      }>;
      inventory_balances: Table<{
        warehouse_id: string;
        variant_id: string;
        on_hand: number;
        reserved: number;
        updated_at: string;
      }>;
      sales_orders: Table<{
        id: string;
        order_number: string;
        store_id: string;
        warehouse_id: string;
        customer_id: string | null;
        created_by: string | null;
        sales_channel: string;
        status: string;
        currency: string;
        subtotal: number;
        discount_amount: number;
        tax_amount: number;
        total_amount: number;
        created_at: string;
        updated_at: string;
      }>;
      sales_order_items: Table<{
        id: string;
        order_id: string;
        variant_id: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        created_at: string;
      }>;
      customers: Table<{
        id: string;
        store_id: string;
        name: string;
        phone: string | null;
        email: string | null;
        notes: string | null;
        shipping_address: string | null;
        created_at: string;
        updated_at: string;
      }>;
      payments: Table<{
        id: string;
        order_id: string;
        provider: string;
        provider_payment_id: string | null;
        amount: number;
        currency: string;
        status: string;
        payment_method: string;
        received_by: string | null;
        idempotency_key: string | null;
        created_at: string;
        updated_at: string;
      }>;
      inventory_ledger: Table<{
        id: string;
        warehouse_id: string;
        variant_id: string;
        event_type: string;
        quantity_delta: number;
        reference_type: string | null;
        reference_id: string | null;
        idempotency_key: string | null;
        metadata: Record<string, unknown>;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_store_report: {
        Args: { p_store_id: string; p_from: string; p_until: string };
        Returns: {
          sales_total: number;
          order_count: number;
          paid_total: number;
          unpaid_total: number;
          low_stock_count: number;
        }[];
      };
      get_store_recommendations: {
        Args: { p_store_id: string; p_limit?: number };
        Returns: {
          variant_id: string;
          product_name: string;
          sku: string;
          unit_price: number;
          sold_quantity: number;
        }[];
      };
      set_store_membership: {
        Args: {
          p_actor_id: string;
          p_store_id: string;
          p_user_id: string;
          p_role: string;
          p_permissions: string[];
          p_is_active?: boolean;
        };
        Returns: undefined;
      };
      role_permission_preset: {
        Args: { p_role: string };
        Returns: string[];
      };
      user_has_store_permission: {
        Args:
          | { p_store_id: string; p_permission: string }
          | { p_store_id: string; p_permission: string; p_user_id: string };
        Returns: boolean;
      };
      user_has_any_store_permission: {
        Args: { p_permission: string };
        Returns: boolean;
      };
      create_catalog_item: {
        Args: {
          p_name: string;
          p_sku: string;
          p_variant_name: string;
          p_unit_price: number;
          p_description?: string | null;
        };
        Returns: { product_id: string; variant_id: string }[];
      };
      add_product_variant: {
        Args: {
          p_product_id: string;
          p_sku: string;
          p_variant_name: string;
          p_unit_price: number;
        };
        Returns: string;
      };
      create_storefront_order: {
        Args: {
          p_store_id: string;
          p_warehouse_id: string;
          p_items: Json;
          p_customer_name: string;
          p_customer_phone: string;
          p_shipping_address: string;
          p_idempotency_key: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
