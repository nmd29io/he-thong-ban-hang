# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
# Hệ thống bán hàng đa kênh
Software Requirements Specification · Phiên bản 1.1

Bản dự thảo để phát triển MVP

Kênh bán hàng Cửa hàng + Trực tuyến

Nền tảng Web application

Quản lý kho Bắt buộc

Phạm vi MVP --- chức năng cốt lõi

Quy mô triển khai Chưa xác định

Ngành hàng Chưa xác định, thiết kế mở rộng

Trạng thái: Chưa phê duyệt chính thức. Những quyết định chưa được cung
cấp sẽ được ghi rõ là giả định hoặc cần xác nhận, không tự coi là yêu
cầu đã thống nhất.

## 1. Mục đích và phạm vi
### 1.1. Mục đích
Tài liệu này định nghĩa các yêu cầu nghiệp vụ và kỹ thuật cần thiết để
đội ngũ thiết kế, lập trình, kiểm thử và nghiệm thu một hệ thống bán
hàng chạy trên web, phục vụ đồng thời:

- Bán hàng trực tiếp tại cửa hàng.

- Tiếp nhận và xử lý đơn hàng trực tuyến.

- Quản lý sản phẩm, khách hàng, giá bán và khuyến mại cơ bản.

- Quản lý nhập, xuất, tồn kho và biến động hàng hóa.

- Quản lý thanh toán, hủy đơn và trả hàng ở mức MVP.

- Cung cấp báo cáo kinh doanh cơ bản.

- Kiểm soát quyền truy cập và truy vết các thao tác quan trọng.

### 1.2. Nguyên tắc thiết kế

1. Chưa cố định loại sản phẩm: không giả định sản phẩm thuộc ngành hàng
cụ thể.  

1. Tách sản phẩm khỏi biến thể: sản phẩm có thể không có biến thể hoặc có
nhiều biến thể.  

1. Tách trạng thái đơn hàng, giao hàng và thanh toán: ba vòng đời này
không được gộp thành một trạng thái duy nhất.  

1. Tồn kho có lịch sử: mọi biến động kho đều phải truy nguyên được.

1. Giao dịch nhất quán: tạo đơn, xác nhận đơn, thanh toán và xuất kho
  phải có quy tắc xử lý lỗi, chống ghi nhận trùng và kiểm soát đồng
thời.  

1. Ưu tiên MVP: chỉ triển khai những chức năng cần thiết để vận hành,
  nhưng giữ cấu trúc cho phép mở rộng sau này.

### 1.3. Phạm vi MVP

| Phân hệ | Trong phạm vi MVP |
| --- | --- |
| Tài khoản và phân quyền | Đăng nhập, vai trò, quyền thao tác |
| Sản phẩm | Danh mục, SKU, thuộc tính cơ bản, giá |
| Khách hàng | Hồ sơ cơ bản, lịch sử mua hàng |
| Bán hàng | Giỏ hàng, tạo đơn, xác nhận, hủy |
| Kho | Nhập, xuất, điều chỉnh, kiểm kê cơ bản |
| Thanh toán | Ghi nhận tiền mặt/chuyển khoản, thanh toán một phần |
| Đổi trả | Ghi nhận trả hàng, hoàn kho và hoàn tiền theo điều kiện |
| Báo cáo | Doanh thu, đơn hàng, tồn kho |
| Vận hành | Nhật ký, sao lưu, cấu hình cơ bản |

Các chức năng chưa bắt buộc trong MVP: kế toán tổng hợp, quản lý nhân
sự, chương trình tích điểm, marketplace, tối ưu vận chuyển, quản lý
lô/hạn sử dụng chuyên sâu, IMEI/sê-ri, đa tiền tệ và tích hợp nhiều cổng
thanh toán. Các nội dung này chỉ được bổ sung khi nghiệp vụ thực tế yêu
cầu.

## 2. Định nghĩa và thuật ngữ
| Thuật ngữ | Định nghĩa |
| --- | --- |
| SKU | Mã định danh một mặt hàng có thể bán hoặc quản lý tồn |
| Sản phẩm | Đối tượng hàng hóa ở cấp khái niệm |
| Biến thể | Phiên bản cụ thể của sản phẩm, có thể có SKU và tồn kho riêng |
| Đơn hàng | Giao dịch ghi nhận yêu cầu mua hàng |
| Phiếu nhập | Chứng từ làm tăng tồn kho |
| Phiếu xuất | Chứng từ làm giảm tồn kho |
| Tồn thực tế | Số lượng được ghi nhận đang có trong kho |
| Tồn giữ chỗ | Số lượng dành cho các đơn chưa giải phóng hoặc chưa hoàn tất theo chính sách |
| Tồn khả dụng | Tồn thực tế trừ số lượng giữ chỗ |
| Idempotency | Cơ chế bảo đảm một yêu cầu gửi lặp không tạo ra giao dịch trùng |
| RBAC | Phân quyền dựa trên vai trò người dùng |
| Audit log | Nhật ký truy vết các thao tác quan trọng |

## 3. Vai trò và tác nhân
| Tác nhân | Mô tả |
| --- | --- |
| Quản trị viên | Quản lý người dùng, vai trò và cấu hình |
| Quản lý | Theo dõi hoạt động kinh doanh, duyệt thao tác vượt quyền |
| Nhân viên bán hàng | Lập đơn, quản lý thông tin khách hàng, tiếp nhận thanh toán |
| Nhân viên kho | Nhập, xuất, kiểm kê và điều chỉnh tồn |
| Kế toán | Đối soát thanh toán, theo dõi công nợ ở mức cơ bản |
| Khách hàng trực tuyến | Duyệt sản phẩm và tạo đơn qua giao diện công khai |
| Hệ thống | Tự động kiểm tra điều kiện, cập nhật trạng thái và ghi nhật ký |

Tài khoản khách hàng trực tuyến là tùy chọn: MVP có thể cho phép đặt
hàng không cần đăng ký. Việc bắt buộc đăng nhập cần được xác nhận trong
giai đoạn chốt nghiệp vụ.

## 4. Yêu cầu chức năng chi tiết
Mỗi yêu cầu có mã định danh để liên kết giữa đặc tả, thiết kế, lập trình
và kiểm thử.

Mức ưu tiên:

- P0: bắt buộc để MVP vận hành.

- P1: cần thiết nếu nghiệp vụ tương ứng được đưa vào phạm vi phát hành
đầu tiên.  

- P2: mở rộng sau MVP.

### 4.1. Phân hệ AUTH — Xác thực và quản lý tài khoản
#### AUTH-01 — Đăng nhập

- Ưu tiên: P0.

- Tác nhân: Nhân viên, quản lý, quản trị viên.

- Tiền điều kiện: Tài khoản tồn tại và chưa bị khóa.

Luồng chính:

1. Người dùng nhập tên đăng nhập hoặc email và mật khẩu.
1. Hệ thống kiểm tra thông tin xác thực.
1. Hệ thống kiểm tra trạng thái tài khoản.
1. Hệ thống tạo phiên đăng nhập an toàn.
1. Hệ thống chuyển người dùng đến giao diện theo quyền được cấp.

Ngoại lệ:

- Thông tin đăng nhập sai: thông báo lỗi chung, không tiết lộ tài khoản
có tồn tại hay không.  
- Tài khoản bị khóa hoặc vô hiệu hóa: từ chối đăng nhập.
- Vượt ngưỡng thử sai: áp dụng giới hạn thử đăng nhập và thời gian chờ
theo cấu hình.  
- Lỗi máy chủ: không tạo phiên đăng nhập một phần.

Quy tắc: mật khẩu không được lưu dạng văn bản thuần; phiên đăng nhập
phải có cơ chế hết hạn và thu hồi.

#### AUTH-02 — Quản lý tài khoản
- Ưu tiên: P0.

Luồng chính: quản trị viên tạo tài khoản, cấp vai trò, kích hoạt tài
khoản và gửi thông tin hướng dẫn đăng nhập qua kênh phù hợp.

Ngoại lệ: email hoặc tên đăng nhập bị trùng theo quy tắc hệ thống; vai
trò không hợp lệ; người thao tác không có quyền quản trị.

Quy tắc:

- Chỉ người được cấp quyền mới được tạo, khóa hoặc phân quyền tài khoản.
  

- Không cho phép xóa tài khoản đang cần lưu lại trong lịch sử giao dịch;
ưu tiên vô hiệu hóa.  

- Mọi thay đổi vai trò phải được ghi vào nhật ký.

#### AUTH-03 — Kiểm soát quyền truy cập

- Ưu tiên: P0.

Hệ thống phải kiểm tra quyền trên máy chủ cho từng hành động, bao gồm
đọc, tạo, sửa, xác nhận, hủy và phê duyệt.

