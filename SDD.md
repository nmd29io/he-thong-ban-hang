# TÀI LIỆU PHÂN TÍCH & THIẾT KẾ CHI TIẾT
Hệ thống bán hàng đa kênh · Phiên bản 1.0 · Trạng thái: Dự thảo thiết kế

Tài liệu này được xây dựng tiếp nối SRS hệ thống bán hàng đã xác định,
chuyển các yêu cầu nghiệp vụ thành thiết kế có thể dùng để phát triển,
kiểm thử và triển khai.

Các quyết định nền tảng được giữ nguyên:

Kênh bán Đa kênh: cửa hàng + trực tuyến

Nền tảng Web

Phạm vi MVP

Quản lý tồn kho Có

Loại sản phẩm Chưa xác định

Quy mô vận hành Chưa xác định

Thiết kế Mở rộng theo cấu hình

## 1. Mục đích và phạm vi tài liệu
Tài liệu Phân tích & Thiết kế chi tiết (Detailed Analysis & Design ---
DAD) mô tả cách hệ thống được tổ chức về kiến trúc, phân hệ, dữ liệu,
quy trình, API, bảo mật và xử lý lỗi.

Tài liệu bao gồm:

1. Phân tích nghiệp vụ và kiến trúc tổng thể.
1. Thiết kế phân hệ và luồng xử lý.
1. Thiết kế cơ sở dữ liệu và quan hệ dữ liệu.
1. Thiết kế API và hợp đồng trao đổi dữ liệu.
1. Thiết kế phân quyền và kiểm soát giao dịch.
1. Thiết kế giao diện web.
1. Chiến lược kiểm thử, triển khai và vận hành.
1. Các quyết định kỹ thuật còn mở.

Nguyên tắc thiết kế quan trọng nhất là không giả định trước ngành hàng.
Hệ thống phải có thể quản lý sản phẩm đơn giản hoặc sản phẩm có biến thể
mà không phải thiết kế lại toàn bộ nghiệp vụ bán hàng và kho.

## 2. Kiến trúc tổng thể
### 2.1. Mô hình kiến trúc đề xuất
Đối với MVP, đề xuất kiến trúc Modular Monolith (ứng dụng nguyên khối
phân mô-đun), sử dụng một backend có các ranh giới nghiệp vụ rõ ràng và
một cơ sở dữ liệu quan hệ.

Mô hình này giảm độ phức tạp triển khai ban đầu nhưng vẫn tạo điều kiện
tách các phân hệ thành dịch vụ riêng khi quy mô thực tế yêu cầu.

Tầng giao diện web

Quản trị · Bán hàng tại cửa hàng · Cửa hàng trực tuyến

API / Application Layer

Xác thực · Kiểm tra đầu vào · Phân quyền · Điều phối nghiệp vụ

### Lõi nghiệp vụ
Sản phẩm

Danh mục, giá, SKU

Đơn hàng

Vòng đời đơn

Tồn kho

Số dư, biến động

Thanh toán

Thu tiền, hoàn tiền

Khách hàng

Hồ sơ, lịch sử

Báo cáo

Thống kê, đối soát

Tầng dữ liệu

Cơ sở dữ liệu quan hệ · Lịch sử giao dịch · Nhật ký kiểm toán

Dịch vụ hạ tầng và tích hợp

Lưu trữ tệp · Email/thông báo · Cổng thanh toán · Sao lưu

Các tích hợp ngoài chỉ triển khai khi được chốt trong phạm vi.

### 2.2. Các nguyên tắc kiến trúc
| Nguyên tắc | Thiết kế áp dụng |
| --- | --- |
| Phân mô-đun | Mỗi phân hệ có trách nhiệm và giao diện nghiệp vụ riêng |
| Nhất quán dữ liệu | Giao dịch kho và đơn hàng dùng transaction phù hợp |
| API-first | Giao diện và tích hợp gọi API, không truy cập trực tiếp cơ sở dữ liệu |
| Bảo mật theo lớp | Xác thực, phân quyền, kiểm tra đầu vào và kiểm soát dữ liệu |
| Có khả năng mở rộng | Thuộc tính sản phẩm, kênh bán và phương thức thanh toán được cấu hình |
| Truy vết | Giao dịch quan trọng có mã tham chiếu và lịch sử |
| Tránh phụ thuộc nhà cung cấp | Logic nghiệp vụ không gắn cứng vào một cổng thanh toán hay dịch vụ vận chuyển |

### 2.3. Phân định phạm vi hệ thống
Thuộc lõi MVP: tài khoản và phân quyền, sản phẩm, danh mục, khách hàng,
đơn hàng, kho, ghi nhận thanh toán, báo cáo cơ bản và nhật ký.

Chưa mặc định thuộc MVP: ứng dụng di động riêng, quản lý sản xuất, kế
toán tổng hợp, CRM nâng cao, chương trình khách hàng thân thiết, tự động
hóa mua hàng, tích hợp nhiều hãng vận chuyển và đồng bộ đa hệ thống ERP.

Các chức năng này có thể được bổ sung thông qua các mô-đun hoặc tích hợp
độc lập.

## 3. Phân tích phân hệ và thiết kế thành phần
### 3.1. Danh mục phân hệ
| Mã | Phân hệ | Trách nhiệm chính |
| --- | --- | --- |
| MOD-01 | IAM | Tài khoản, xác thực, vai trò và quyền |
| MOD-02 | Catalog | Sản phẩm, biến thể, danh mục, thuộc tính |
| MOD-03 | Pricing | Giá bán, lịch sử giá và quy tắc giá |
| MOD-04 | Customer | Hồ sơ khách hàng và địa chỉ |
| MOD-05 | Sales | Giỏ hàng, đơn hàng, trạng thái đơn |
| MOD-06 | Inventory | Kho, tồn, giữ chỗ và chứng từ biến động |
| MOD-07 | Payment | Thu tiền, trạng thái thanh toán, hoàn tiền |
| MOD-08 | Returns | Trả hàng, kiểm tra hàng trả và hoàn nhập |
| MOD-09 | Reporting | Báo cáo doanh số và tồn kho |
| MOD-10 | Audit | Nhật ký nghiệp vụ và truy vết |
| MOD-11 | Configuration | Cấu hình cửa hàng và chính sách hệ thống |

