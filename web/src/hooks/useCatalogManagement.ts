import { supabase } from "../lib/supabase";
import type { CatalogItem, Notice, Product, Variant } from "../lib/types";
import { errorText } from "../lib/utils";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_TYPES,
} from "../lib/product-images";

type CreateProductFormData = {
  productName: string;
  productDescription: string;
  productSku: string;
  variantName: string;
  productPrice: string;
  productImage: FileList | undefined;
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
  const [imageBusyProductId, setImageBusyProductId] = useState("");

  const createProductForm = useForm<CreateProductFormData>({
    defaultValues: {
      productName: "",
      productDescription: "",
      productSku: "",
      variantName: "",
      productPrice: "",
      productImage: undefined,
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

  async function saveProductImage(productId: string, image: File) {
    if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(image.type)) {
      throw new Error("Ảnh sản phẩm phải có định dạng JPEG, PNG hoặc WebP.");
    }
    if (image.size > MAX_PRODUCT_IMAGE_SIZE) {
      throw new Error("Ảnh sản phẩm không được vượt quá 5 MB.");
    }

    const extension = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
    const imagePath = `${productId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(imagePath, image, { cacheControl: "3600", contentType: image.type });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_path: imagePath })
      .eq("id", productId);
    if (updateError) {
      const { error: cleanupError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([imagePath]);
      if (cleanupError) {
        console.error("Could not remove an unlinked product image:", cleanupError.message);
      }
      throw updateError;
    }
  }

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
      const image = data.productImage?.[0];
      if (image) {
        try {
          await saveProductImage(result[0].product_id, image);
        } catch (imageError) {
          onSuccess();
          throw new Error(`Sản phẩm đã tạo nhưng không lưu được ảnh: ${errorText(imageError, "Lỗi tải ảnh.")}`);
        }
      }
      createProductForm.reset();
      setNotice({ kind: "success", text: "Đã tạo sản phẩm và SKU." });
      onSuccess();
    } catch (productError) {
      setError(errorText(productError, "Không tạo được sản phẩm."));
    }
  }

  async function handleUploadProductImage(productId: string, image: File) {
    setError("");
    setNotice(null);
    setImageBusyProductId(productId);
    try {
      await saveProductImage(productId, image);
      setNotice({ kind: "success", text: "Đã cập nhật ảnh sản phẩm." });
      onSuccess();
    } catch (imageError) {
      setError(errorText(imageError, "Không cập nhật được ảnh sản phẩm."));
    } finally {
      setImageBusyProductId("");
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
    imageBusyProductId,
    handleCreateProduct,
    handleUploadProductImage,
    handleAddVariant,
    handleUpdatePrice,
    toggleProduct,
  };
}