Ngoại lệ: yêu cầu không có quyền phải bị từ chối với mã lỗi phù hợp,
không làm thay đổi dữ liệu.

### 4.2. Phân hệ PRD — Quản lý sản phẩm
#### PRD-01 — Tạo sản phẩm
- Ưu tiên: P0.
- Tác nhân: Quản trị viên, quản lý hoặc nhân viên được cấp quyền.
- Tiền điều kiện: Người dùng đã đăng nhập; danh mục và đơn vị tính cần
  thiết đã tồn tại.

Luồng chính:

1. Người dùng mở chức năng tạo sản phẩm.
1. Nhập tên, SKU hoặc cấu hình biến thể, danh mục, đơn vị tính, giá và
trạng thái.  
1. Hệ thống kiểm tra dữ liệu bắt buộc và tính duy nhất của SKU.
1. Hệ thống lưu sản phẩm.
1. Hệ thống trả về mã sản phẩm và thông tin vừa tạo.

Ngoại lệ:

- Thiếu tên hoặc trường bắt buộc: từ chối lưu.
- SKU trùng: thông báo trường bị trùng.
- Giá âm hoặc dữ liệu sai định dạng: từ chối.
- Danh mục không tồn tại: yêu cầu chọn lại.
- Gửi yêu cầu lặp: không được tự động tạo bản ghi trùng khi sử dụng cùng
  khóa chống lặp.

Quy tắc:

- Mã nội bộ không được phụ thuộc vào tên sản phẩm.

- SKU phải duy nhất trong phạm vi quản lý đã thống nhất.

- Sản phẩm có biến thể phải xác định cấp quản lý tồn và giá.

- Tạo sản phẩm không tự động tạo tồn kho ban đầu; tồn ban đầu phải qua
  chứng từ nhập hoặc quy trình chuyển đổi dữ liệu được kiểm soát.

#### PRD-02 — Cập nhật sản phẩm

- Ưu tiên: P0.

Luồng chính: tìm sản phẩm → mở chi tiết → thay đổi trường được phép →
kiểm tra phiên bản dữ liệu → lưu → ghi nhật ký thay đổi quan trọng.

Ngoại lệ:

- Sản phẩm đã bị ngừng kinh doanh: chỉ cho sửa các trường được phép.
- Có người khác cập nhật đồng thời: trả lỗi xung đột và yêu cầu tải lại.
  
- SKU mới bị trùng: từ chối cập nhật.

Quy tắc: thay đổi tên hoặc giá sản phẩm không được làm thay đổi các dòng
hàng của đơn đã ghi nhận trước đó.

#### PRD-03 — Tìm kiếm và phân loại
- Ưu tiên: P0.

Hỗ trợ tìm theo tên, SKU, mã vạch, danh mục và trạng thái; có phân
trang, sắp xếp và bộ lọc.

Ngoại lệ: tham số phân trang không hợp lệ hoặc vượt giới hạn cho phép
thì trả lỗi xác thực.

#### PRD-04 — Biến thể và thuộc tính mở rộng
- Ưu tiên: P0 cho mô hình dữ liệu; giao diện quản lý biến thể đầy đủ có
thể triển khai theo phạm vi được chốt.

Thiết kế phải hỗ trợ:

- Sản phẩm đơn không có biến thể riêng.
- Sản phẩm có nhiều biến thể, mỗi biến thể có SKU riêng.
- Thuộc tính có cấu trúc như màu sắc hoặc kích thước.
- Thuộc tính bổ sung được cấu hình mà không phải thay đổi cấu trúc bảng
  mỗi khi thêm ngành hàng.

Không bắt buộc mọi sản phẩm phải có màu sắc, kích thước, hạn sử dụng
hoặc số sê-ri.

### 4.3. Phân hệ CAT — Danh mục và đơn vị tính
#### CAT-01 — Quản lý danh mục
- Ưu tiên: P0.

Luồng chính: tạo danh mục → nhập tên và danh mục cha nếu có → kiểm tra →
lưu.

Ngoại lệ: danh mục cha không tồn tại; phát hiện vòng lặp phân cấp; danh
mục đang được sử dụng bị yêu cầu xóa.

Quy tắc: danh mục đã có sản phẩm liên kết nên được ngừng sử dụng thay vì
xóa vật lý.

#### CAT-02 — Quản lý đơn vị tính
- Ưu tiên: P0.

Mỗi sản phẩm phải có đơn vị tính cơ sở, ví dụ "cái", "hộp" hoặc "kg",
theo cấu hình của doanh nghiệp.

MVP có thể dùng một đơn vị cơ sở cho mỗi SKU. Quy đổi nhiều đơn vị, như
thùng sang hộp, chỉ triển khai khi được xác nhận là cần thiết.

### 4.4. Phân hệ CUS — Khách hàng
#### CUS-01 — Tạo và cập nhật khách hàng
- Ưu tiên: P0.

Luồng chính: nhập tên và thông tin liên hệ → kiểm tra dữ liệu → phát
hiện bản ghi có khả năng trùng → xác nhận lưu.

Ngoại lệ: dữ liệu không hợp lệ; người dùng không có quyền; phát hiện
khách hàng trùng cần xử lý theo chính sách.

Quy tắc:

- Cho phép khách mua lẻ không cần hồ sơ đầy đủ.

- Không tự động gộp hồ sơ chỉ vì trùng tên hoặc số điện thoại.

- Thông tin cá nhân chỉ hiển thị cho vai trò có quyền.

#### CUS-02 — Tra cứu lịch sử giao dịch

- Ưu tiên: P0.

Hiển thị danh sách đơn, tổng giá trị, trạng thái thanh toán và lịch sử
trả hàng trong phạm vi quyền truy cập.

Không cho phép nhân viên sửa lịch sử giao dịch bằng cách cập nhật trực
tiếp hồ sơ khách hàng.

### 4.5. Phân hệ ORD — Đơn hàng đa kênh
#### ORD-01 — Tạo đơn hàng tại cửa hàng
- Ưu tiên: P0.
- Tác nhân: Nhân viên bán hàng.

Luồng chính:

1. Nhân viên chọn sản phẩm hoặc quét mã vạch.
1. Nhập số lượng và áp dụng mức giảm giá được phép.
1. Chọn khách hàng hoặc khách mua lẻ.
1. Hệ thống tính tiền và kiểm tra giá trị hợp lệ.
1. Nhân viên xác nhận thông tin đơn.
1. Hệ thống tạo đơn hàng và trả mã đơn.

Ngoại lệ:

- SKU không tồn tại hoặc đã ngừng bán.
- Số lượng không hợp lệ.
- Giá hoặc chiết khấu vượt quyền.
- Tồn kho không đủ theo chính sách.
- Lỗi cơ sở dữ liệu trong lúc tạo đơn.

Quy tắc:

- Không tạo đơn có tổng tiền không hợp lệ.

- Đơn hàng phải lưu đơn giá, chiết khấu và thông tin hàng tại thời điểm
giao dịch.  

- Việc giữ hoặc trừ tồn phải theo một chính sách thống nhất, không được
  vừa giữ hàng vừa trừ tồn hai lần.

#### ORD-02 — Tạo đơn trực tuyến

- Ưu tiên: P0.

Luồng chính:

1. Khách hàng xem sản phẩm.
1. Thêm sản phẩm vào giỏ.
1. Nhập thông tin nhận hàng và thông tin liên hệ.
1. Hệ thống xác thực giỏ hàng, giá, số lượng và khả năng đáp ứng tồn kho.
  
1. Khách xác nhận đặt hàng.
1. Hệ thống tạo mã đơn và trả kết quả.

Ngoại lệ:

- Giá thay đổi trước khi xác nhận: hiển thị giá mới và yêu cầu xác nhận
lại nếu tổng tiền thay đổi đáng kể.  
- Hết hàng: thông báo mặt hàng không đủ số lượng.
- Thông tin nhận hàng thiếu: yêu cầu bổ sung.
- Gửi yêu cầu nhiều lần: không tạo nhiều đơn từ cùng một thao tác đặt
  hàng có cùng khóa chống lặp.

Quy tắc:

- Không tin cậy giá hoặc tổng tiền do trình duyệt gửi lên; máy chủ phải
tự tính.  

- Chỉ các sản phẩm đang được phép bán mới được đặt.

- Không mặc định đơn trực tuyến đã thanh toán chỉ vì đơn được tạo thành
  công.

#### ORD-03 — Xác nhận đơn

- Ưu tiên: P0.

Luồng chính: kiểm tra trạng thái hiện tại → kiểm tra chi tiết và giá →
kiểm tra hoặc giữ tồn theo chính sách → chuyển sang trạng thái đã xác
nhận → ghi nhật ký.