Các mô-đun có thể triển khai trong cùng một ứng dụng backend. Phân
mô-đun ở đây là ranh giới trách nhiệm logic, không bắt buộc mỗi mô-đun
phải là một microservice.

### 3.2. Thiết kế phân hệ sản phẩm
Mô hình sản phẩm phải phân biệt giữa sản phẩm thương mại và đơn vị có
thể bán, định giá, quản lý tồn.

Product

Tên, mô tả, danh mục, trạng thái

ProductVariant / SellableItem

SKU, mã vạch, giá, đơn vị tính, theo dõi tồn

Pricing

Giá áp dụng

Inventory

Tồn theo SKU và kho

Quy tắc thiết kế:

- Sản phẩm không có biến thể có thể dùng một biến thể mặc định.
- Mỗi đơn vị bán được có một SKU ổn định.
- Thuộc tính có kiểu dữ liệu và phạm vi áp dụng: sản phẩm hoặc biến thể.
- Không đưa mọi thuộc tính vào các cột cố định của bảng `products`.
- Chỉ những thuộc tính cần tìm kiếm hoặc lọc thường xuyên mới được cân
  nhắc lập chỉ mục chuyên biệt.
- Loại sản phẩm chưa xác định nên không được dùng để quyết định cứng cấu
  trúc bảng hoặc quy trình bán hàng.

Quyết định thiết kế: giữ mô hình Product--Variant và cấu hình thuộc
tính. Không bắt buộc áp dụng mô hình biến thể phức tạp trên giao diện
ngay trong bản MVP nếu sản phẩm ban đầu chưa cần.

### 3.3. Thiết kế phân hệ đơn hàng
Phân hệ đơn hàng quản lý vòng đời thương mại, không trực tiếp chịu trách
nhiệm tính số dư kho hoặc xác nhận giao dịch ngân hàng.

Các thành phần:

- `OrderService`: tạo và truy vấn đơn hàng.
- `OrderPricingService`: tính giá, chiết khấu, thuế và phí.
- `OrderStateMachine`: kiểm tra chuyển trạng thái.
- `OrderInventoryCoordinator`: điều phối yêu cầu giữ hoặc xuất kho.
- `OrderPaymentCoordinator`: liên kết trạng thái thanh toán.
- `OrderHistoryService`: lưu lịch sử thay đổi.

Một đơn hàng lưu kênh tạo đơn, thông tin khách, các dòng hàng, giá tại
thời điểm đặt, trạng thái, tổng tiền và các tham chiếu giao dịch liên
quan.

Không lưu toàn bộ logic thanh toán hoặc tồn kho bên trong
`OrderService`\; mỗi mô-đun cần có trách nhiệm rõ ràng để tránh giao
dịch bị xử lý lặp.

### 3.4. Thiết kế phân hệ tồn kho
Phân hệ tồn kho chịu trách nhiệm về số lượng hàng tại từng kho.

Mỗi SKU tại một kho có tối thiểu:

- `on_hand_quantity`: số lượng tồn thực tế đã ghi sổ.
- `reserved_quantity`: số lượng đang giữ cho đơn hàng.
- `available_quantity`: số lượng khả dụng để nhận đơn mới.

$ Q_"available" = Q_"on_hand" - Q_"reserved" $

`available_quantity` nên được tính từ hai trường nguồn hoặc lưu như dữ
liệu tổng hợp có cơ chế đồng bộ nghiêm ngặt. Không cho phép hai nguồn dữ
liệu độc lập cùng quyết định tồn khả dụng.

Các nghiệp vụ kho:

1. Nhập kho.
1. Xuất kho.
1. Giữ và giải phóng hàng.
1. Điều chỉnh tồn.
1. Kiểm kê.
1. Nhập lại hàng trả.
1. Tra cứu lịch sử biến động.

Mọi thay đổi tồn phải có nguồn nghiệp vụ, thời điểm và người hoặc tiến
trình thực hiện. Việc cập nhật số dư và ghi lịch sử biến động phải nhất
quán.

### 3.5. Thiết kế phân hệ thanh toán
Phân hệ thanh toán cần tách ba khái niệm:

- Payment: giao dịch thanh toán gắn với đơn.
- Refund: giao dịch hoàn tiền liên kết với khoản thu gốc.
- Payment status: trạng thái tổng hợp phục vụ hiển thị và báo cáo.

Đối với thanh toán điện tử trong tương lai, kiến trúc cần hỗ trợ:

- Gửi yêu cầu thanh toán đến nhà cung cấp.
- Nhận callback/webhook.
- Xác thực chữ ký của thông báo.
- Chống xử lý trùng.
- Đối soát giao dịch chưa xác định kết quả.
- Ghi nhận hoàn tiền và kết quả từ nhà cung cấp.

Ở MVP, nếu chỉ thu tiền mặt và chuyển khoản thủ công, vẫn cần giữ mô
hình dữ liệu này để tránh phải thay đổi lõi đơn hàng khi bổ sung cổng
thanh toán.

## 4. Phân tích quy trình nghiệp vụ chi tiết
### 4.1. Quy trình bán hàng tại cửa hàng
1

Chọn hàng

Quét mã vạch hoặc tìm SKU.

2

Tính giá

Máy chủ xác nhận giá và chiết khấu.

3

Kiểm tra tồn

Kiểm tra số lượng khả dụng theo chính sách.

4

Tạo và xác nhận đơn

Lưu dòng hàng, tổng tiền và trạng thái.

5

Ghi nhận thanh toán

Thu tiền hoặc ghi nhận giao dịch chờ.

6

Hoàn tất nghiệp vụ

Ghi nhận xuất kho theo chính sách và cập nhật lịch sử.

