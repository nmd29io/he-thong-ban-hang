# Hệ thống bán hàng

Ứng dụng quản lý bán hàng cho cửa hàng nhỏ, xây dựng bằng React, TypeScript, Vite và Supabase. Trình duyệt chỉ dùng khóa public; các thay đổi quan trọng về đơn hàng, thanh toán và kho được xác thực trong Edge Function/RPC phía máy chủ.

## Chức năng hiện có

- POS tạo đơn, giữ tồn trong giao dịch, gắn khách hàng và ghi nhận khoản thu ban đầu.
- Danh mục sản phẩm với nhiều SKU/biến thể, cập nhật giá bán và trạng thái đang bán.
- Đơn hàng, ghi nhận nhiều lần thanh toán tiền mặt/chuyển khoản, hoàn tất hoặc hủy đơn.
- Khách hàng cơ bản và lịch sử mua trong danh sách đơn gần đây.
- Nhập hàng/điều chỉnh tồn có lý do, sổ biến động kho bất biến và cảnh báo tồn thấp.
- Nhập nhiều SKU cùng lúc bằng bảng nhanh hoặc CSV; các dòng hợp lệ được ghi độc lập và dòng lỗi có thể sửa/thử lại.
- Báo cáo doanh số, số đơn, số đã thu/còn phải thu và tồn thấp theo khoảng ngày.
- Phân quyền chủ cửa hàng, quản lý, thu ngân, nhân viên kho và kế toán.
- Gợi ý bán chạy trong 90 ngày; khi chưa có dữ liệu bán, hiển thị sản phẩm còn hàng.

MVP này chưa tích hợp kênh bán trực tuyến, cổng thanh toán ngoài, đổi trả/hoàn tiền, loyalty hoặc gợi ý AI.

## Chạy local

Từ thư mục gốc:

```powershell
supabase start
supabase migration up --local
Set-Location web
npm install
npm run dev
```

Đặt `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `web/.env.local`. Không đặt service-role/secret key ở biến môi trường `VITE_*` hoặc trong mã trình duyệt. Các Edge Functions cần được chạy cùng môi trường Supabase local bằng `supabase functions serve`.

Kiểm tra giao diện:

```powershell
npm run build
npm run lint
```

## Khởi tạo quyền chủ cửa hàng

Vai trò `owner` là quyền quản trị cao nhất hiện có trong ứng dụng. Để tạo tài khoản admin đầu tiên, chạy từ thư mục `web`:

```powershell
npm run seed:admin -- admin@tenmiencuahang.vn
```

Script dùng `VITE_SUPABASE_URL` trong `.env.local`, hỏi service-role key và mật khẩu bằng cách nhập ẩn, rồi cấp `owner` cho cửa hàng duy nhất đang hoạt động. Không lưu service-role key vào biến `VITE_*` hoặc mã nguồn. Nếu có nhiều cửa hàng, truyền thêm `--store-code <mã-cửa-hàng>`; mã này nằm ở cột `code` của `public.stores`. Cần tạo cửa hàng trước khi chạy script.

Nếu tài khoản đã tồn tại trong Supabase Auth, script giữ nguyên mật khẩu và chỉ cấp quyền cửa hàng. Sau khi đăng nhập, chủ cửa hàng có thể thêm hoặc đổi vai trò cho tài khoản đã đăng ký bằng UUID người dùng. Vai trò chủ cửa hàng cuối cùng không thể bị gỡ qua giao diện.

## Lưu ý vận hành

- Migrations `20261023010000`–`20261023040000` mở rộng schema hiện có; không cần reset database để cập nhật.
- Kiểm tra migration trên môi trường local/staging trước khi triển khai hosted. Không chạy `supabase db push` lên môi trường dùng thật nếu chưa xem lại kế hoạch migration và dữ liệu.
- Đơn mới giữ tồn; hoàn tất đơn mới trừ tồn vật lý và ghi sổ bán. Hủy đơn đã xác nhận sẽ nhả lượng tồn được giữ.
- Nhập kho hàng loạt chỉ tạo phiếu nhập tăng tồn; điều chỉnh tăng/giảm vẫn dùng form biến động đơn lẻ. CSV UTF-8 dùng hai cột `sku,quantity`; lý do/chứng từ nhập dùng chung cho cả lô. Mỗi lô tối đa 200 dòng, số lượng phải là số nguyên dương. Dòng lỗi không làm mất các dòng đã ghi thành công và có thể thử lại an toàn.
- Hạn mức giao diện hiện tải tối đa 250 đơn, 500 khách hàng và 100 biến động kho gần nhất mỗi lần.