Ngoại lệ:

- Đơn đã hủy hoặc đã xác nhận.
- Tồn kho không còn đủ.
- Dữ liệu đơn đã thay đổi trong quá trình xử lý.
- Yêu cầu xác nhận bị gửi lặp.

Quy tắc: chuyển trạng thái phải tuân theo máy trạng thái hợp lệ. Việc
xác nhận đơn và giữ tồn phải nhất quán về mặt giao dịch.

#### ORD-04 — Hủy đơn
- Ưu tiên: P0.

Luồng chính: kiểm tra điều kiện hủy → xác định các khoản giữ tồn, xuất
kho và thanh toán liên quan → giải phóng tồn hoặc tạo nghiệp vụ hoàn
nhập → xử lý khoản đã thu theo quy trình hoàn tiền → ghi nhận lý do hủy.

Ngoại lệ:

- Đơn đã ở trạng thái không cho phép hủy trực tiếp.
- Hàng đã giao hoặc thanh toán đã được xử lý bởi bên ngoài.
- Hoàn nhập kho thất bại.
- Đơn có giao dịch hoàn tiền đang chờ xử lý.

Quy tắc: không xóa đơn đã phát sinh giao dịch. Nếu đã xuất kho, phải có
chứng từ hoàn nhập; nếu đã thu tiền, phải có nghiệp vụ hoàn tiền hoặc
ghi nhận khoản phải hoàn.

#### ORD-05 — Tra cứu và theo dõi đơn
- Ưu tiên: P0.

Tìm theo mã đơn, khách hàng, kênh bán, thời gian và trạng thái. Chi tiết
đơn hiển thị các mốc trạng thái và các giao dịch liên quan.

### 4.6. Phân hệ INV — Quản lý tồn kho
#### INV-01 — Nhập kho
- Ưu tiên: P0.

Luồng chính:

1. Nhân viên kho tạo phiếu nhập.
1. Chọn kho và các SKU, nhập số lượng.
1. Chọn nguồn nhập hoặc lý do nhập.
1. Hệ thống xác thực dữ liệu.
1. Người có quyền xác nhận ghi sổ.
1. Hệ thống tăng tồn và ghi lịch sử biến động.

Ngoại lệ: kho không tồn tại; SKU không hợp lệ; số lượng không hợp lệ;
phiếu đã ghi sổ; lỗi cập nhật tồn.

Quy tắc: chỉ phiếu nhập hợp lệ đã ghi sổ mới được làm tăng tồn chính
thức. Nếu phiếu đã ghi sổ cần sửa, phải tạo nghiệp vụ đảo hoặc điều
chỉnh.

#### INV-02 — Xuất kho
- Ưu tiên: P0.

Luồng chính: tạo phiếu xuất → chọn kho và SKU → kiểm tra tồn khả dụng →
xác nhận → ghi sổ → giảm tồn.

Ngoại lệ:

- Tồn không đủ.
- Có giao dịch khác đã sử dụng số lượng đó.
- Phiếu bị ghi sổ trước đó.
- Người dùng không có quyền xuất hàng.

Quy tắc: việc kiểm tra và cập nhật tồn phải được bảo vệ khỏi tình trạng
hai giao dịch cùng đọc một số tồn rồi đồng thời xuất vượt mức.

#### INV-03 — Điều chỉnh tồn
- Ưu tiên: P0.

Bắt buộc ghi nhận kho, SKU, số lượng chênh lệch, lý do, người tạo và
người phê duyệt nếu cần.

Ngoại lệ: không có lý do; số liệu kiểm kê không hợp lệ; điều chỉnh làm
tồn âm trong chế độ cấm tồn âm.

#### INV-04 — Kiểm kê
- Ưu tiên: P0 ở mức kiểm kê cơ bản.

Luồng chính: tạo đợt kiểm kê → chốt phạm vi → nhập số lượng thực tế → so
sánh với số liệu hệ thống tại thời điểm kiểm kê → duyệt chênh lệch → tạo
chứng từ điều chỉnh.

Không được âm thầm ghi đè số tồn hiện tại bằng kết quả kiểm kê. Phải lưu
chênh lệch và chứng từ xử lý.

#### INV-05 — Tra cứu tồn kho
- Ưu tiên: P0.

Cho phép lọc theo kho, SKU, sản phẩm và trạng thái tồn. Phải phân biệt
tồn thực tế, tồn giữ chỗ và tồn khả dụng.

### 4.7. Phân hệ PAY — Thanh toán
#### PAY-01 — Ghi nhận thanh toán
- Ưu tiên: P0.

Luồng chính:

1. Chọn đơn hàng.
1. Nhập số tiền, phương thức và mã tham chiếu nếu có.
1. Hệ thống kiểm tra số tiền còn phải thu.
1. Ghi nhận giao dịch với trạng thái phù hợp.
1. Cập nhật trạng thái thanh toán của đơn.

Ngoại lệ:

- Số tiền âm hoặc bằng 0 khi không được phép.
- Thanh toán vượt số dư phải thu và chính sách không cho phép.
- Giao dịch trùng mã tham chiếu.
- Thanh toán điện tử chưa được nhà cung cấp xác nhận.
- Lỗi xảy ra sau khi nhà cung cấp đã thu tiền nhưng hệ thống chưa nhận
  kết quả.

Quy tắc:

- Phân biệt `PENDING`, `SUCCEEDED`, `FAILED` và `REFUNDED` hoặc các
trạng thái tương đương.  

- Không ghi nhận tiền đã thu thành công chỉ dựa trên dữ liệu từ trình
duyệt.  

- Với tiền mặt, người có quyền có thể xác nhận thu theo quy trình nội
bộ.  

- Với chuyển khoản tự đối soát, MVP có thể cho phép ghi nhận thủ công;
  tích hợp ngân hàng tự động chưa bắt buộc.

#### PAY-02 — Hoàn tiền

- Ưu tiên: P0 cho trường hợp hoàn tiền thủ công.

Luồng chính: xác định giao dịch gốc → kiểm tra số tiền còn được hoàn →
nhập số tiền và lý do → phê duyệt theo quyền → tạo bản ghi hoàn tiền →
cập nhật trạng thái giao dịch và đơn.

Ngoại lệ: vượt số tiền còn được hoàn; giao dịch gốc không hợp lệ; yêu
cầu hoàn trùng; phương thức thanh toán không hỗ trợ hoàn tự động.

Quy tắc: tổng tiền hoàn thành công không được vượt số tiền thực thu đủ
điều kiện hoàn. Hoàn tiền qua nhà cung cấp thanh toán phải xác nhận kết
quả từ nhà cung cấp trước khi đánh dấu hoàn thành.

### 4.8. Phân hệ RMA — Trả hàng
#### RMA-01 — Tạo yêu cầu trả hàng
- Ưu tiên: P1 nếu chính sách đổi trả nằm trong MVP.

Luồng chính: chọn đơn gốc → chọn dòng hàng và số lượng → nhập lý do →
xác định tình trạng hàng → duyệt → nhập lại kho hoặc đưa vào khu vực
hàng lỗi → tạo hoàn tiền nếu được duyệt.

Ngoại lệ: số lượng trả vượt lượng còn được trả; đơn không tồn tại; yêu
cầu không đáp ứng chính sách; hoàn tiền đã vượt mức cho phép.

Quy tắc: việc nhập lại kho và hoàn tiền là hai nghiệp vụ liên quan nhưng
không đồng nhất. Hàng hỏng không được cộng vào tồn bán được nếu chưa đủ
điều kiện.

### 4.9. Phân hệ RPT — Báo cáo
#### RPT-01 — Báo cáo bán hàng
- Ưu tiên: P0.

Hiển thị số đơn, tổng giá trị hàng, giảm giá, tiền hoàn và doanh thu
thuần theo khoảng thời gian.

Quy tắc: doanh thu thuần phải có định nghĩa thống nhất; không lấy tiền
thực thu làm đại diện cho doanh thu nếu có đơn chưa thu hoặc thu trước.

#### RPT-02 — Báo cáo tồn kho
- Ưu tiên: P0.

Hiển thị tồn theo SKU và kho, tồn thấp và lịch sử biến động.

Quy tắc: số liệu tồn báo cáo phải đối soát được với lịch sử biến động
kho.

#### RPT-03 — Báo cáo thanh toán
- Ưu tiên: P0.

Hiển thị số tiền đã thu, đang chờ, thất bại và đã hoàn theo phương thức,
thời gian và trạng thái.

#### RPT-04 — Xuất dữ liệu báo cáo
- Ưu tiên: P1.