Điều kiện kiểm soát: bước tạo đơn không được tự động làm giảm tồn thực
tế nếu quy trình được cấu hình chỉ giữ hàng. Việc ghi sổ xuất kho phải
có một điểm thực hiện duy nhất, có thể truy vết và chống lặp.

### 4.2. Quy trình bán hàng trực tuyến
Bước 1 --- Giỏ hàng

Giỏ hàng ở phía trình duyệt chỉ là dữ liệu đề xuất; máy chủ phải kiểm
tra lại.

Bước 2 --- Kiểm tra đơn

Xác nhận SKU, giá, số lượng, thông tin nhận hàng và chính sách tồn kho.

Bước 3 --- Tạo đơn

Tạo mã đơn duy nhất và lưu ảnh chụp giá cùng dữ liệu dòng hàng.

Bước 4 --- Thanh toán

Ghi nhận trạng thái thanh toán riêng biệt; không mặc định đơn đã được
trả tiền.

Bước 5 --- Xử lý hàng

Giữ tồn, soạn hàng, xuất kho và hoàn tất theo các trạng thái đã định
nghĩa.

Các trạng thái đơn hàng và thanh toán phải độc lập. Ví dụ, đơn đã xác
nhận nhưng thanh toán chưa thành công không được tự động chuyển thành
đơn đã thanh toán.

### 4.3. Quy trình nhập kho
1. Nhân viên tạo phiếu nhập.
1. Chọn kho, SKU và số lượng.
1. Hệ thống xác thực dữ liệu và trạng thái phiếu.
1. Người có quyền ghi sổ.
1. Hệ thống cập nhật số dư tồn và tạo bản ghi biến động.
1. Phiếu chuyển sang trạng thái đã ghi sổ.

Nếu bước 5 thất bại, toàn bộ cập nhật liên quan phải được rollback hoặc
được xử lý theo cơ chế phục hồi đã thiết kế. Không được để phiếu báo
thành công trong khi số dư kho chưa được cập nhật.

### 4.4. Quy trình hủy đơn
Điều kiện hủy phụ thuộc trạng thái hiện tại và các giao dịch đã phát
sinh.

| Tình huống | Xử lý |
| --- | --- |
| Chưa giữ tồn | Chuyển trạng thái hủy nếu hợp lệ |
| Đã giữ hàng | Giải phóng lượng giữ chỗ một lần |
| Đã xuất kho | Tạo chứng từ hoàn nhập nếu đủ điều kiện |
| Đã thu tiền | Tạo nghiệp vụ hoàn tiền hoặc khoản phải hoàn |
| Đang xử lý thanh toán | Kiểm tra kết quả giao dịch trước khi quyết định hoàn tiền |
| Đã hoàn tất | Áp dụng quy trình trả hàng/điều chỉnh, không xóa lịch sử đơn |

## 5. Thiết kế cơ sở dữ liệu chi tiết
### 5.1. Quy ước vật lý
Thiết kế logic từ SRS được chuyển thành các nhóm bảng dưới đây. Tên bảng
dùng tiếng Anh để thuận tiện cho lập trình và quản lý migration.

| Quy ước | Áp dụng |
| --- | --- |
| Khóa chính | `id`, UUID hoặc kiểu tương đương |
| Khóa ngoại | `{entity}_id` |
| Thời gian | `created_at`, `updated_at`, timestamp có quy ước múi giờ |
| Trạng thái | Mã ổn định, không dùng nhãn giao diện làm giá trị lưu trữ |
| Tiền | `DECIMAL` với độ chính xác được thống nhất |
| Số lượng | `DECIMAL` khi cần hỗ trợ số lượng phân số |
| Xóa dữ liệu | Ưu tiên `status` hoặc `archived_at` cho dữ liệu nghiệp vụ |
| Đồng thời | `version` hoặc cơ chế khóa thích hợp cho bản ghi có tranh chấp |

### 5.2. Thiết kế bảng và trường trọng yếu
#### Nhóm tài khoản và phân quyền
| Bảng | Trường trọng yếu | Ràng buộc |
| --- | --- | --- |
| `users` | `id`, `username`, `email`, `password_hash`, `status` | Username/email duy nhất theo chính sách |
| `roles` | `id`, `code`, `name` | `code` duy nhất |
| `permissions` | `id`, `code`, `description` | `code` duy nhất |
| `user_roles` | `user_id`, `role_id` | Unique cặp khóa |
| `role_permissions` | `role_id`, `permission_id` | Unique cặp khóa |
| `audit_logs` | `actor_user_id`, `action`, `entity_type`, `entity_id`, `created_at` | Chỉ ghi thêm trong hoạt động thường |

#### Nhóm sản phẩm
| Bảng | Trường trọng yếu | Ràng buộc |
| --- | --- | --- |
| `categories` | `id`, `parent_id`, `code`, `name`, `status` | Mã danh mục duy nhất |
| `units` | `id`, `code`, `name`, `precision_scale` | Mã đơn vị duy nhất |
| `products` | `id`, `code`, `name`, `category_id`, `base_unit_id`, `status` | Mã sản phẩm duy nhất |
| `product_variants` | `id`, `product_id`, `sku`, `barcode`, `selling_price`, `status` | SKU duy nhất theo phạm vi đã chốt |
| `attribute_definitions` | `id`, `code`, `data_type`, `scope`, `validation_rules` | Mã thuộc tính duy nhất |
| `product_attribute_values` | `product_id`, `variant_id`, `attribute_definition_id`, `value_json` | Kiểm tra phạm vi và kiểu dữ liệu |
| `product_price_history` | `variant_id`, `price`, `effective_from`, `effective_to` | Lịch sử giá không chồng lấn theo chính sách |

`value_json` chỉ dùng cho các thuộc tính mở rộng có cấu trúc. Các trường
có vai trò quan trọng với tính đúng đắn của nghiệp vụ, như SKU, trạng
thái và đơn vị tính, vẫn cần cột có kiểu dữ liệu rõ ràng.

