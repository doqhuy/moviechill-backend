# MovieChill Backend

MovieChill là một nền tảng phát trực tuyến phim, truyền hình được xây dựng bằng các công nghệ web hiện đại.

## 🌟 Tính năng

- API RESTful để quản lý người dùng, dữ liệu phim và chức năng trò chuyện
- Xác thực và ủy quyền người dùng
- Giao tiếp thời gian thực bằng Socket.IO
- Tích hợp cơ sở dữ liệu để lưu trữ dữ liệu người dùng, danh sách theo dõi và lịch sử trò chuyện

## 🚀 Công nghệ

- [Node.js](https://nodejs.org/) - Thời gian chạy JavaScript
- [Express](https://expressjs.com/) - Khung ứng dụng web
- [MongoDB](https://www.mongodb.com/) - Cơ sở dữ liệu NoSQL
- [Socket.IO](https://socket.io/) - Giao tiếp hai chiều thời gian thực
- [JSON Web Tokens (JWT)](https://jwt.io/) - Xác thực an toàn

## 🛠 Cài đặt

1. Sao chép kho lưu trữ: `git clone https://github.com/doqhuy/moviechill-backend.git`
2. Thay đổi thư mục dự án: `cd moviechill-backend`
3. Cài đặt các phụ thuộc: `npm install`
4. Tạo tệp `.env` trong thư mục gốc và thêm các biến môi trường sau:

```bash
NODE_ENV="development"
PORT="8080"
BASE_URL="url_where_backend_is_hosted"
DB="your_mongodb_connection_string"
JWT_EXPIRES_IN="90d"
JWT_SECRET="your_jwt_secret"
FRONTEND_URL="http://localhost:3000"
```

5. Khởi động máy chủ phát triển: `npm run dev`

## 📝 Tài liệu API

Bây giờ máy chủ sẽ chạy trên `http://localhost:8080`.

## 🔗 Kho lưu trữ liên quan

- [MovieChill Frontend](https://github.com/doqhuy/moviechill-frontend) - Clien phụ trợ cho MovieChill
