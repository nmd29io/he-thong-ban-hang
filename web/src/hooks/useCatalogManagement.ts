import { supabase } from "../lib/supabase";
import type { CatalogItem, Notice, Product, Variant } from "../lib/types";
import { errorText } from "../lib/utils";
import { useForm } from "react-hook-form";
import { useState } from "react";

type CreateProductFormData = {
  productName: string;
  productDescription: string;
  productSku: string;
  variantName: string;
  productPrice: string;
};

type AddVariantFormData = {
  variantProductId: string;
  newVariantSku: string;
  newVariantName: string;
  newVariantPrice: string;
};

export function useCatalogManagement(
  products: Product[],
  variants: Variant[],
  onSuccess: () => void,
  setNotice: (notice: Notice | null) => void,
  setError: (error: string) => void,
) {
  const [editingVariantId, setEditingVariantId] = useState("");
  const [editingPrice, setEditingPrice] = useState("");

  const createProductForm = useForm<CreateProductFormData>({
    defaultValues: {
      productName: "",
      productDescription: "",
      productSku: "",
      variantName: "",
      productPrice: "",
    },
  });

  const addVariantForm = useForm<AddVariantFormData>({
    defaultValues: {
      variantProductId: "",
      newVariantSku: "",
      newVariantName: "",
      newVariantPrice: "",
    },
  });

  async function handleCreateProduct(data: CreateProductFormData) {
    setError("");
    setNotice(null);
    try {
      const price = Number(data.productPrice);
      if (!Number.isSafeInteger(price) || price < 0) {
        throw new Error("Giá bán phải là số nguyên không âm.");
      }
      const { data: result, error: productError } = await supabase.rpc("create_catalog_item", {
        p_name: data.productName.trim(),
        p_sku: data.productSku.trim(),
        p_variant_name: data.variantName.trim(),
        p_unit_price: price,
        p_description: data.productDescription.trim() || null,
      });
      if (productError) throw productError;
      if (!result?.[0]) throw new Error("Không tạo được sản phẩm.");
      createProductForm.reset();
      setNotice({ kind: "success", text: "Đã tạo sản phẩm và SKU." });
      onSuccess();
    } catch (productError) {
      setError(errorText(productError, "Không tạo được sản phẩm."));
    }
  }

  async function handleAddVariant(data: AddVariantFormData) {
    setError("");
    setNotice(null);
    try {
      const price = Number(data.newVariantPrice);
      if (!Number.isSafeInteger(price) || price < 0) {
        throw new Error("Giá bán phải là số nguyên không âm.");
      }
      const { data: result, error: variantError } = await supabase.rpc("add_product_variant", {
        p_product_id: data.variantProductId,
        p_sku: data.newVariantSku.trim(),
        p_variant_name: data.newVariantName.trim(),
        p_unit_price: price,
      });
      if (variantError) throw variantError;
      if (!result) throw new Error("Không tạo được SKU.");
      addVariantForm.reset();
      setNotice({ kind: "success", text: "Đã thêm SKU cho sản phẩm." });
      onSuccess();
    } catch (variantError) {
      setError(errorText(variantError, "Không thêm được SKU."));
    }
  }

  async function handleUpdatePrice(event: React.FormEvent<HTMLFormElement>, variantId: string) {
    event.preventDefault();
    const price = Number(editingPrice);
    if (!Number.isSafeInteger(price) || price < 0) {
      setError("Giá bán phải là số nguyên không âm.");
      return;
    }
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("product_variants")
        .update({ unit_price: price })
        .eq("id", variantId);
      if (updateError) throw updateError;
      setEditingVariantId("");
      setNotice({ kind: "success", text: "Đã cập nhật giá bán." });
      onSuccess();
    } catch (updateError) {
      setError(errorText(updateError, "Không cập nhật được giá bán."));
    }
  }

  async function toggleProduct(item: CatalogItem) {
    setError("");
    const product = products.find((entry) => entry.id === item.productId);
    const variant = variants.find((entry) => entry.id === item.variantId);
    if (!product || !variant) return;
    try {
      const update = !product.is_active
        ? await supabase.from("products").update({ is_active: true }).eq("id", product.id)
        : variant.is_active
          ? await supabase
              .from("product_variants")
              .update({ is_active: false })
              .eq("id", variant.id)
          : await supabase
              .from("product_variants")
              .update({ is_active: true })
              .eq("id", variant.id);
      if (update.error) throw update.error;
      setNotice({ kind: "success", text: "Đã cập nhật trạng thái sản phẩm/SKU." });
      onSuccess();
    } catch (updateError) {
      setError(errorText(updateError, "Không cập nhật được sản phẩm."));
    }
  }

  return {
    createProductForm,
    addVariantForm,
    editingVariantId,
    setEditingVariantId,
    editingPrice,
    setEditingPrice,
    handleCreateProduct,
    handleAddVariant,
    handleUpdatePrice,
    toggleProduct,
  };
}