#### Nhóm đơn hàng và dòng hàng
| Bảng | Trường trọng yếu | Ràng buộc |
| --- | --- | --- |
| `sales_orders` | `order_code`, `channel`, `customer_id`, `status`, `payment_status`, `grand_total` | Mã đơn duy nhất |
| `sales_order_items` | `order_id`, `variant_id`, `quantity`, `unit_price`, `discount_amount`, `line_total` | Số lượng hợp lệ; khóa ngoại hợp lệ |
| `order_status_history` | `order_id`, `from_status`, `to_status`, `changed_by`, `created_at` | Ghi nhận chuyển trạng thái |
| `order_reservations` | `order_id`, `warehouse_id`, `variant_id`, `quantity`, `status`, `expires_at` | Không giải phóng hoặc tiêu thụ trùng |

Các trường snapshot như tên sản phẩm, SKU, đơn vị và đơn giá phải được
lưu ngay trong dòng hàng khi tạo đơn. Không dùng phép JOIN với bảng sản
phẩm hiện tại để tái tạo lịch sử giao dịch.

#### Nhóm kho
| Bảng | Trường trọng yếu | Ràng buộc |
| --- | --- | --- |
| `warehouses` | `id`, `code`, `name`, `status` | Mã kho duy nhất |
| `inventory_balances` | `warehouse_id`, `variant_id`, `on_hand_quantity`, `reserved_quantity`, `version` | Unique kho + SKU |
| `inventory_documents` | `document_code`, `document_type`, `status`, `warehouse_id`, `posted_at` | Mã chứng từ duy nhất |
| `inventory_document_items` | `document_id`, `variant_id`, `quantity` | Số lượng hợp lệ |
| `inventory_movements` | `source_document_id`, `source_item_id`, `quantity_delta`, `created_at` | Có tham chiếu nguồn; chống ghi trùng |

Nên dùng một cơ chế ghi sổ kho duy nhất để mọi luồng nhập, xuất, điều
chỉnh và hoàn nhập đều đi qua cùng quy tắc kiểm soát.

#### Nhóm thanh toán và trả hàng
| Bảng | Trường trọng yếu | Ràng buộc |
| --- | --- | --- |
| `payments` | `order_id`, `amount`, `method`, `status`, `provider_reference` | Chống trùng tham chiếu theo nhà cung cấp |
| `refunds` | `payment_id`, `amount`, `status`, `reason`, `processed_at` | Tổng hoàn thành công không vượt mức cho phép |
| `return_orders` | `original_order_id`, `status`, `reason`, `approved_by` | Liên kết đơn gốc |
| `return_order_items` | `return_order_id`, `order_item_id`, `quantity`, `condition`, `restock_quantity` | Không vượt lượng còn đủ điều kiện trả |

### 5.3. Các ràng buộc cần xử lý ở tầng cơ sở dữ liệu
1. Unique constraint cho mã đơn, SKU, mã chứng từ và mã quyền.
1. Foreign key cho các quan hệ nghiệp vụ cần bảo toàn lịch sử.
1. Check constraint cho số lượng, số tiền và các giá trị không âm phù
  hợp.
1. Transaction cho việc ghi sổ chứng từ và cập nhật số dư kho.
1. Khóa hoặc cập nhật có điều kiện cho các bản ghi tồn kho bị truy cập
  đồng thời.
1. Khóa chống lặp duy nhất cho các giao dịch có thể bị gửi lại.
1. Kiểm soát đồng thời khi tạo hoàn tiền để hai yêu cầu song song không
  hoàn vượt số dư.

Không thể bảo đảm quy tắc "tổng hoàn tiền không vượt tổng đã thu" chỉ
bằng một `CHECK` trên từng dòng. Phải dùng transaction và cơ chế khóa
phù hợp trên tổng số dư hoàn.

## 6. Thiết kế API và hợp đồng tích hợp
### 6.1. Chuẩn hóa API
API sử dụng tiền tố `/api/v1`, JSON và mã lỗi nghiệp vụ thống nhất.

Quy ước:

- `GET`: truy vấn, không làm thay đổi trạng thái nghiệp vụ.
- `POST`: tạo tài nguyên hoặc thực hiện một hành động nghiệp vụ.
- `PATCH`: cập nhật các trường được phép.
- `Idempotency-Key`: chống xử lý trùng đối với thao tác ghi giao dịch.
- `ETag` hoặc `version`: phát hiện cập nhật đồng thời nếu được áp dụng.
- `correlation_id`: truy vết một yêu cầu qua nhiều mô-đun.

### 6.2. Hợp đồng API cốt lõi
| Nhóm | Endpoint | Kết quả nghiệp vụ |
| --- | --- | --- |
| Xác thực | `POST /api/v1/auth/login` | Tạo phiên đăng nhập |
| Sản phẩm | `GET /api/v1/products` | Danh sách theo bộ lọc |
| Sản phẩm | `POST /api/v1/products` | Tạo sản phẩm |
| Sản phẩm | `PATCH /api/v1/products/{id}` | Cập nhật sản phẩm |
| Đơn hàng | `POST /api/v1/orders` | Tạo đơn |
| Đơn hàng | `POST /api/v1/orders/{id}/confirm` | Xác nhận đơn |
| Đơn hàng | `POST /api/v1/orders/{id}/cancel` | Hủy đơn |
| Tồn kho | `GET /api/v1/inventory/balances` | Tra cứu số dư |
| Kho | `POST /api/v1/inventory/documents/{id}/post` | Ghi sổ chứng từ |
| Thanh toán | `POST /api/v1/payments` | Ghi nhận hoặc khởi tạo khoản thanh toán |
| Hoàn tiền | `POST /api/v1/payments/{id}/refunds` | Tạo yêu cầu hoàn |
| Báo cáo | `GET /api/v1/reports/sales` | Báo cáo bán hàng |

### 6.3. Mẫu hợp đồng API tạo đơn hàng
Yêu cầu:

```
POST /api/v1/orders
Content-Type: application/json
Idempotency-Key: order-create-unique-key
```