Cho phép xuất CSV hoặc định dạng được chốt; chỉ người dùng có quyền mới
được xuất dữ liệu nhạy cảm. Phải áp dụng giới hạn dữ liệu và ghi nhật ký
thao tác xuất.

### 4.10. Phân hệ AUD — Nhật ký và cấu hình
#### AUD-01 — Nhật ký kiểm toán
- Ưu tiên: P0.

Ghi nhận tối thiểu:

- Đăng nhập thành công/thất bại ở mức phù hợp.
- Tạo, sửa và ngừng sử dụng sản phẩm.
- Tạo, xác nhận và hủy đơn.
- Ghi nhận thanh toán, hoàn tiền.
- Nhập, xuất, điều chỉnh và kiểm kê kho.
- Thay đổi vai trò, quyền và cấu hình quan trọng.

Mỗi bản ghi gồm người thực hiện, hành động, đối tượng, thời gian, kết
quả và mã tham chiếu. Không lưu mật khẩu, token bí mật hoặc dữ liệu
thanh toán nhạy cảm vào nhật ký.

#### CFG-01 — Cấu hình hệ thống
- Ưu tiên: P0.

Cho phép quản trị viên cấu hình thông tin cửa hàng, múi giờ, đơn vị tiền
tệ, chính sách tồn âm, quy tắc mã đơn và ngưỡng cảnh báo tồn thấp.

Thay đổi cấu hình phải được kiểm tra hợp lệ, ghi nhật ký và không được
làm thay đổi hồi tố các giao dịch đã hoàn tất.

## 5. Quy tắc nghiệp vụ tổng thể
Các quy tắc dưới đây áp dụng xuyên suốt các phân hệ. Nếu quy tắc ngành
hàng được xác định sau này khác với mặc định, cần cập nhật đặc tả và các
ca kiểm thử liên quan.

| Mã | Quy tắc | Yêu cầu |
| --- | --- | --- |
| BR-001 | Mã định danh | Mã sản phẩm, đơn hàng và chứng từ phải duy nhất trong phạm vi quy định |
| BR-002 | Tiền tệ | Dùng số thập phân chính xác; quy định rõ độ chính xác và làm tròn |
| BR-003 | Giá đơn hàng | Lưu ảnh chụp giá và mô tả hàng tại thời điểm giao dịch |
| BR-004 | Tồn kho | Mọi biến động phải có chứng từ nguồn và lịch sử |
| BR-005 | Tồn âm | Mặc định không cho phép tồn âm trong MVP |
| BR-006 | Chống trùng | Các thao tác tạo giao dịch quan trọng phải hỗ trợ idempotency |
| BR-007 | Chuyển trạng thái | Chỉ cho phép các chuyển trạng thái đã được định nghĩa |
| BR-008 | Hủy giao dịch | Không xóa vật lý giao dịch đã ghi sổ |
| BR-009 | Thanh toán | Trạng thái đơn và trạng thái thanh toán độc lập |
| BR-010 | Hoàn tiền | Không hoàn vượt số tiền thực thu đủ điều kiện hoàn |
| BR-011 | Trả hàng | Không trả vượt số lượng còn đủ điều kiện trả |
| BR-012 | Phân quyền | Mọi thao tác phải được kiểm tra quyền phía máy chủ |
| BR-013 | Thay đổi dữ liệu | Thao tác nhạy cảm phải có nhật ký kiểm toán |
| BR-014 | Đồng thời | Cập nhật kho và giao dịch tài chính phải bảo đảm tính nhất quán |
| BR-015 | Báo cáo | Định nghĩa doanh thu, tiền thu và giá vốn phải được phân biệt |
| BR-016 | Mở rộng | Không gắn cứng hệ thống với một ngành hàng hoặc bộ thuộc tính duy nhất |

### 5.1. Quy tắc tính tiền
Với mỗi dòng hàng $i$:

$L_i = Q_i times P_i - D_i$

Trong đó $Q_i$ là số lượng, $P_i$ là đơn giá, $D_i$ là giảm giá dòng
hàng.

$T = sum_i^() L_i - D_o + T a x + F e e$

Trong đó:

- $D_o$: giảm giá cấp đơn.
- $T a x$: thuế áp dụng.
- $F e e$: các khoản phí được tính vào đơn.

MVP cần chốt chính sách làm tròn, thứ tự áp dụng giảm giá và thuế. Nếu
chưa có chính sách thuế cụ thể, hệ thống phải hỗ trợ cấu hình hoặc không
áp thuế theo mặc định cho đến khi nghiệp vụ được xác nhận; không tự suy
đoán thuế suất.

### 5.2. Quy tắc tồn kho và giữ chỗ
$T ồ n k h ả d ụ n g = T ồ n t h ự c t ế - T ồ n g i ữ c h ỗ$

Đề xuất áp dụng chính sách sau:

- Khi đơn trực tuyến chưa xác nhận: chưa giữ tồn hoặc chỉ giữ trong thời
gian cấu hình nếu doanh nghiệp chọn chính sách này.  
- Khi xác nhận đơn: giữ tồn hoặc trừ tồn theo quy trình đã thống nhất.
- Khi hủy đơn đang giữ hàng: giải phóng tồn giữ chỗ.
- Khi xuất kho: ghi nhận giảm tồn thực tế đúng một lần.
- Khi trả hàng: chỉ tăng tồn bán được sau khi xác nhận hàng đủ điều
  kiện.

Hệ thống không được đồng thời tính một lượng hàng vừa là tồn giữ chỗ vừa
là hàng đã xuất theo cách làm giảm tồn khả dụng hai lần.

### 5.3. Máy trạng thái đơn hàng
DRAFT --- Bản nháp

CONFIRMED --- Đã xác nhận

PROCESSING --- Đang xử lý

COMPLETED --- Hoàn tất

CANCELLED --- Đã hủy

Chỉ từ các trạng thái cho phép hủy theo quy tắc nghiệp vụ.

Đây là máy trạng thái tối thiểu đề xuất. Nếu bán trực tuyến cần các
trạng thái giao hàng riêng như `READY_TO_SHIP`, `SHIPPED`,
`DELIVERY_FAILED`, nên triển khai thành vòng đời giao hàng độc lập thay
vì làm phức tạp trạng thái đơn hàng.

### 5.4. Máy trạng thái thanh toán
| Trạng thái | Ý nghĩa |
| --- | --- |
| `PENDING` | Đang chờ kết quả |
| `SUCCEEDED` | Thanh toán thành công |
| `FAILED` | Thanh toán thất bại |
| `PARTIALLY_REFUNDED` | Đã hoàn một phần |
| `REFUNDED` | Đã hoàn toàn bộ số tiền đủ điều kiện |

Trạng thái `REFUNDED` phải phản ánh các khoản hoàn thực tế đã thành
công, không phải chỉ có yêu cầu hoàn tiền được tạo.

## 6. Mô hình dữ liệu và thiết kế cơ sở dữ liệu
### 6.1. Định hướng
Đề xuất cơ sở dữ liệu quan hệ cho MVP. Các bảng phải hỗ trợ khóa ngoại,
giao dịch nguyên tử, chỉ mục tìm kiếm và lưu lịch sử.

Quy ước:

- Khóa chính dùng UUID hoặc kiểu định danh tương đương.

- Thời gian lưu bằng timestamp có quy ước múi giờ thống nhất.

- Tiền lưu bằng `DECIMAL`, không dùng `FLOAT` hoặc `DOUBLE` cho phép
tính tài chính.  

- Số lượng có thể dùng `DECIMAL` để hỗ trợ hàng cân theo khối lượng nếu
sau này cần; mức độ chính xác phải được cấu hình.  

- Các trường trạng thái dùng tập giá trị được kiểm soát.

- Bản ghi giao dịch đã ghi sổ không bị xóa vật lý trong hoạt động thông
  thường.

### 6.2. Các bảng cốt lõi

Các trường dưới đây là cấu trúc logic đề xuất, không phải câu lệnh SQL
cuối cùng. Kiểu dữ liệu, độ dài và chỉ mục sẽ được xác định trong thiết
kế kỹ thuật.

## A. Người dùng và phân quyền

`users` --- Tài khoản

`id`, `username`, `email`, `password_hash`, `display_name`, `status`,
`last_login_at`, `created_at`, `updated_at`.

`roles` --- Vai trò

`id`, `code`, `name`, `description`.

`permissions` --- Quyền thao tác

`id`, `code`, `description`.

`user_roles` --- Vai trò của người dùng

`user_id`, `role_id`.

`role_permissions` --- Quyền của vai trò

`role_id`, `permission_id`.

`audit_logs` --- Nhật ký kiểm toán

`id`, `actor_user_id`, `action`, `entity_type`, `entity_id`,
`before_data`, `after_data`, `result`, `created_at`, `correlation_id`.

