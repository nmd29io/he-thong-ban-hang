import { useMemo } from "react";
import type { Balance, CatalogItem, Product, Recommendation, Variant } from "../lib/types";
import { getProductImageUrl } from "../lib/product-images";

export function useCatalog(
  products: Product[],
  variants: Variant[],
  balances: Balance[],
  recommendations: Recommendation[],
  cartVariantIds: string[],
) {
  const catalog = useMemo<CatalogItem[]>(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const balanceMap = new Map(balances.map((b) => [b.variant_id, b]));
    return variants.flatMap((variant) => {
      const product = productMap.get(variant.product_id);
      if (!product) return [];
      const balance = balanceMap.get(variant.id);
      const onHand = Number(balance?.on_hand ?? 0);
      const reserved = Number(balance?.reserved ?? 0);
      return [
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          description: product.description,
          imageUrl: getProductImageUrl(product.image_path),
          sku: variant.sku,
          variantName: variant.variant_name ?? "Mặc định",
          unitPrice: Number(variant.unit_price),
          onHand,
          reserved,
          available: Math.max(0, onHand - reserved),
          isActive: product.is_active && variant.is_active,
        },
      ];
    });
  }, [balances, products, variants]);

  const recommended = useMemo(() => {
    const base = recommendations
      .map((r) => catalog.find((item) => item.variantId === r.variant_id))
      .filter(
        (item): item is CatalogItem =>
          Boolean(item?.isActive && item.available > 0),
      )
      .filter((item) => !cartVariantIds.includes(item.variantId))
      .slice(0, 4);

    return base.length > 0
      ? base
      : catalog
          .filter(
            (item) =>
              item.isActive &&
              item.available > 0 &&
              !cartVariantIds.includes(item.variantId),
          )
          .slice(0, 4);
  }, [catalog, cartVariantIds, recommendations]);

  const lowStockCount = useMemo(
    () => catalog.filter((item) => item.isActive && item.available <= 3).length,
    [catalog],
  );

  return { catalog, recommended, lowStockCount };
}