```
{
  "channel": "ONLINE",
  "customer_id": "customer-uuid",
  "items": [
    {
      "variant_id": "variant-uuid",
      "quantity": "2"
    }
  ],
  "shipping_address": {
    "recipient_name": "Nguyen Van A",
    "phone": "0900000000",
    "address_line": "Dia chi giao hang"
  }
}
```

Đây là ví dụ cấu trúc dữ liệu, không phải dữ liệu cá nhân thực tế.

Xử lý phía máy chủ:

1. Xác thực người gọi và quyền tạo đơn.
1. Kiểm tra khóa chống lặp.
1. Kiểm tra SKU, trạng thái bán và số lượng.
1. Lấy giá hiện hành từ nguồn dữ liệu đáng tin cậy.
1. Tính tiền theo chính sách giá.
1. Kiểm tra hoặc giữ tồn theo quy trình đã chốt.
1. Lưu đơn và các dòng hàng trong transaction phù hợp.
1. Trả về mã đơn và trạng thái thực tế.

Phản hồi thành công:

```
{
  "data": {
    "id": "order-uuid",
    "order_code": "SO-20261017-0001",
    "status": "DRAFT",
    "payment_status": "UNPAID",
    "currency_code": "VND",
    "grand_total": "200000.00"
  },
  "meta": {
    "correlation_id": "request-uuid"
  }
}
```

Mã đơn, tổng tiền và trạng thái trong ví dụ chỉ minh họa. Mã thực tế do
máy chủ sinh; trạng thái phải phản ánh đúng kết quả đã lưu.

### 6.4. Chuẩn phản hồi lỗi
```
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "So luong ton kha dung khong du.",
    "details": {
      "variant_id": "variant-uuid"
    },
    "correlation_id": "request-uuid"
  }
}
```

Không trả về stack trace hoặc thông tin nội bộ. `details` chỉ chứa dữ
liệu cần thiết để người dùng hoặc ứng dụng xử lý lỗi.

### 6.5. Xử lý chống lặp và tính nhất quán
Với mỗi yêu cầu ghi giao dịch có `Idempotency-Key`, hệ thống cần:

1. Lưu khóa cùng loại thao tác, phạm vi người gọi và dấu vân tay yêu cầu.
1. Khi nhận khóa đã tồn tại với cùng nội dung, trả về kết quả đã ghi
  nhận.
1. Khi cùng khóa nhưng nội dung khác, từ chối yêu cầu.
1. Nếu yêu cầu trước vẫn đang xử lý, trả trạng thái phù hợp để máy khách
  truy vấn lại.
1. Lưu kết quả cùng transaction nghiệp vụ khi có thể.

Với thanh toán ngoài hệ thống, cần thêm cơ chế đối soát để xử lý tình
huống nhà cung cấp đã thu tiền nhưng hệ thống chưa nhận được phản hồi.

## 7. Thiết kế phân quyền và bảo mật
### 7.1. Kiểm soát truy cập
Sử dụng RBAC (Role-Based Access Control) làm nền tảng, bổ sung kiểm tra
phạm vi dữ liệu nếu có nhiều cửa hàng hoặc kho.

Mỗi yêu cầu được xử lý theo thứ tự:

1. Xác thực danh tính.
1. Xác định vai trò và quyền hiệu lực.
1. Kiểm tra phạm vi tài nguyên.
1. Kiểm tra điều kiện nghiệp vụ.
1. Thực thi giao dịch.
1. Ghi nhật ký nếu là thao tác cần truy vết.

Ẩn nút trên giao diện không được xem là biện pháp phân quyền đầy đủ.

### 7.2. Ma trận quyền thiết kế
| Hành động | Bán hàng | Kho | Kế toán | Quản lý | Admin |
| --- | --- | --- | --- | --- | --- |
| Xem sản phẩm | Có | Có | Có | Có | Có |
| Tạo đơn | Có | Không | Theo quyền | Có | Có |
| Xác nhận đơn | Theo quyền | Không | Không | Có | Có |
| Ghi sổ nhập/xuất | Không | Có | Không | Theo quyền | Có |
| Điều chỉnh tồn | Không | Theo quyền | Không | Duyệt | Có |
| Ghi nhận tiền thu | Theo quyền | Không | Có | Theo quyền | Có |
| Phê duyệt hoàn tiền | Không | Không | Theo quyền | Có | Có |
| Xem báo cáo | Giới hạn | Tồn kho | Tài chính | Có | Có |
| Quản lý tài khoản | Không | Không | Không | Không mặc định | Có |

Các quyền phải được cấu hình ở cấp hành động, không chỉ ở cấp màn hình.
Với nghiệp vụ tài chính và điều chỉnh tồn, có thể yêu cầu tách người tạo
và người phê duyệt.

### 7.3. Yêu cầu bảo mật kỹ thuật
- Mã hóa đường truyền bằng HTTPS.
- Băm mật khẩu bằng thuật toán chuyên dụng.
- Bảo vệ phiên đăng nhập và cookie theo cấu hình an toàn.
- Chống CSRF khi sử dụng cookie xác thực.
- Kiểm soát XSS, injection và truy cập tài nguyên trái phép.
- Giới hạn tốc độ các endpoint nhạy cảm.
- Không ghi thông tin xác thực hoặc dữ liệu bí mật vào log.
- Ghi nhật ký thay đổi quyền và cấu hình.
- Có chính sách lưu giữ, truy cập và xóa dữ liệu cá nhân theo yêu cầu
  pháp lý.

## 8. Thiết kế giao diện web
### 8.1. Cấu trúc điều hướng
Tổng quan

Doanh số, đơn mới, cảnh báo tồn kho

Sản phẩm

Danh mục, SKU, giá

Bán hàng

Tạo đơn, tra cứu đơn

Kho hàng

Tồn, nhập, xuất, kiểm kê

Thanh toán

Thu tiền, hoàn tiền

Khách hàng

Hồ sơ, lịch sử mua

Báo cáo

Bán hàng, tồn kho

Quản trị hệ thống

Tài khoản, vai trò, cấu hình, nhật ký

