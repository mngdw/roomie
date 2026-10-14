# ROOMIE - Nền Tảng Ghép Bạn Cùng Phòng Thông Minh

Dự án ứng dụng web tìm kiếm & ghép bạn cùng phòng thông minh dựa trên bảng khảo sát 30 câu hỏi chuyên sâu (lối sống, thói quen sinh hoạt, tính cách giao tiếp, tài chính, vệ sinh và giới hạn đỏ), tích hợp hệ thống chat thời gian thực và trang quản trị dữ liệu (Admin Dashboard).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án Cục Bộ

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
- **npm** (đi kèm Node.js) hoặc **pnpm** / **yarn**.

### 2. Cài đặt các gói phụ thuộc (Dependencies)
Mở cửa sổ dòng lệnh (Terminal / Command Prompt / PowerShell) tại thư mục dự án và chạy:
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env.local` tại thư mục gốc của dự án với nội dung:
```env
DATABASE_URL="postgresql://postgres.pdikiegygpmphljioepy:uH2t7klyNnatHFoV@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```
*(Chuỗi kết nối này kết nối trực tiếp đến PostgreSQL Supabase đã cấu hình sẵn toàn bộ bảng, dữ liệu câu hỏi và tài khoản)*.

### 4. Khởi chạy máy chủ phát triển (Development Server)
```bash
npm run dev
```
Sau đó mở trình duyệt và truy cập:
- Trang chủ người dùng: [http://localhost:3000](http://localhost:3000)
- Trang Quản trị dữ liệu: [http://localhost:3000/admin](http://localhost:3000/admin)

### 5. Chạy bộ kiểm thử tự động (Unit & Integration Tests)
Dự án được bảo vệ bởi 55 bài kiểm thử tự động (RLS Database, chấm điểm tương thích matching, xác thực logic):
```bash
npm test
```

---

## 📁 Cấu Trúc Dự Án Chính

- `src/app/`: Các trang và API Routes của Next.js App Router.
  - `src/app/admin/`: Trang Dashboard quản trị tài khoản, kiểm tra 30 câu hỏi và xuất file CSV.
  - `src/app/api/`: Các endpoint RESTful API (`/api/auth/register`, `/api/auth/login`, `/api/onboarding/save`, `/api/admin/export`).
  - `src/app/discovery/`: Trang đề xuất người dùng tương thích cao và khám phá thêm bạn cùng phòng.
  - `src/app/questionnaire/`: Giao diện làm bài test 30 câu hỏi khảo sát chia làm 6 chuyên mục.
  - `src/app/chat/`: Hộp thoại trò chuyện giữa những người dùng đã kết đôi (matched).
  - `src/app/onboarding/`: Quy trình thiết lập hồ sơ ban đầu (chọn có phòng / tìm phòng, upload ảnh trọ).
- `src/lib/`:
  - `src/lib/matching/`: Thuật toán tính điểm phần trăm tương thích theo trọng số.
  - `src/lib/server/db.ts`: Quản lý kết nối cơ sở dữ liệu Supabase PostgreSQL.
- `src/components/`: Các thành phần giao diện tái sử dụng (Navbar, FloatingChatWidget, Cards, Modals).
