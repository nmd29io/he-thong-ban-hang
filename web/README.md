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
- Storefront công khai tại `/shop`, có trang chi tiết riêng tại `/shop/product/<product-id>`, tìm kiếm sản phẩm, giỏ hàng và gửi đơn giao hàng không thanh toán trước.

MVP này chưa tích hợp cổng thanh toán ngoài, đổi trả/hoàn tiền, loyalty hoặc gợi ý AI.

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
│   │   ├── storefront/          # Catalog công khai và tạo đơn online
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

Ứng dụng hỗ trợ đăng nhập Google OAuth, email/mật khẩu cho tài khoản cũ, và số điện thoại bằng mật khẩu hoặc mã OTP SMS. Người dùng có thể yêu cầu đặt lại mật khẩu email từ màn hình đăng nhập; liên kết trong email quay lại **Site URL** đã cấu hình trong Supabase Auth để không đưa người dùng Preview vào deployment cần đăng nhập Vercel. Thêm URL production và môi trường local vào Supabase Auth **Redirect URLs**, đồng thời đặt Site URL là domain ứng dụng công khai. Người dùng mới có thể đăng ký qua Google hoặc số điện thoại; sau khi xác thực, chủ cửa hàng vẫn cần cấp quyền thành viên trước khi tài khoản được vào dữ liệu cửa hàng.

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

Vercel tự build Preview khi có pull request và Production theo branch được cấu hình trong project (mặc định thường là `main`). Kiểm tra log build và đăng nhập trên Preview trước khi gán domain Production. Trong Supabase Auth, đặt Site URL là domain Production công khai, rồi thêm domain Production và môi trường local vào redirect allow-list; không chỉ để URL localhost như cấu hình Supabase local. Luồng đặt lại mật khẩu dùng Site URL này, không dùng domain Preview đang mở.

Rewrite SPA trong `vercel.json` trả `index.html` cho đường dẫn frontend để tránh 404 khi tải lại trực tiếp. POS/quản trị chạy tại `/`, storefront chạy tại `/shop` với trang chi tiết sản phẩm ở `/shop/product/<product-id>`; người mua có thể tìm theo tên, thương hiệu hoặc SKU, lọc danh mục/thương hiệu, sắp xếp giá và thêm nhanh sản phẩm còn hàng vào giỏ. Storefront tải catalog và gửi đơn qua Edge Function `storefront`, trong khi đơn hàng vẫn được tạo/giữ tồn qua RPC phía máy chủ. Cần áp dụng migration và triển khai Edge Function này cho cùng Supabase project trước khi bật bán online.

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

Workflow `.github/workflows/supabase-deploy.yml` chỉ kiểm thử: build, lint, kiểu Edge Function và toàn bộ migrations/bài test SQL trên Supabase local. Workflow này không cần Supabase secrets và không tự triển khai lên hosted.

Để Supabase GitHub Integration triển khai khi merge vào production branch, cấu hình tại **Supabase Dashboard → Integrations → GitHub**:

- Repository: `nmd29io/he-thong-ban-hang`.
- Working directory: `.` vì thư mục `supabase/` nằm ở repository root.
- Production branch name: `main`.
- Bật **Deploy to production** rồi lưu thay đổi.

Khi merge vào `main`, tích hợp sẽ áp dụng migrations và deploy Edge Functions được khai báo trong `supabase/config.toml`. Các function nghiệp vụ `create-order`, `manage-operations` và `manage-members` đều khai báo ở đó và yêu cầu JWT. Tính năng tự tạo preview branch cho pull request cần gói Pro; không cần tính năng đó để production deploy.

Nên bật required status check của Supabase Integration cho pull request để chặn merge khi migration validation thất bại. Build/lint/SQL checks của GitHub Actions vẫn chạy độc lập. Cấu hình provider Google OAuth và SMS vẫn thực hiện riêng trong Supabase Auth một lần.

### Cấu hình đăng nhập Google

Với project Cloud `he-thong-ban-hang-dev` (`webmljaiocjshyjxdfnw`):

1. Trong [Google Auth Platform](https://console.cloud.google.com/auth/clients), tạo OAuth Client ID loại **Web application**. Thêm `http://localhost:5173` vào **Authorized JavaScript origins** khi phát triển và `https://he-thong-ban-hang-mu.vercel.app` cho production hiện tại.
2. Thêm `https://webmljaiocjshyjxdfnw.supabase.co/auth/v1/callback` vào **Authorized redirect URIs** của Google.
3. Trong Supabase Dashboard → **Authentication → Sign In / Providers → Google**, bật Google và nhập Client ID cùng Client Secret. Không lưu Client Secret trong repository, file `VITE_*` hoặc gửi qua chat.
4. Trong Supabase Dashboard → **Authentication → URL Configuration**, đặt **Site URL** là URL production và thêm `http://localhost:5173/**` cùng `http://127.0.0.1:5173/**` vào **Redirect URLs**. URL production hiện tại là `https://he-thong-ban-hang-mu.vercel.app/`.
5. Nếu Google Auth Platform đang ở trạng thái **Testing**, chỉ các email trong **Audience → Test users** đăng nhập được. Thêm email cần thử tại đó; để cho phép mọi người dùng ngoài danh sách, cần hoàn thiện thông tin consent screen và chuyển ứng dụng sang trạng thái phù hợp trước khi triển khai.

`supabase/config.toml` chỉ cho phép cả hai địa chỉ localhost trong môi trường Supabase local; thay đổi này không cập nhật cấu hình Auth của project Cloud. Lần đầu người dùng chọn **Đăng nhập / đăng ký với Google**, Supabase tự tạo tài khoản Auth mới khi Google xác thực thành công; các lần sau đăng nhập vào tài khoản đó. Ở trạng thái **Testing**, email đó phải nằm trong **Test users**. Để vào cửa hàng, chủ cửa hàng vẫn cần cấp membership cho email Google đã xác thực.

Tài khoản đã đăng nhập nhưng chưa có membership cửa hàng mặc định vào Shop; sidebar cho phép chuyển giữa Shop và hồ sơ cá nhân. Hồ sơ có các mục tổng quan, đơn mua, thông tin cá nhân và cài đặt tài khoản. Đơn đặt qua Shop khi đã đăng nhập được liên kết với tài khoản và hiển thị trong lịch sử mua; đơn đặt trước khi có liên kết không tự động gán theo số điện thoại để tránh liên kết nhầm tài khoản. Người dùng có thể cập nhật tên hiển thị và kiểm tra lại quyền truy cập; email/số điện thoại đăng nhập chỉ hiển thị, không đổi tại đây. Mọi dữ liệu cửa hàng tiếp tục bị khóa cho tới khi được cấp membership. Với tài khoản đã có quyền, mục Shop và Hồ sơ cá nhân luôn có trong sidebar bên cạnh các màn hình được cấp quyền.

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
