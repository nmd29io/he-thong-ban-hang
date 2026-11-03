import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { invokeEdgeFunction } from "../lib/edge-functions";
import {
  permissionKeys,
  rolePermissionPresets,
  type Permission,
} from "../lib/permissions";
import type { Notice, Role } from "../lib/types";
import { errorText } from "../lib/utils";

export type AccessFormData = {
  contactType: "email" | "phone";
  contact: string;
  memberRole: Role;
  permissions: Permission[];
};

export type AccessMember = {
  contact: string;
  contact_type: "email" | "phone";
  role: Role;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
};

export function useAccess(
  selectedStoreId: string,
  userId: string,
  enabled: boolean,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const form = useForm<AccessFormData>({
    defaultValues: {
      contactType: "email",
      contact: "",
      memberRole: "cashier",
      permissions: rolePermissionPresets.cashier,
    },
  });

  const membersQuery = useQuery({
    queryKey: ["store-members", selectedStoreId, userId],
    enabled: Boolean(selectedStoreId && enabled),
    queryFn: async () => {
      const result = await invokeEdgeFunction<{ members: AccessMember[] }>("manage-members", {
        action: "list",
        store_id: selectedStoreId,
      });
      return result.members;
    },
  });

  async function handleMembership(data: AccessFormData) {
    if (!selectedStoreId) return;
    setError("");
    setNotice(null);
    try {
      await invokeEdgeFunction("manage-members", {
        action: "set",
        store_id: selectedStoreId,
        contact_type: data.contactType,
        contact: data.contact.trim(),
        role: data.memberRole,
        permissions: data.memberRole === "owner"
          ? rolePermissionPresets.owner
          : data.permissions.filter((permission) =>
            (permissionKeys as readonly string[]).includes(permission)
          ),
      });
      form.setValue("contact", "");
      setNotice({ kind: "success", text: "Đã lưu thành viên và quyền truy cập." });
      await membersQuery.refetch();
      onSuccess();
    } catch (membershipError) {
      setError(errorText(membershipError, "Không cập nhật được quyền thành viên."));
    }
  }

  const membersError = membersQuery.error
    ? errorText(membersQuery.error, "Không tải được danh sách thành viên.")
    : "";
  return {
    form,
    members: membersQuery.data ?? [],
    loading: membersQuery.isLoading,
    error: membersError,
    handleMembership,
  };
}
