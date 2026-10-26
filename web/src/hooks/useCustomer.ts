import { supabase } from "../lib/supabase";
import type { Notice } from "../lib/types";
import { errorText } from "../lib/utils";
import { useForm } from "react-hook-form";

type CustomerFormData = {
  customerName: string;
  customerPhone: string;
};

export function useCustomer(
  selectedStoreId: string,
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const form = useForm<CustomerFormData>({
    defaultValues: { customerName: "", customerPhone: "" },
  });

  async function handleCreateCustomer(data: CustomerFormData) {
    if (!selectedStoreId) return;
    setError("");
    setNotice(null);
    try {
      const { error: customerError } = await supabase.from("customers").insert({
        store_id: selectedStoreId,
        name: data.customerName.trim(),
        phone: data.customerPhone.trim() || null,
      });
      if (customerError) throw customerError;
      form.reset();
      setNotice({ kind: "success", text: "Đã thêm khách hàng." });
      onSuccess();
    } catch (customerError) {
      setError(errorText(customerError, "Không thêm được khách hàng."));
    }
  }

  return { form, handleCreateCustomer };
}

