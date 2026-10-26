import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Membership, StoreOption, WarehouseOption } from "../lib/types";
import { errorText } from "../lib/utils";

export function useStoreAccess(userId: string | null) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStoreAccess = useCallback(async (uid: string) => {
    setAccessLoading(true);
    setError("");
    try {
      const membershipResult = await supabase
        .from("store_memberships")
        .select("store_id,user_id,role,is_active,created_at")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at");
      if (membershipResult.error) throw membershipResult.error;

      const membershipRows = membershipResult.data ?? [];
      setMemberships(membershipRows);
      if (membershipRows.length === 0) {
        setStores([]);
        setSelectedStoreId("");
        setWarehouses([]);
        setSelectedWarehouseId("");
        return;
      }

      const storeIds = membershipRows.map((m) => m.store_id);
      const storeResult = await supabase
        .from("stores")
        .select("id,code,name")
        .in("id", storeIds)
        .eq("is_active", true)
        .order("name");
      if (storeResult.error) throw storeResult.error;
      const availableStores = storeResult.data ?? [];
      setStores(availableStores);
      setSelectedStoreId(availableStores[0]?.id ?? "");
    } catch (loadError) {
      setError(errorText(loadError, "Không tải được quyền truy cập cửa hàng."));
    } finally {
      setAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void Promise.resolve().then(() => loadStoreAccess(userId));
    }
  }, [loadStoreAccess, userId]);

  useEffect(() => {
    if (!selectedStoreId) return;
    let alive = true;
    void supabase
      .from("warehouses")
      .select("id,name")
      .eq("store_id", selectedStoreId)
      .eq("is_active", true)
      .order("name")
      .then(({ data, error: warehouseError }) => {
        if (!alive) return;
        if (warehouseError) {
          setError(warehouseError.message);
          return;
        }
        const rows = data ?? [];
        setWarehouses(rows);
        setSelectedWarehouseId((current) =>
          rows.some((w) => w.id === current) ? current : rows[0]?.id ?? "",
        );
      });
    return () => {
      alive = false;
    };
  }, [selectedStoreId]);

  return {
    stores,
    selectedStoreId,
    setSelectedStoreId,
    warehouses,
    selectedWarehouseId,
    setSelectedWarehouseId,
    memberships,
    accessLoading,
    accessError: error,
    refreshAccess: loadStoreAccess,
  };
}