Đây là cấu trúc điều hướng logic. Các mục thực tế chỉ hiển thị khi phù
hợp với quyền của người dùng.

### 8.2. Thiết kế màn hình bán hàng
Màn hình bán hàng nên ưu tiên thao tác nhanh:

- Vùng tìm kiếm SKU, tên sản phẩm hoặc mã vạch.
- Danh sách dòng hàng đang chọn.
- Trường nhập số lượng và hiển thị tồn khả dụng.
- Vùng thông tin khách hàng.
- Tóm tắt tiền hàng, giảm giá, thuế và tổng thanh toán.
- Nút lưu nháp, xác nhận đơn và ghi nhận thanh toán theo quyền.

Các hành động tạo đơn, thanh toán và xuất kho phải có trạng thái xử lý
rõ ràng, ngăn nhấn lặp và hiển thị kết quả từ máy chủ.

### 8.3. Thiết kế màn hình sản phẩm linh hoạt
Màn hình sản phẩm gồm ba phần:

1. Thông tin chung: tên, mã, danh mục, mô tả và trạng thái.
1. Thông tin bán hàng: SKU, mã vạch, đơn vị tính, giá.
1. Thuộc tính mở rộng: trường động theo cấu hình và phạm vi sản phẩm/biến
  thể.

Quy tắc xác thực thuộc tính phải được định nghĩa phía máy chủ; giao diện
chỉ sử dụng cấu hình đó để tạo trường nhập liệu. Không dùng dữ liệu động
từ người dùng để tạo truy vấn SQL trực tiếp.

## 9. Thiết kế xử lý lỗi và tính nhất quán giao dịch
### 9.1. Phân loại lỗi
| Nhóm lỗi | Ví dụ | Cách xử lý |
| --- | --- | --- |
| Xác thực đầu vào | Thiếu SKU, số lượng sai | Từ chối trước khi ghi dữ liệu |
| Quy tắc nghiệp vụ | Hủy đơn không hợp lệ | Trả lỗi nghiệp vụ, không đổi trạng thái |
| Xung đột đồng thời | Tồn vừa bị giao dịch khác sử dụng | Tải lại số dư hoặc thử lại có kiểm soát |
| Hạ tầng | Cơ sở dữ liệu mất kết nối | Rollback, ghi log và thông báo lỗi |
| Tích hợp | Cổng thanh toán chưa trả kết quả | Giữ trạng thái chờ, đối soát sau |
| Phân quyền | Người dùng không có quyền | Từ chối và ghi log phù hợp |

### 9.2. Các ranh giới transaction
Các nghiệp vụ cần xác định ranh giới transaction rõ ràng:

- Tạo đơn và dòng hàng.
- Giữ tồn và cập nhật số dư giữ chỗ.
- Ghi sổ chứng từ kho, cập nhật số dư và ghi biến động.
- Ghi nhận thanh toán nội bộ.
- Tạo yêu cầu hoàn tiền và cập nhật số dư có thể hoàn.

Không giữ transaction cơ sở dữ liệu mở trong lúc chờ người dùng hoặc nhà
cung cấp thanh toán bên ngoài phản hồi. Với quy trình tích hợp nhiều
bước, dùng trạng thái trung gian và cơ chế đối soát.

### 9.3. Kiểm soát cập nhật tồn kho đồng thời
Ví dụ, khi xuất hàng, máy chủ phải kiểm tra và cập nhật số dư trong cùng
một transaction hoặc thao tác nguyên tử có điều kiện.

Logic khái quát:

```
BEGIN TRANSACTION

1. Khóa hoặc kiểm tra phiên bản số dư kho.
2. Kiểm tra tồn khả dụng >= số lượng cần xuất.
3. Giảm tồn thực tế theo quy tắc ghi sổ.
4. Ghi inventory_movement tham chiếu chứng từ.
5. Đánh dấu chứng từ đã ghi sổ.

COMMIT
```

Nếu kiểm tra tồn không đạt hoặc bất kỳ bước bắt buộc nào thất bại,
rollback toàn bộ thay đổi. Nếu dùng khóa bi quan, phải có thời gian chờ
và chính sách xử lý deadlock; nếu dùng khóa lạc quan, phải có quy trình
thử lại giới hạn.

## 10. Thiết kế báo cáo và đối soát
### 10.1. Báo cáo bán hàng
Báo cáo phải phân biệt:

- Tổng giá trị hàng.
- Giảm giá.
- Thuế và phí.
- Giá trị đơn sau điều chỉnh.
- Tiền thực thu.
- Tiền đã hoàn.
- Doanh thu thuần theo định nghĩa kế toán/nghiệp vụ được phê duyệt.

Không được dùng duy nhất `grand_total` hoặc tổng tiền thanh toán để đại
diện cho tất cả chỉ tiêu doanh thu.

### 10.2. Báo cáo tồn kho
Nguồn dữ liệu chính gồm số dư tồn và lịch sử biến động kho.

Các đối soát cần có:

- Số tồn hiện tại so với tổng các biến động đã ghi sổ.
- Tồn giữ chỗ so với các yêu cầu giữ hàng còn hiệu lực.
- Số lượng xuất kho theo đơn so với chứng từ xuất.
- Lượng hàng trả nhập lại so với chứng từ hoàn nhập.

Báo cáo cần lọc được theo kho, SKU, thời gian và loại biến động.

### 10.3. Báo cáo thanh toán
Mỗi chỉ tiêu phải truy ngược được về giao dịch nguồn. Các khoản chờ,
thất bại, đã thu và hoàn thành công phải được tách biệt để hỗ trợ đối
soát.

MVP có thể sử dụng truy vấn trực tiếp trên cơ sở dữ liệu giao dịch nếu
tải phù hợp. Khi khối lượng dữ liệu tăng, có thể bổ sung bảng tổng hợp
hoặc kho dữ liệu báo cáo mà không thay đổi nguồn dữ liệu giao dịch gốc.

