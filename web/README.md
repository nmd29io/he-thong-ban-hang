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

## Cấu trúc mã nguồn

```text
.
├── package.json                 # Lệnh pnpm dùng chung ở workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── supabase/
│   ├── config.toml              # Cấu hình Supabase CLI
│   ├── migrations/              # Thay đổi schema, RPC và quyền dữ liệu theo phiên bản
│   ├── functions/
│   │   ├── create-order/        # Tạo đơn và giữ tồn
│   │   └── manage-operations/   # Kho, thanh toán, hoàn tất/hủy đơn
│   └── tests/                   # Kiểm thử SQL cho luồng bán hàng
└── web/
    ├── package.json             # Scripts và dependencies của giao diện
    └── src/
        ├── App.tsx              # Ghép ứng dụng, phiên đăng nhập và điều hướng màn hình
        ├── components/          # Thành phần giao diện, layout và các màn hình
        ├── hooks/               # Trạng thái, truy vấn dữ liệu và thao tác theo nghiệp vụ
        ├── lib/                 # Supabase client, kiểu dữ liệu, tiện ích và bộ gọi Edge Function
        ├── assets/              # Tài nguyên tĩnh
        ├── index.css
        └── App.css
```

## Kiến trúc

Giao diện là ứng dụng React/TypeScript chạy bằng Vite. `App.tsx` ghép các hooks nghiệp vụ với layout và các màn hình; hooks tách việc tải dữ liệu, xác thực và thao tác theo nghiệp vụ khỏi phần trình bày.

```text
Trình duyệt (React)
  └── hooks và Supabase client
      ├── Supabase Data API / RPC ── truy vấn và thao tác được RLS cho phép
      └── Edge Functions ── thao tác nghiệp vụ cần kiểm tra quyền phía server
                                └── RPC PostgreSQL ── kiểm tra và cập nhật dữ liệu
```

- `lib/supabase.ts` khởi tạo client bằng Project URL và publishable key; frontend không chứa service-role key.
- Các hooks truy vấn Supabase qua client dùng chung. `useStoreData` dùng TanStack Query để cache dữ liệu theo cửa hàng, kho và khoảng ngày báo cáo.
- Một số thao tác CRUD gọi Data API hoặc RPC trực tiếp và được giới hạn bởi quyền cơ sở dữ liệu/RLS.
- Tạo đơn gọi `create-order`; biến động kho, thanh toán, hoàn tất và hủy đơn gọi `manage-operations`. Các function yêu cầu danh tính người dùng và kiểm tra quyền thành viên cửa hàng trước khi thực hiện RPC.
- Quy tắc toàn vẹn và cập nhật quan trọng được đặt trong PostgreSQL RPC/migration để thao tác như tạo đơn và giữ tồn diễn ra trong transaction. Migration được quản lý trong `supabase/migrations/`; kiểm thử SQL nằm trong `supabase/tests/`.

## Cài đặt

Từ thư mục gốc, cài pnpm bằng Corepack (nếu lệnh `pnpm` chưa có), sau đó cài dependencies:

```powershell
corepack enable
pnpm install
```

## Chạy local

Khởi động Supabase local và ứng dụng từ thư mục gốc:

```powershell
supabase start
supabase migration up --local
pnpm dev
```

Đặt `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` trong `web/.env.local`, dùng URL và publishable key của Supabase local. Có thể lấy các giá trị này bằng `supabase status`. Chạy Edge Functions trong một terminal khác:

```powershell
supabase functions serve
```

Không đặt service-role/secret key ở biến môi trường `VITE_*` hoặc trong mã trình duyệt.

## Đăng nhập Google và số điện thoại

Ứng dụng hỗ trợ đăng nhập Google OAuth, email/mật khẩu cho tài khoản cũ, và số điện thoại bằng mật khẩu hoặc mã OTP SMS. Người dùng mới có thể đăng ký qua Google hoặc số điện thoại; sau khi xác thực, chủ cửa hàng vẫn cần cấp quyền thành viên trước khi tài khoản được vào dữ liệu cửa hàng.

Mỗi Supabase project cần được cấu hình nhà cung cấp xác thực một lần:

- **Google:** tạo OAuth client dạng Web trong Google Cloud, thêm callback URL của Supabase Auth (`https://<project-ref>.supabase.co/auth/v1/callback`) làm redirect URI hợp lệ, sau đó cấu hình Google provider trong Supabase Auth bằng client ID và client secret. Cập nhật Site URL và redirect allow-list của Supabase Auth cho domain POS và môi trường local.
- **SMS:** bật phone auth và cấu hình nhà cung cấp SMS (ví dụ Twilio) cùng mẫu nội dung OTP trong Supabase Auth. Cần thông tin tài khoản nhà cung cấp và giới hạn gửi phù hợp; thử nghiệm local cần cấu hình SMS provider để nhận OTP thực.

Không đưa OAuth client secret, SMS credentials hoặc service-role key vào `VITE_*`, frontend hay Git. Sau bước cấu hình ban đầu, đăng ký/đăng nhập và quản lý thành viên hằng ngày không cần mở Supabase Dashboard.

Kiểm tra giao diện:

```powershell
pnpm build
pnpm lint
```

Sau khi chạy `supabase start` và áp dụng migrations lên database local, chạy kiểm tra database:

```powershell
supabase test db --local supabase/tests/sales_mvp.sql
```

Tệp kiểm tra bao gồm các quyền thành viên được tùy chỉnh bên cạnh luồng bán hàng.

## Triển khai POS lên Vercel

Tạo một Vercel Project từ GitHub repository này và dùng cấu hình ở `vercel.json`:

- **Root Directory:** `.` (thư mục repository; không bật tùy chọn chỉ include thư mục root).
- **Install Command:** `pnpm install --frozen-lockfile`.
- **Build Command:** `pnpm --filter web build`.
- **Output Directory:** `web/dist`.
- **Environment Variables:** thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` cho từng môi trường Development, Preview và Production. Dùng URL/key publishable của cùng Supabase project. Không tạo biến `VITE_*` chứa service-role key, secret key hoặc thông tin kết nối database.

Vercel tự build Preview khi có pull request và Production theo branch được cấu hình trong project (mặc định thường là `main`). Kiểm tra log build và đăng nhập trên Preview trước khi gán domain Production. Trong Supabase Auth, cấu hình Site URL và redirect allow-list cho domain thật; không chỉ để URL localhost như cấu hình Supabase local.

Rewrite SPA trong `vercel.json` trả `index.html` cho đường dẫn frontend để tránh 404 khi tải lại trực tiếp. Ứng dụng hiện chưa dùng URL router, nên hiện tại chỉ có màn hình ở `/`; rewrite không tự tạo thêm route ứng dụng.

Hiện repository chỉ có một ứng dụng POS/quản trị tại `web/`, chưa có storefront. Khi hai ứng dụng được triển khai riêng, tạo hai Vercel Project cùng trỏ repository và Root Directory `.`; mỗi project cần lệnh build/output riêng từ workspace. Ưu tiên domain riêng (ví dụ `pos.example.com` và `shop.example.com`) để tránh định tuyến nhầm asset/route. Không triển khai storefront hoặc cấp quyền đọc catalog cho khách chưa đăng nhập cho tới khi nghiệp vụ online và chính sách truy cập được thiết kế, kiểm thử.

## Triển khai Supabase Cloud

Đăng nhập Supabase CLI và liên kết thư mục dự án với project Cloud:

```powershell
supabase login
supabase link --project-ref <project-ref>
```

Xem lại các migration trước khi áp dụng chúng lên Cloud:

```powershell
supabase db push --dry-run
supabase db push
```

Kiểm tra kế hoạch migration và dữ liệu trước khi xác nhận lệnh `db push`. Để triển khai Edge Functions, chạy từ thư mục gốc:

```powershell
supabase functions deploy create-order --project-ref <project-ref>
supabase functions deploy manage-operations --project-ref <project-ref>
supabase functions deploy manage-members --project-ref <project-ref>
```

### Tự động kiểm thử và triển khai Supabase

Workflow `.github/workflows/supabase-deploy.yml` kiểm tra build, lint, kiểu Edge Function và chạy toàn bộ migration cùng bài test SQL trên Supabase local khi mở/cập nhật pull request vào `main`. Khi merge lên `main` (hoặc chạy thủ công workflow trên `main`), workflow chỉ triển khai hosted sau khi toàn bộ kiểm tra đạt: xem kế hoạch bằng `db push --dry-run`, áp dụng migrations, rồi deploy ba Edge Functions nghiệp vụ.

Để bật bước hosted deploy, cấu hình các mục sau trong **GitHub repository → Settings → Secrets and variables → Actions**:

- Repository variable `SUPABASE_PROJECT_REF`: project ref của Supabase hosted.
- Repository secrets `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`: access token CLI và mật khẩu database của project.

Không thêm các giá trị này vào Git hoặc log. Workflow không triển khai từ pull request; nếu thiếu cấu hình secrets/variable, kiểm thử vẫn chạy nhưng bước deploy báo lỗi rõ ràng. Cấu hình provider Google OAuth và SMS vẫn thực hiện riêng trong Supabase Auth một lần.

Trong `web/.env.local`, đặt `VITE_SUPABASE_URL` là Project URL và `VITE_SUPABASE_PUBLISHABLE_KEY` là publishable key của cùng project Cloud. Không dùng secret/service-role key ở frontend. Khởi động lại Vite sau khi đổi biến môi trường:

```powershell
pnpm dev
```

## Khởi tạo quyền chủ cửa hàng

Vai trò `owner` là quyền quản trị cao nhất hiện có trong ứng dụng. Cấu hình URL đúng môi trường trong `web/.env.local`, sau đó để tạo tài khoản admin đầu tiên, chạy từ thư mục gốc:

```powershell
pnpm --filter web seed:admin -- admin@tenmiencuahang.vn
```

Script dùng `VITE_SUPABASE_URL` trong `.env.local`, hỏi service-role key và mật khẩu bằng cách nhập ẩn, rồi cấp `owner` cho cửa hàng duy nhất đang hoạt động. Không lưu service-role key vào biến `VITE_*` hoặc mã nguồn. Nếu có nhiều cửa hàng, truyền thêm `--store-code <mã-cửa-hàng>`; mã này nằm ở cột `code` của `public.stores`. Cần tạo cửa hàng trước khi chạy script.

Nếu tài khoản đã tồn tại trong Supabase Auth, script giữ nguyên mật khẩu và chỉ cấp quyền cửa hàng. Sau khi đăng nhập, chủ cửa hàng vào **Phân quyền**, tìm nhân viên bằng email đã xác thực hoặc số điện thoại đã xác thực (định dạng quốc tế như `+84901234567`), chọn vai trò mẫu và tùy chỉnh từng quyền. Nhân viên cần đăng ký/đăng nhập trước; ứng dụng không yêu cầu nhập UUID. Vai trò chủ cửa hàng cuối cùng không thể bị gỡ qua giao diện.

## Lưu ý vận hành

- Migrations `20261023010000`–`20261103000000` mở rộng schema hiện có; không cần reset database để cập nhật.
- Kiểm tra migration trên môi trường local/staging trước khi triển khai hosted. Không chạy `supabase db push` lên môi trường dùng thật nếu chưa xem lại kế hoạch migration và dữ liệu.
- Đơn mới giữ tồn; hoàn tất đơn mới trừ tồn vật lý và ghi sổ bán. Hủy đơn đã xác nhận sẽ nhả lượng tồn được giữ.
- Nhập kho hàng loạt chỉ tạo phiếu nhập tăng tồn; điều chỉnh tăng/giảm vẫn dùng form biến động đơn lẻ. CSV UTF-8 dùng hai cột `sku,quantity`; lý do/chứng từ nhập dùng chung cho cả lô. Mỗi lô tối đa 200 dòng, số lượng phải là số nguyên dương. Dòng lỗi không làm mất các dòng đã ghi thành công và có thể thử lại an toàn.
- Hạn mức giao diện hiện tải tối đa 250 đơn, 500 khách hàng và 100 biến động kho gần nhất mỗi lần.