## B. Danh mục và sản phẩm

`categories`

`id`, `parent_id`, `code`, `name`, `status`, `created_at`, `updated_at`.

`units`

`id`, `code`, `name`, `precision_scale`, `status`.

`products`

`id`, `code`, `name`, `category_id`, `base_unit_id`, `description`,
`track_inventory`, `status`, `created_at`, `updated_at`.

`product_variants`

`id`, `product_id`, `sku`, `barcode`, `variant_name`, `cost_price`,
`selling_price`, `status`, `created_at`, `updated_at`.

`attribute_definitions`

`id`, `code`, `name`, `data_type`, `scope`, `is_required`,
`validation_rules`, `status`.

`product_attribute_values`

`id`, `product_id`, `variant_id`, `attribute_definition_id`,
`value_json`.

`product_price_history`

`id`, `variant_id`, `price`, `currency_code`, `effective_from`,
`effective_to`, `changed_by`, `created_at`.

Lưu ý: với sản phẩm không có biến thể riêng, hệ thống có thể dùng một
biến thể mặc định. Quy ước này giúp mỗi mặt hàng tồn kho có một định
danh SKU nhất quán.

## C. Khách hàng và nhà cung cấp

`customers`

`id`, `customer_code`, `name`, `phone`, `email`, `status`, `notes`,
`created_at`, `updated_at`.

`customer_addresses`

`id`, `customer_id`, `recipient_name`, `phone`, `address_line`, `ward`,
`district`, `province`, `is_default`.

`suppliers`

`id`, `supplier_code`, `name`, `tax_code`, `phone`, `email`, `address`,
`status`, `created_at`, `updated_at`.

Thông tin khách mua lẻ có thể được biểu diễn bằng khách hàng mặc định
hoặc trường khách vãng lai trên đơn, tùy thiết kế cuối cùng. Không nên
tạo một khách hàng mới cho mỗi giao dịch vãng lai nếu điều đó gây nhiễu
dữ liệu.

## D. Đơn hàng

`sales_orders`

`id`, `order_code`, `channel`, `customer_id`, `status`,
`payment_status`, `currency_code`, `subtotal`, `discount_total`,
`tax_total`, `fee_total`, `grand_total`, `note`, `created_by`,
`confirmed_at`, `completed_at`, `cancelled_at`, `created_at`,
`updated_at`.

`sales_order_items`

`id`, `order_id`, `variant_id`, `sku_snapshot`, `product_name_snapshot`,
`attributes_snapshot`, `unit_name_snapshot`, `quantity`, `unit_price`,
`discount_amount`, `tax_amount`, `line_total`, `cost_snapshot` (nếu được
sử dụng và có cơ sở xác định), `created_at`.

`order_status_history`

`id`, `order_id`, `from_status`, `to_status`, `reason`, `changed_by`,
`created_at`.

`order_reservations`

`id`, `order_id`, `warehouse_id`, `variant_id`, `quantity`, `status`,
`expires_at`, `created_at`.

Ảnh chụp dòng hàng là dữ liệu lịch sử. Tên sản phẩm hoặc SKU được thay
đổi trong danh mục không được làm thay đổi nội dung đơn cũ.

## E. Kho hàng

`warehouses`

`id`, `code`, `name`, `address`, `status`, `created_at`.

`inventory_balances`

`id`, `warehouse_id`, `variant_id`, `on_hand_quantity`,
`reserved_quantity`, `version`, `updated_at`.

`inventory_documents`

`id`, `document_code`, `document_type`, `warehouse_id`, `status`,
`source_type`, `source_id`, `reason`, `created_by`, `posted_by`,
`posted_at`, `created_at`.

`inventory_document_items`

`id`, `document_id`, `variant_id`, `quantity`, `unit_cost` (nếu cần),
`reason`.

`inventory_movements`

`id`, `warehouse_id`, `variant_id`, `movement_type`, `quantity_delta`,
`source_document_id`, `source_item_id`, `created_by`, `created_at`.

`inventory_balances` là bảng số dư tổng hợp để tra cứu nhanh;
`inventory_movements` là lịch sử biến động. Hai cấu trúc phải được cập
nhật nhất quán trong cùng giao dịch hoặc qua cơ chế xử lý có kiểm soát.

## F. Thanh toán và trả hàng

`payments`

`id`, `order_id`, `payment_code`, `method`, `amount`, `status`,
`provider_reference`, `received_at`, `created_by`, `created_at`.

`refunds`

`id`, `payment_id`, `order_id`, `refund_code`, `amount`, `reason`,
`status`, `approved_by`, `processed_at`, `created_at`.

`return_orders`

`id`, `return_code`, `original_order_id`, `status`, `reason`,
`created_by`, `approved_by`, `created_at`, `completed_at`.

`return_order_items`

`id`, `return_order_id`, `order_item_id`, `quantity`, `condition`,
`restock_quantity`, `refund_amount`.

Cần phân biệt yêu cầu thanh toán/hoàn tiền với giao dịch đã được xác
nhận thành công. Với tích hợp bên thứ ba trong tương lai, bổ sung bảng
lưu webhook, sự kiện tích hợp và khóa chống lặp.

### 6.3. Quan hệ dữ liệu chính
Product 1 --- N ProductVariant

ProductVariant 1 --- N SalesOrderItem

SalesOrder 1 --- N Payment

SalesOrder 1 --- N SalesOrderItem

Warehouse + ProductVariant → InventoryBalance

InventoryMovement ← InventoryDocument

Các ràng buộc quan trọng:

- `sales_orders.order_code` phải có unique constraint.

- `product_variants.sku` phải có unique constraint trong phạm vi SKU đã
xác định.  

- Cặp `(warehouse_id, variant_id)` trong `inventory_balances` phải duy
nhất.  

- Số lượng giữ chỗ không được âm và không được vượt tồn thực tế theo mô
hình không cho tồn âm.  

- Mã giao dịch chống lặp phải duy nhất trong phạm vi endpoint hoặc loại
giao dịch.  

- Tổng tiền hoàn thành công phải được kiểm tra trong giao dịch có khóa
  phù hợp để ngăn hoàn vượt mức khi có yêu cầu đồng thời.

### 6.4. Chỉ mục và tính toàn vẹn

Đề xuất chỉ mục trên:

- SKU và mã vạch.
- Mã đơn hàng.
- Thời điểm tạo đơn và trạng thái.
- Khóa ngoại trong các bảng chi tiết.
- Kho + SKU trong bảng tồn.
- Mã giao dịch và mã tham chiếu thanh toán.
- Thời điểm và loại biến động kho.

Không nên chỉ dựa vào kiểm tra ở tầng ứng dụng. Các ràng buộc duy nhất,
khóa ngoại và điều kiện số liệu cần được bảo vệ thêm ở tầng cơ sở dữ
liệu khi phù hợp.

## 7. Thiết kế API
### 7.1. Quy ước chung
- Tiền tố: `/api/v1`.

- Định dạng trao đổi: JSON.

- Xác thực: phiên đăng nhập an toàn hoặc token phù hợp với kiến trúc
triển khai.  

- Mã định danh: UUID hoặc định dạng ổn định đã được chốt.

- Các endpoint danh sách hỗ trợ phân trang và lọc.

- Các endpoint ghi giao dịch hỗ trợ `Idempotency-Key` khi phù hợp.

- Mọi API phải xác thực quyền ở máy chủ.

- Các endpoint cập nhật hỗ trợ kiểm soát xung đột dữ liệu.

- API công khai không được để lộ dữ liệu nội bộ hoặc thông tin nhạy cảm.

### 7.2. Danh mục endpoint

