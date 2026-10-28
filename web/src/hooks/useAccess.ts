import { supabase } from "../lib/supabase";
import type { Notice, Role } from "../lib/types";
import { errorText } from "../lib/utils";
import { useForm } from "react-hook-form";

type MembershipFormData = {
  memberUserId: string;
  memberRole: Role;
};

export function useAccess(
  selectedStoreId: string,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const form = useForm<MembershipFormData>({
    defaultValues: { memberUserId: "", memberRole: "cashier" },
  });

  async function handleMembership(data: MembershipFormData) {
    setError("");
    setNotice(null);
    try {
      const { error: membershipError } = await supabase.rpc("set_store_membership", {
        p_store_id: selectedStoreId,
        p_user_id: data.memberUserId.trim(),
        p_role: data.memberRole,
        p_is_active: true,
      });
      if (membershipError) throw membershipError;
      form.setValue("memberUserId", "");
      setNotice({ kind: "success", text: "Đã lưu thành viên và vai trò." });
      onSuccess();
    } catch (membershipError) {
      setError(errorText(membershipError, "Không cập nhật được quyền thành viên."));
    }
  }

  return { form, handleMembership };
}