## 11. Thiết kế kiểm thử và tiêu chí nghiệm thu kỹ thuật
### 11.1. Chiến lược kiểm thử
| Cấp kiểm thử | Phạm vi | Mục tiêu |
| --- | --- | --- |
| Unit test | Quy tắc tính giá, trạng thái, phân quyền | Kiểm tra logic đơn lẻ |
| Integration test | Đơn hàng--kho--thanh toán--CSDL | Kiểm tra tích hợp và transaction |
| API test | Endpoint, mã lỗi, xác thực | Kiểm tra hợp đồng API |
| E2E test | Bán hàng tại cửa hàng và trực tuyến | Kiểm tra quy trình đầu cuối |
| Security test | RBAC, truy cập trái phép, dữ liệu đầu vào | Phát hiện lỗ hổng bảo mật |
| Concurrency test | Xuất kho, đặt hàng, hoàn tiền đồng thời | Kiểm tra tranh chấp và chống trùng |
| Recovery test | Sao lưu, phục hồi và đối soát | Kiểm tra khả năng khôi phục |

### 11.2. Các kịch bản kiểm thử kỹ thuật bắt buộc
### TC-01 — Hai đơn cùng mua lượng tồn cuối
Đầu vào: tồn khả dụng bằng 1, hai yêu cầu đồng thời mỗi yêu cầu mua 1
đơn vị.

Kết quả mong đợi: hệ thống không xác nhận vượt quá lượng tồn khả dụng
theo chính sách; mọi kết quả từ chối có thể truy vết.

### TC-02 — Gửi lặp yêu cầu tạo đơn
Đầu vào: cùng khóa chống lặp và cùng nội dung được gửi nhiều lần.

Kết quả mong đợi: chỉ một đơn được tạo; các lần gọi lại nhận kết quả
nhất quán.

### TC-03 — Lỗi giữa lúc ghi sổ kho
Đầu vào: giả lập lỗi sau khi cập nhật số dư nhưng trước khi hoàn tất ghi
lịch sử.

Kết quả mong đợi: transaction rollback toàn bộ hoặc quy trình phục hồi
được kiểm soát; không tồn tại số dư đã đổi nhưng không có biến động
tương ứng.

### TC-04 — Hoàn tiền đồng thời
Đầu vào: hai yêu cầu hoàn tiền cùng sử dụng một khoản thu và tổng yêu
cầu vượt mức được phép hoàn.

Kết quả mong đợi: tổng tiền hoàn thành công không vượt mức được phép;
yêu cầu xung đột bị từ chối hoặc chờ xử lý.

### TC-05 — Truy cập API không có quyền
Đầu vào: người dùng bán hàng gọi trực tiếp API điều chỉnh tồn.

Kết quả mong đợi: máy chủ từ chối yêu cầu; dữ liệu kho không thay đổi.

### 11.3. Điều kiện nghiệm thu kỹ thuật
- Các quy tắc nghiệp vụ trọng yếu có kiểm thử tự động.
- Không có lỗi nghiêm trọng trong quy trình tạo đơn, ghi sổ kho và thanh
  toán.
- Không phát sinh bản ghi giao dịch trùng khi gửi lại yêu cầu theo cùng
  quy tắc chống lặp.
- Các ràng buộc dữ liệu và kiểm soát phân quyền được kiểm chứng.
- Kết quả báo cáo đối soát được với dữ liệu giao dịch.
- Sao lưu và phục hồi đã được thử nghiệm trong môi trường kiểm thử.
- Tài liệu API, sơ đồ dữ liệu và hướng dẫn triển khai khớp với phiên bản
  phần mềm bàn giao.

Các chỉ tiêu hiệu năng cụ thể cần được xác lập sau khi biết quy mô tải
dự kiến.

## 12. Thiết kế triển khai và vận hành
### 12.1. Môi trường triển khai
Đề xuất tối thiểu ba môi trường:

| Môi trường | Mục đích |
| --- | --- |
| Development | Phát triển tính năng và kiểm thử cục bộ |
| Staging / UAT | Kiểm thử tích hợp, nghiệm thu nghiệp vụ |
| Production | Vận hành chính thức |

Dữ liệu khách hàng và giao dịch thật không nên được sao chép tùy tiện
sang môi trường phát triển. Nếu cần dữ liệu kiểm thử, phải sử dụng dữ
liệu giả lập hoặc dữ liệu đã được xử lý phù hợp.

### 12.2. Quy trình phát hành
1. Quản lý mã nguồn

Code review và kiểm tra chất lượng.

2. CI --- Kiểm thử tự động

Unit test, integration test, kiểm tra bảo mật cơ bản.

3. Staging / UAT

Kiểm thử quy trình và phê duyệt phát hành.

4. Triển khai Production

Áp dụng migration có kiểm soát và phát hành phiên bản.

5. Theo dõi và phục hồi

Giám sát lỗi, kiểm tra sức khỏe và kế hoạch rollback.

### 12.3. Sao lưu và phục hồi
Thiết kế vận hành phải xác định:

- Lịch sao lưu cơ sở dữ liệu.
- Chính sách lưu giữ bản sao.
- Vị trí lưu trữ độc lập với môi trường vận hành chính.
- Cơ chế mã hóa và kiểm soát truy cập.
- Quy trình phục hồi theo từng bước.
- Cách đối soát giao dịch sau phục hồi.
- Chỉ tiêu RPO và RTO được chủ dự án phê duyệt.

Sao lưu không được xem là hoàn thành chỉ vì tác vụ chạy thành công; phải
kiểm tra khả năng phục hồi dữ liệu thực tế.

### 12.4. Giám sát hệ thống
Các chỉ số cần theo dõi:

- Tỷ lệ lỗi API và thời gian phản hồi.
- Tình trạng kết nối và hiệu năng cơ sở dữ liệu.
- Lỗi ghi sổ kho và xung đột tồn kho.
- Giao dịch thanh toán chờ xử lý quá lâu.
- Tỷ lệ lỗi tác vụ nền và webhook.
- Dung lượng lưu trữ và tình trạng sao lưu.
- Số lần đăng nhập thất bại bất thường.