| Phân hệ | Phương thức và endpoint | Mục đích |
| --- | --- | --- |
| AUTH | `POST /auth/login` | Đăng nhập |
| AUTH | `POST /auth/logout` | Đăng xuất |
| AUTH | `GET /auth/me` | Lấy thông tin người dùng hiện tại |
| USERS | `GET /users` | Danh sách tài khoản |
| USERS | `POST /users` | Tạo tài khoản |
| USERS | `PATCH /users/{id}` | Cập nhật tài khoản |
| PRD | `GET /products` | Tìm kiếm sản phẩm |
| PRD | `POST /products` | Tạo sản phẩm |
| PRD | `GET /products/{id}` | Chi tiết sản phẩm |
| PRD | `PATCH /products/{id}` | Cập nhật sản phẩm |
| CAT | `GET /categories` | Danh sách danh mục |
| CAT | `POST /categories` | Tạo danh mục |
| CUS | `GET /customers` | Tìm khách hàng |
| CUS | `POST /customers` | Tạo khách hàng |
| ORD | `POST /orders` | Tạo đơn hàng |
| ORD | `GET /orders` | Tìm đơn hàng |
| ORD | `GET /orders/{id}` | Chi tiết đơn hàng |
| ORD | `POST /orders/{id}/confirm` | Xác nhận đơn |
| ORD | `POST /orders/{id}/cancel` | Hủy đơn |
| INV | `GET /inventory/balances` | Tra cứu tồn |
| INV | `POST /inventory/receipts` | Tạo phiếu nhập |
| INV | `POST /inventory/issues` | Tạo phiếu xuất |
| INV | `POST /inventory/adjustments` | Tạo phiếu điều chỉnh |
| INV | `POST /inventory/documents/{id}/post` | Ghi sổ chứng từ kho |
| PAY | `POST /payments` | Ghi nhận thanh toán |
| PAY | `GET /orders/{id}/payments` | Tra cứu thanh toán theo đơn |
| PAY | `POST /payments/{id}/refunds` | Tạo yêu cầu hoàn tiền |
| RMA | `POST /returns` | Tạo yêu cầu trả hàng |
| RMA | `POST /returns/{id}/approve` | Duyệt trả hàng |
| RPT | `GET /reports/sales` | Báo cáo bán hàng |
| RPT | `GET /reports/inventory` | Báo cáo tồn kho |
| AUD | `GET /audit-logs` | Tra cứu nhật ký có phân quyền |

Các endpoint xác nhận, ghi sổ và hoàn tiền là thao tác có tác động
nghiệp vụ. Không được triển khai chúng như cập nhật trạng thái tùy ý
thông qua một endpoint sửa dữ liệu chung.

### 7.3. Ví dụ API tạo đơn hàng
Yêu cầu:

- POST /api/v1/orders
- Content-Type: application/json \ Idempotency-Key:
  \<unique-request-key\>

Dữ liệu mẫu:

- {

- "channel": "STORE",

- "customer_id": "customer-uuid",

- "warehouse_id": "warehouse-uuid",

- "items": [

- ```
  {  
  ```

- ```
    "variant_id": "variant-uuid",  
  ```

- ```
    "quantity": 2  
  ```

- ```
  }  
  ```

- ],

- "note": "Đơn hàng mẫu" \ }

`customer_id` có thể là `null` nếu nghiệp vụ cho phép khách mua lẻ. Giá
và tổng tiền không được tin cậy từ dữ liệu do máy khách gửi lên; máy chủ
phải tự lấy giá hợp lệ và tính toán lại.

Phản hồi thành công dự kiến:

- {

- "data": {

- ```
  "id": "order-uuid",  
  ```

- ```
  "order_code": "SO-20261016-0001",  
  ```

- ```
  "status": "DRAFT",  
  ```

- ```
  "payment_status": "UNPAID",  
  ```

- ```
  "currency_code": "VND",  
  ```

- ```
  "grand_total": "200000.00"  
  ```

- } \ }

Các giá trị mã đơn và tổng tiền trong ví dụ chỉ minh họa định dạng,
không phải quy tắc mã đơn hoặc giá trị mặc định bắt buộc.

### 7.4. Quy ước lỗi API
| HTTP | Mã lỗi nghiệp vụ ví dụ | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Dữ liệu yêu cầu không hợp lệ |
| 401 | `UNAUTHENTICATED` | Chưa xác thực |
| 403 | `FORBIDDEN` | Không có quyền |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy tài nguyên |
| 409 | `STATE_CONFLICT` | Xung đột trạng thái hoặc dữ liệu |
| 409 | `INSUFFICIENT_STOCK` | Tồn khả dụng không đủ |
| 409 | `DUPLICATE_REQUEST` | Yêu cầu bị trùng theo chính sách chống lặp |
| 422 | `BUSINESS_RULE_VIOLATION` | Vi phạm quy tắc nghiệp vụ |
| 429 | `RATE_LIMITED` | Vượt giới hạn yêu cầu |
| 500 | `INTERNAL_ERROR` | Lỗi nội bộ |

Mã lỗi cụ thể phải được thống nhất trong hợp đồng API. Không trả về
stack trace, thông tin kết nối cơ sở dữ liệu hoặc bí mật cấu hình cho
máy khách.

## 8. Ma trận phân quyền chi tiết
### 8.1. Danh sách quyền nghiệp vụ
Hệ thống sử dụng RBAC kết hợp phạm vi dữ liệu. Mỗi quyền được định danh
bằng mã để có thể kiểm tra trong API và giao diện.

| Mã quyền | Mô tả |
| --- | --- |
| `product.read` | Xem sản phẩm |
| `product.create` | Tạo sản phẩm |
| `product.update` | Cập nhật sản phẩm |
| `product.archive` | Ngừng kinh doanh sản phẩm |
| `order.read` | Xem đơn hàng |
| `order.create` | Tạo đơn hàng |
| `order.confirm` | Xác nhận đơn |
| `order.cancel` | Hủy đơn |
| `order.discount.approve` | Duyệt chiết khấu vượt ngưỡng |
| `inventory.read` | Xem tồn kho |
| `inventory.receive` | Tạo và xử lý nhập kho |
| `inventory.issue` | Tạo và xử lý xuất kho |
| `inventory.adjust` | Điều chỉnh tồn |
| `inventory.approve` | Duyệt chứng từ kho |
| `payment.receive` | Ghi nhận tiền thu |
| `payment.refund` | Tạo yêu cầu hoàn tiền |
| `payment.refund.approve` | Phê duyệt hoàn tiền |
| `customer.read` | Xem khách hàng |
| `customer.manage` | Quản lý khách hàng |
| `report.sales.read` | Xem báo cáo bán hàng |
| `report.inventory.read` | Xem báo cáo tồn |
| `user.manage` | Quản lý tài khoản |
| `role.manage` | Quản lý vai trò và quyền |
| `audit.read` | Xem nhật ký kiểm toán |
| `config.manage` | Thay đổi cấu hình |

### 8.2. Ma trận vai trò
`✓` = được phép; `ĐK` = chỉ khi đáp ứng điều kiện hoặc được duyệt; `—` =
không được phép mặc định.

| Chức năng | Admin | Quản lý | Bán hàng | Kho | Kế toán |
| --- | --- | --- | --- | --- | --- |
| Xem sản phẩm | ✓ | ✓ | ✓ | ✓ | ✓ |
| Quản lý sản phẩm | ✓ | ✓ | ĐK | --- | --- |
| Tạo và xem đơn | ✓ | ✓ | ✓ | --- | ĐK |
| Duyệt chiết khấu | ✓ | ✓ | --- | --- | --- |
| Hủy đơn | ✓ | ĐK | ĐK | --- | --- |
| Xem tồn kho | ✓ | ✓ | ✓ | ✓ | ĐK |
| Nhập, xuất kho | ✓ | ĐK | --- | ✓ | --- |
| Điều chỉnh tồn | ✓ | ĐK | --- | ĐK | --- |
| Ghi nhận thanh toán | ✓ | ĐK | ĐK | --- | ✓ |
| Phê duyệt hoàn tiền | ✓ | ĐK | --- | --- | ĐK |
| Xem báo cáo bán hàng | ✓ | ✓ | --- | --- | ✓ |
| Xem báo cáo tồn kho | ✓ | ✓ | ĐK | ✓ | ĐK |
| Quản lý người dùng | ✓ | --- | --- | --- | --- |
| Quản lý quyền | ✓ | --- | --- | --- | --- |
| Xem nhật ký | ✓ | ĐK | --- | --- | ĐK |

Ma trận này là cấu hình khởi đầu. Khi triển khai thực tế, phải xác định
rõ ai được tạo và ai được duyệt một giao dịch; đặc biệt với điều chỉnh
tồn, hủy đơn giá trị lớn và hoàn tiền.

### 8.3. Kiểm soát phân tách nhiệm vụ
Đề xuất áp dụng nguyên tắc người tạo không tự phê duyệt các giao dịch
nhạy cảm khi quy mô vận hành yêu cầu kiểm soát nội bộ.

Ví dụ:

- Nhân viên kho tạo phiếu điều chỉnh, quản lý duyệt.
- Nhân viên tạo yêu cầu hoàn tiền, người có quyền phê duyệt.
- Nhân viên bán hàng không được tự cấp quyền quản trị.
- Nhân viên chỉ xem dữ liệu thuộc cửa hàng hoặc phạm vi được phân công.

Đối với cửa hàng nhỏ, có thể cho phép một người đảm nhiệm nhiều vai trò,
nhưng cần lưu nhật ký và xác định rõ các trường hợp bắt buộc phê duyệt.

## 9. Yêu cầu phi chức năng
Các chỉ tiêu dưới đây là mục tiêu đề xuất để thiết kế và kiểm thử; chưa
phải cam kết hiệu năng đã được xác nhận.

