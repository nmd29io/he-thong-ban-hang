import { Plus } from "lucide-react";
import { FormField } from "../FormField";
import type { CatalogItem, Product } from "../../lib/types";
import { formatMoney } from "../../lib/utils";
import type { UseFormReturn } from "react-hook-form";

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

type ProductsViewProps = {
  catalog: CatalogItem[];
  products: Product[];
  loading: boolean;
  createProductForm: UseFormReturn<CreateProductFormData>;
  addVariantForm: UseFormReturn<AddVariantFormData>;
  editingVariantId: string;
  setEditingVariantId: (id: string) => void;
  editingPrice: string;
  setEditingPrice: (v: string) => void;
  handleCreateProduct: (data: CreateProductFormData) => void;
  handleAddVariant: (data: AddVariantFormData) => void;
  handleUpdatePrice: (event: React.FormEvent<HTMLFormElement>, variantId: string) => void;
  toggleProduct: (item: CatalogItem) => void;
};

export function ProductsView({
  catalog,
  products,
  loading,
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
}: ProductsViewProps) {
  const { register: registerCreate, handleSubmit: handleCreateSubmit } = createProductForm;
  const { register: registerVariant, handleSubmit: handleVariantSubmit } = addVariantForm;

  return (
    <>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Thêm sản phẩm</h2><p>Tạo sản phẩm cùng SKU đầu tiên trong một giao dịch</p></div>
        </div>
        <form className="data-form form-grid" onSubmit={(e) => void handleCreateSubmit(handleCreateProduct)(e)}>
          <FormField label="Tên sản phẩm">
            <input required maxLength={160} {...registerCreate("productName")} />
          </FormField>
          <FormField label="Mô tả">
            <input maxLength={500} {...registerCreate("productDescription")} />
          </FormField>
          <FormField label="SKU">
            <input required maxLength={80} {...registerCreate("productSku")} />
          </FormField>
          <FormField label="Tên biến thể">
            <input maxLength={120} placeholder="Để trống nếu là mặc định" {...registerCreate("variantName")} />
          </FormField>
          <FormField label="Giá bán (VND)">
            <input type="number" min="0" step="1" required {...registerCreate("productPrice")} />
          </FormField>
          <button className="button button-primary" type="submit"><Plus size={16} /> Thêm sản phẩm</button>
        </form>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Thêm SKU cho sản phẩm</h2><p>Một sản phẩm có thể có nhiều biến thể/SKU</p></div>
        </div>
        <form className="data-form form-grid" onSubmit={(e) => void handleVariantSubmit(handleAddVariant)(e)}>
          <FormField label="Sản phẩm">
            <select required {...registerVariant("variantProductId")}>
              <option value="">Chọn sản phẩm</option>
              {products.filter((p) => p.is_active).map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="SKU">
            <input required maxLength={80} {...registerVariant("newVariantSku")} />
          </FormField>
          <FormField label="Tên biến thể">
            <input maxLength={120} placeholder="Ví dụ: màu/size" {...registerVariant("newVariantName")} />
          </FormField>
          <FormField label="Giá bán (VND)">
            <input type="number" min="0" step="1" required {...registerVariant("newVariantPrice")} />
          </FormField>
          <button className="button button-primary" type="submit"><Plus size={16} /> Thêm SKU</button>
        </form>
      </section>

      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Danh mục sản phẩm</h2><p>Quản lý giá và trạng thái SKU</p></div>
          <span className="subtle-count">{catalog.length} SKU</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Sản phẩm</th><th>SKU</th><th>Biến thể</th><th>Giá</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.variantId}>
                  <td>{item.productName}</td>
                  <td>{item.sku}</td>
                  <td>{item.variantName}</td>
                  <td>
                    {editingVariantId === item.variantId ? (
                      <form className="price-edit" onSubmit={(event) => void handleUpdatePrice(event, item.variantId)}>
                        <input
                          type="number" min="0" step="1" required
                          aria-label={`Giá mới cho ${item.sku}`}
                          value={editingPrice}
                          onChange={(event) => setEditingPrice(event.target.value)}
                        />
                        <button className="text-button" type="submit">Lưu</button>
                        <button className="text-button" type="button" onClick={() => setEditingVariantId("")}>Bỏ</button>
                      </form>
                    ) : formatMoney(item.unitPrice)}
                  </td>
                  <td><span className={`status ${item.isActive ? "status-paid" : "status-cancelled"}`}>{item.isActive ? "Đang bán" : "Đã ẩn"}</span></td>
                  <td className="table-actions">
                    <div className="table-action-buttons">
                      <button className="text-button" onClick={() => { setEditingVariantId(item.variantId); setEditingPrice(String(item.unitPrice)); }}>Sửa giá</button>
                      <button className="text-button" onClick={() => toggleProduct(item)}>{item.isActive ? "Ngừng bán" : "Kích hoạt"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && catalog.length === 0 && (
                <tr><td colSpan={6} className="table-empty">Chưa có sản phẩm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
