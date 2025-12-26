# Stream Recorder - TikTok Livestream to Video

Ứng dụng ghi hình livestream TikTok với giao diện web đẹp, hỗ trợ ghi 4 stream đồng thời.

## ✅ Yêu cầu hệ thống

- **Node.js** >= 16.x
- **FFmpeg** (tự động detect)

## 📦 Cài đặt

### 1. Clone dự án
```bash
git clone <repository-url>
cd stream-recorder
```

### 2. Cài dependencies
```bash
npm install
```

### 3. Cài FFmpeg (nếu chưa có)

#### Windows:
- **Cách 1:** Download từ https://ffmpeg.org/download.html
- **Cách 2:** Dùng Chocolatey: `choco install ffmpeg`
- **Cách 3:** Dùng Scoop: `scoop install ffmpeg`

Đặt FFmpeg vào một trong các thư mục sau:
- `C:\ffmpeg\bin\`
- `C:\Program Files\ffmpeg\bin\`
- Hoặc thêm vào PATH hệ thống

#### Linux/Mac:
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# macOS
brew install ffmpeg
```

## 🚀 Chạy ứng dụng

### Development (với auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm start
```

### Với custom port:
```bash
# Windows PowerShell
$env:PORT=3001; npm start

# Linux/Mac
PORT=3001 npm start
```

## 🌐 Sử dụng

1. Mở trình duyệt: `http://localhost:3000`
2. Nhập link livestream TikTok vào ô input
3. Nhấn **"Bắt đầu"** để ghi hình
4. Nhấn **"Dừng lại"** khi muốn kết thúc
5. Nhấn **"Tải về"** để download file đã ghi

## 🎯 Tính năng

- ✅ Ghi 4 livestream đồng thời
- ✅ Hiển thị thời gian và dung lượng real-time
- ✅ Tự động detect FFmpeg path
- ✅ Hỗ trợ Windows, Linux, macOS
- ✅ UI đẹp, responsive
- ✅ Không cần cấu hình phức tạp

## 🔧 Cấu hình nâng cao

Tạo file `.env` (optional):
```env
PORT=3000
FFMPEG_PATH=/custom/path/to/ffmpeg
```

## 📝 Scripts

- `npm start` - Chạy production
- `npm run dev` - Chạy development với nodemon
- `npm run multi` - Chạy multi-stream version (backup)

## 🐛 Troubleshooting

### FFmpeg not found
```
⚠ FFmpeg not found in common paths
```
**Giải pháp:** Cài FFmpeg và thêm vào PATH, hoặc set biến môi trường `FFMPEG_PATH`

### Port already in use
```
Port 3000 is already in use
```
**Giải pháp:** Đổi port bằng biến môi trường `PORT`

### Lần 2 không record được
**Giải pháp:** Code đã được fix với auto-cleanup và retry logic. Xem console logs để debug.

## 📄 License

MIT