| Mã | Yêu cầu | Tiêu chí đề xuất |
| --- | --- | --- |
| NFR-01 | Hiệu năng | 95% yêu cầu đọc phổ biến phản hồi trong 2 giây tại tải mục tiêu |
| NFR-02 | Tính nhất quán | Không ghi nhận trùng đơn, thanh toán hoặc biến động kho do gửi lại yêu cầu |
| NFR-03 | Đồng thời | Không xuất vượt tồn do hai giao dịch chạy song song trong chế độ cấm tồn âm |
| NFR-04 | Bảo mật | Xác thực và phân quyền ở máy chủ; mã hóa dữ liệu truyền qua mạng |
| NFR-05 | Khả dụng | Mục tiêu ban đầu 99,5% mỗi tháng, tùy hạ tầng và kế hoạch bảo trì |
| NFR-06 | Sao lưu | Sao lưu tự động, theo dõi kết quả và kiểm tra phục hồi định kỳ |
| NFR-07 | Khả năng bảo trì | Phân hệ tách biệt, có kiểm thử tự động cho nghiệp vụ trọng yếu |
| NFR-08 | Khả năng mở rộng | Bổ sung thuộc tính sản phẩm và nghiệp vụ mới mà không phải thiết kế lại toàn hệ thống |
| NFR-09 | Khả năng sử dụng | Giao diện web thích ứng kích thước màn hình, thao tác bán hàng rõ ràng |
| NFR-10 | Truy vết | Có thể xác định người thực hiện, thời điểm và chứng từ liên quan của giao dịch quan trọng |

### 9.1. Bảo mật
- Mật khẩu được băm bằng thuật toán chuyên dụng phù hợp.

- Cookie phiên đăng nhập cần có các thuộc tính bảo mật thích hợp nếu
dùng xác thực dựa trên cookie.  

- Bảo vệ chống CSRF, XSS, SQL injection và các rủi ro web phổ biến.

- Phân quyền được kiểm tra trên từng endpoint và từng đối tượng dữ liệu.
  

- Bí mật kết nối và khóa API không được đưa vào mã nguồn công khai.

- Có giới hạn tần suất cho đăng nhập và các endpoint nhạy cảm.

- Có chính sách lưu giữ và truy cập dữ liệu cá nhân phù hợp với pháp
  luật áp dụng.

### 9.2. Giao dịch đồng thời và phục hồi

Đặc biệt với tồn kho và thanh toán:

1. Sử dụng transaction cơ sở dữ liệu cho các cập nhật phải thành công
hoặc thất bại cùng nhau.  
1. Dùng khóa, cập nhật có điều kiện hoặc cơ chế kiểm soát phiên bản để
ngăn tranh chấp tồn kho.  
1. Gắn mã chống lặp với yêu cầu tạo đơn, ghi nhận thanh toán và các thao
tác có tác động tài chính.  
1. Có quy trình đối soát khi hệ thống bên ngoài đã xử lý giao dịch nhưng
phản hồi bị mất.  
1. Sao lưu dữ liệu và kiểm tra phục hồi thực tế, không chỉ kiểm tra rằng
  tệp sao lưu đã được tạo.

RPO và RTO phải được xác định trước khi triển khai chính thức. Không nên
đặt giá trị cam kết khi chưa biết hạ tầng, ngân sách và mức gián đoạn có
thể chấp nhận.

## 10. Thiết kế giao diện web
### 10.1. Các màn hình MVP
UI-01

Đăng nhập

Xác thực, thông báo lỗi và quản lý phiên.

UI-02

Dashboard

Tóm tắt đơn hàng, doanh thu, cảnh báo tồn kho theo quyền.

UI-03

Danh sách sản phẩm

Tìm kiếm, lọc, tạo và cập nhật sản phẩm.

UI-04

Màn hình bán hàng

Tìm hoặc quét SKU, chỉnh số lượng, tính tiền và tạo đơn.

UI-05

Quản lý đơn hàng

Tra cứu đơn, xem trạng thái, xác nhận và hủy theo quyền.

UI-06

Quản lý kho

Tra cứu tồn, nhập hàng, xuất hàng, kiểm kê.

UI-07

Thanh toán và trả hàng

Ghi nhận thu tiền, xem giao dịch và xử lý hoàn tiền.

UI-08

Khách hàng

Tìm kiếm, xem hồ sơ và lịch sử mua hàng.

UI-09

Báo cáo

Lọc theo thời gian, trạng thái và xuất dữ liệu nếu được phép.

UI-10

Quản trị

Tài khoản, vai trò, cấu hình và nhật ký.

### 10.2. Quy tắc giao diện
- Các thao tác lưu, xác nhận, hủy và hoàn tiền phải có phản hồi rõ ràng.
  

- Không để người dùng gửi lặp thao tác khi yêu cầu đang được xử lý.

- Lỗi nghiệp vụ phải được diễn giải dễ hiểu và chỉ rõ cách khắc phục nếu
có thể.  

- Hiển thị rõ đơn vị tiền tệ, số lượng và trạng thái giao dịch.

- Các nút không có quyền không được hiển thị như thao tác khả dụng; máy
chủ vẫn phải kiểm tra quyền độc lập.  

- Màn hình bán hàng ưu tiên tốc độ tìm sản phẩm, nhập số lượng và hoàn
  tất đơn.

## 11. Tiêu chí nghiệm thu và kiểm thử

Mỗi yêu cầu chức năng phải có ít nhất một ca kiểm thử thành công và các
ca kiểm thử ngoại lệ tương ứng. Các kịch bản sau là bộ nghiệm thu cốt
lõi đề xuất.

### 11.1. Bộ kiểm thử chức năng
## Danh sách kiểm thử nghiệm thu
0/16 đã đánh dấu

Danh sách tương tác để theo dõi tiến độ thực hiện kiểm thử. Đánh dấu ở
đây không đồng nghĩa hệ thống thực tế đã vượt qua kiểm thử.

AT-01 --- Tạo sản phẩm

Tiền điều kiện: Người dùng có quyền tạo sản phẩm.

Thực hiện: Tạo sản phẩm với SKU hợp lệ và giá hợp lệ.

Kỳ vọng: Sản phẩm được lưu và có mã định danh.

AT-02 --- SKU trùng

Tiền điều kiện: Đã có SKU tương ứng.

Thực hiện: Tạo sản phẩm mới với SKU trùng.

Kỳ vọng: Hệ thống từ chối và không tạo bản ghi thứ hai.

AT-03 --- Tạo đơn tại cửa hàng

Tiền điều kiện: Sản phẩm đang được bán và tồn đủ.

Thực hiện: Chọn SKU, số lượng và tạo đơn.

Kỳ vọng: Đơn có mã duy nhất, tổng tiền đúng và lưu ảnh chụp dòng hàng.

AT-04 --- Đặt hàng trực tuyến

Tiền điều kiện: Sản phẩm có thể bán.

Thực hiện: Gửi giỏ hàng hợp lệ từ giao diện khách.

Kỳ vọng: Máy chủ tự xác thực giá và số lượng trước khi tạo đơn.

AT-05 --- Chống đặt đơn trùng

Tiền điều kiện: Đã xử lý một yêu cầu đặt đơn.

Thực hiện: Gửi lại cùng yêu cầu và khóa chống lặp.

Kỳ vọng: Không tạo đơn thứ hai ngoài quy tắc đã công bố.

AT-06 --- Xuất kho đủ tồn

Tiền điều kiện: Tồn khả dụng lớn hơn hoặc bằng lượng xuất.

Thực hiện: Ghi sổ phiếu xuất hợp lệ.

Kỳ vọng: Tồn giảm chính xác một lần và có lịch sử biến động.

AT-07 --- Xuất vượt tồn

Tiền điều kiện: Chế độ không cho phép tồn âm.

Thực hiện: Hai yêu cầu đồng thời cùng xuất vượt tổng tồn khả dụng.

Kỳ vọng: Không có giao dịch nào làm tồn âm.

AT-08 --- Hủy đơn có giữ hàng

Tiền điều kiện: Đơn đã giữ tồn nhưng chưa xuất.

Thực hiện: Hủy đơn theo quyền.

Kỳ vọng: Đơn được hủy và số lượng giữ chỗ được giải phóng đúng một lần.

AT-09 --- Thanh toán một phần

Tiền điều kiện: Đơn có số dư phải thu.

Thực hiện: Ghi nhận khoản thu nhỏ hơn tổng phải thanh toán.

Kỳ vọng: Giao dịch được ghi nhận và đơn vẫn còn số dư phải thu.

AT-10 --- Hoàn tiền vượt mức

Tiền điều kiện: Giao dịch có số tiền đủ điều kiện hoàn xác định.