Các cảnh báo và ngưỡng kích hoạt phải được cấu hình theo môi trường vận
hành thực tế.

## 13. Ma trận truy vết yêu cầu
Ma trận dưới đây liên kết SRS, mô-đun thiết kế và kiểm thử để bảo đảm
không bỏ sót yêu cầu.

| Yêu cầu SRS | Mô-đun thiết kế | Nhóm kiểm thử |
| --- | --- | --- |
| AUTH-01--03 | IAM | Xác thực, RBAC, bảo mật |
| PRD-01--04 | Catalog, Pricing | SKU, thuộc tính, lịch sử giá |
| CAT-01--02 | Catalog | Danh mục, đơn vị tính |
| CUS-01--02 | Customer | Hồ sơ và lịch sử khách hàng |
| ORD-01--05 | Sales | Tạo đơn, xác nhận, hủy, chống trùng |
| INV-01--05 | Inventory | Nhập, xuất, kiểm kê, đồng thời |
| PAY-01--02 | Payment | Thu tiền, hoàn tiền, đối soát |
| RMA-01 | Returns | Trả hàng, điều kiện nhập lại kho |
| RPT-01--04 | Reporting | Tính toán và đối soát báo cáo |
| AUD-01 | Audit | Truy vết thay đổi |
| CFG-01 | Configuration | Cấu hình và kiểm soát quyền |

Mỗi yêu cầu chi tiết cần có mã ổn định. Khi thay đổi yêu cầu, phải đánh
giá ảnh hưởng đến mô-đun, bảng dữ liệu, API và ca kiểm thử liên quan.

## 14. Các quyết định thiết kế còn mở
Những nội dung sau chưa được xác định trong phạm vi nền tảng. Thiết kế
cần giữ khả năng mở rộng, nhưng không nên xây dựng các tính năng phức
tạp trước khi có nhu cầu thực tế.

DAD-01 --- Loại sản phẩmMô hình Product--Variant và thuộc tính cấu
hình.Ảnh hưởng thiết kế: Ảnh hưởng thuộc tính, đơn vị tính, mã SKU và
quy trình kiểm kê.

DAD-02 --- Số cửa hàng và khoThiết kế hỗ trợ nhiều kho; có thể vận hành
một kho.

DAD-03 --- Phương thức thanh toánTiền mặt và chuyển khoản thủ công trong
MVP.

DAD-04 --- Chính sách giữ tồnGiữ hàng tại bước xác nhận đơn; quy tắc hết
hạn cần chốt.

DAD-05 --- Thuế và giảm giáCấu hình được chính sách; không tự giả định
thuế suất.

DAD-06 --- Công nghệChưa chốt frontend, backend và hệ quản trị CSDL.

DAD-07 --- Quy mô tảiChưa có chỉ tiêu người dùng đồng thời và giao dịch.

DAD-08 --- Vận chuyển trực tuyếnChưa tích hợp hãng vận chuyển cho đến
khi được phê duyệt.

## 15. Kết luận và bàn giao
Tài liệu Phân tích & Thiết kế chi tiết phiên bản 1.0 xác định kiến trúc
phân mô-đun, trách nhiệm từng phân hệ, luồng bán hàng, mô hình dữ liệu,
API, bảo mật, xử lý đồng thời, báo cáo và vận hành cho hệ thống bán hàng
web đa kênh.

Đề xuất trình tự tiếp theo:

1. Phê duyệt kiến trúc và các quyết định còn mở.
1. Hoàn thiện ERD vật lý, kiểu dữ liệu, chỉ mục và ràng buộc.
1. Chốt OpenAPI cho các endpoint MVP.
1. Thiết kế wireframe và quy tắc tương tác từng màn hình.
1. Lập kế hoạch phát triển và bộ kiểm thử liên kết với SRS.
1. Triển khai bản thử nghiệm, nghiệm thu rồi mới phát hành chính thức.

Trạng thái: tài liệu thiết kế mức chi tiết nghiệp vụ và kiến trúc, có
thể dùng làm đầu vào cho thiết kế kỹ thuật và lập kế hoạch phát triển.
Trước khi triển khai, cần hoàn thiện ERD vật lý, hợp đồng API đầy đủ và
các quyết định còn mở; chưa nên xem đây là đặc tả triển khai cuối cùng.

## 16. Baseline kỹ thuật đã triển khai

Baseline MVP hiện dùng React, TypeScript và Vite ở giao diện; Supabase
PostgreSQL, RLS và Edge Functions cho nghiệp vụ phía máy chủ. Các
migrations bổ sung thành viên cửa hàng, khách hàng, giá SKU, thanh toán
thủ công, quyền đọc theo vai trò và các RPC bảo vệ các thay đổi quan
trọng.

Ranh giới giao dịch hiện được thực hiện như sau:

- Tạo đơn, chụp giá từ CSDL, giữ tồn và ghi nhận khoản thu ban đầu cùng
  trong một transaction; khóa idempotency ràng buộc với nội dung yêu
cầu.  
- Nhập/điều chỉnh kho lưu lý do, cập nhật số dư và sổ bất biến cùng
transaction; giữ khóa hàng theo thứ tự ổn định khi hoàn tất/hủy đơn.  
- Thanh toán bổ sung kiểm tra số dư phải thu và chống xử lý trùng.
- Hoàn tất đơn trừ tồn vật lý và tiêu thụ reservation; hủy đơn đã xác
nhận nhả reservation.  
- Báo cáo tổng hợp thực thi trong CSDL; kiểm tra quyền được thực hiện
  trước khi trả số liệu.

Khởi tạo chủ cửa hàng đầu tiên là thao tác quản trị tin cậy trên
`store_memberships`; sau đó chủ cửa hàng có thể gán vai trò cho người
dùng đã đăng ký. Cổng thanh toán ngoài, đổi trả, storefront trực tuyến,
đa chi nhánh và sao lưu/phục hồi tự động chưa nằm trong phạm vi baseline
đã triển khai.