Thực hiện: Tạo yêu cầu hoàn lớn hơn số dư có thể hoàn.

Kỳ vọng: Yêu cầu bị từ chối, không phát sinh hoàn tiền thành công.

AT-11 --- Trả hàng

Tiền điều kiện: Đơn gốc có lượng hàng đủ điều kiện trả.

Thực hiện: Tạo yêu cầu trả một phần.

Kỳ vọng: Không trả vượt lượng đủ điều kiện và kho chỉ tăng lượng thực tế
được nhập lại.

AT-12 --- Phân quyền

Tiền điều kiện: Người dùng không có quyền hoàn tiền.

Thực hiện: Gọi trực tiếp endpoint hoàn tiền.

Kỳ vọng: Máy chủ từ chối; dữ liệu không bị thay đổi.

AT-13 --- Lịch sử sản phẩm

Tiền điều kiện: Đơn đã ghi nhận với giá cũ.

Thực hiện: Thay đổi tên và giá sản phẩm.

Kỳ vọng: Đơn cũ vẫn hiển thị đúng dữ liệu tại thời điểm giao dịch.

AT-14 --- Đối soát báo cáo

Tiền điều kiện: Có đơn bán, hủy, hoàn tiền và biến động kho.

Thực hiện: Chạy báo cáo trong khoảng thời gian xác định.

Kỳ vọng: Kết quả khớp với quy tắc tính chỉ tiêu và dữ liệu nguồn.

AT-15 --- Nhật ký kiểm toán

Tiền điều kiện: Có thao tác điều chỉnh tồn.

Thực hiện: Tra cứu nhật ký bằng tài khoản được phép.

Kỳ vọng: Xác định được người thao tác, thời điểm, lý do và chứng từ liên
quan.

AT-16 --- Phục hồi sao lưu

Tiền điều kiện: Có bản sao lưu theo lịch.

Thực hiện: Phục hồi vào môi trường thử nghiệm.

Kỳ vọng: Dữ liệu phục hồi được kiểm tra và đạt RPO/RTO đã thống nhất.

Bỏ đánh dấuSao chép bộ test

### 11.2. Điều kiện nghiệm thu MVP
MVP được đề xuất nghiệm thu khi đáp ứng đầy đủ các điều kiện:

1. Tất cả yêu cầu P0 đã được triển khai hoặc có ngoại lệ được phê duyệt
bằng văn bản.  
1. Các ca kiểm thử nghiệp vụ trọng yếu đạt kết quả mong đợi.
1. Không còn lỗi nghiêm trọng ảnh hưởng đến tính đúng đắn của đơn hàng,
tồn kho hoặc thanh toán.  
1. Các kiểm thử phân quyền và bảo mật trọng yếu đạt yêu cầu.
1. Báo cáo đối soát được với dữ liệu giao dịch nguồn.
1. Quy trình sao lưu và phục hồi đã được kiểm chứng.
1. Có tài liệu triển khai, hướng dẫn sử dụng và quy trình xử lý sự cố cơ
  bản.

Các chỉ tiêu hiệu năng, khả dụng, RPO và RTO phải được nghiệm thu theo
mục tiêu đã được chủ dự án phê duyệt trước khi kiểm thử.

## 12. Lộ trình triển khai MVP
Giai đoạn 1 --- Chốt nghiệp vụ

Xác nhận quy trình bán hàng, quy tắc tồn, chính sách hủy/đổi trả, thanh
toán và phạm vi kênh trực tuyến.

Giai đoạn 2 --- Thiết kế kỹ thuật

Chốt ERD, ràng buộc dữ liệu, máy trạng thái, hợp đồng API và kiến trúc
triển khai.

Giai đoạn 3 --- Phát triển lõi

Tài khoản, sản phẩm, khách hàng, đơn hàng, kho và thanh toán cơ bản.

Giai đoạn 4 --- Báo cáo và hoàn thiện

Báo cáo, nhật ký kiểm toán, bảo mật, sao lưu và tối ưu trải nghiệm người
dùng.

Giai đoạn 5 --- Kiểm thử và triển khai

Kiểm thử tích hợp, kiểm thử đồng thời, nghiệm thu nghiệp vụ và triển
khai thử nghiệm.

## 13. Giả định và các quyết định còn mở
Do quy mô và loại sản phẩm chưa được xác định, cần ghi nhận các mục sau
trong danh sách quyết định của dự án.

| Mã | Vấn đề cần chốt | Đề xuất mặc định |
| --- | --- | --- |
| DEC-01 | Số lượng cửa hàng và kho | Thiết kế hỗ trợ nhiều kho; vận hành ban đầu có thể chỉ một kho |
| DEC-02 | Đăng nhập của khách trực tuyến | Cho phép khách vãng lai, bổ sung tài khoản sau nếu cần |
| DEC-03 | Giữ hàng | Giữ hàng tại bước xác nhận đơn, với thời hạn và quy tắc giải phóng được cấu hình |
| DEC-04 | Tồn âm | Không cho phép |
| DEC-05 | Phương thức thanh toán | Tiền mặt và chuyển khoản ghi nhận thủ công |
| DEC-06 | Thuế | Có cấu trúc dữ liệu hỗ trợ nhưng phải chốt chính sách trước phát hành chính thức |
| DEC-07 | Đổi trả | Hỗ trợ nghiệp vụ cơ bản nếu nằm trong phạm vi MVP đã phê duyệt |
| DEC-08 | Giá vốn | Lưu dữ liệu cần thiết; chốt phương pháp tính trước khi công bố lợi nhuận chính thức |
| DEC-09 | Công nghệ | Chọn sau khi xác nhận năng lực đội ngũ và hạ tầng |
| DEC-10 | Quy mô tải | Xác định số người dùng đồng thời và số giao dịch dự kiến trước kiểm thử hiệu năng |

Các quyết định trên không cản trở việc thiết kế nền tảng, nhưng cần được
chốt trước khi hoàn thành thiết kế chi tiết và phát hành.

## 14. Kết luận và phạm vi bàn giao
Bản SRS phiên bản 1.1 xác định nền tảng nghiệp vụ cho một hệ thống bán
hàng web đa kênh với quản lý tồn kho, thiết kế sản phẩm linh hoạt và
phạm vi MVP.

Để chuyển sang giai đoạn triển khai, bộ tài liệu dự án nên gồm:

- SRS được chủ dự án phê duyệt.
- Sơ đồ ERD chi tiết và đặc tả trường dữ liệu.
- Đặc tả API hoàn chỉnh, có ví dụ request/response và mã lỗi.
- Sơ đồ luồng bán hàng, thanh toán, hủy đơn và nhập xuất kho.
- Ma trận quyền và quy tắc phê duyệt.
- Bộ test case liên kết với từng mã yêu cầu.
- Tài liệu triển khai, sao lưu, phục hồi và vận hành.

Trạng thái tài liệu: bản dự thảo SRS có thể dùng làm cơ sở lập kế hoạch
và thiết kế kỹ thuật. Trước khi lập trình chính thức, cần xác nhận các
quyết định mở tại Mục 13 và hoàn thiện sơ đồ dữ liệu/API ở mức triển
khai.

## 15. Baseline triển khai MVP cửa hàng nhỏ

Phần này ghi nhận phạm vi đã triển khai trong mã nguồn hiện tại; không
thay thế việc chủ dự án phê duyệt toàn bộ SRS. Baseline hiện tập trung
vào vận hành một cửa hàng:

- POS tạo đơn, giữ tồn, hỗ trợ khách hàng gắn với đơn và ghi nhận khoản
thu ban đầu.  
- Sản phẩm, nhiều SKU/biến thể, giá bán và trạng thái kinh doanh.
- Danh sách đơn, thu tiền mặt/chuyển khoản nhiều lần, hoàn tất đơn hoặc
hủy và giải phóng tồn giữ.  
- Hồ sơ khách hàng cơ bản, nhập/điều chỉnh kho có lưu lý do, sổ biến động, báo cáo
doanh số/đơn/đã thu/còn phải thu/tồn thấp.  
- Phân quyền cửa hàng theo chủ, quản lý, thu ngân, nhân viên kho và kế
  toán; gợi ý sản phẩm bán chạy trong 90 ngày, với danh mục còn hàng
  làm phương án thay thế khi chưa có lịch sử bán.

Chưa thuộc baseline triển khai này: cửa hàng trực tuyến/đa kênh, nhiều
cổng thanh toán, đổi trả/hoàn tiền, tích điểm, AI gợi ý và các nghiệp vụ
kế toán tổng hợp. Các yêu cầu liên quan trong SRS vẫn cần quyết định
phạm vi riêng trước khi nghiệm thu chính thức.
