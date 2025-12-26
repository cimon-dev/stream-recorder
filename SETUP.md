# 📋 CHECKLIST - Chạy trên máy mới

Làm theo các bước sau khi clone dự án về:

## ✅ Bước 1: Cài Node.js
- [ ] Tải Node.js từ: https://nodejs.org (khuyến nghị LTS)
- [ ] Kiểm tra: `node --version` (phải >= 16.x)
- [ ] Kiểm tra: `npm --version`

## ✅ Bước 2: Cài FFmpeg

### Windows (chọn 1 cách):
- [ ] **Cách 1:** Download từ https://ffmpeg.org/download.html và giải nén vào `C:\ffmpeg\`
- [ ] **Cách 2:** `choco install ffmpeg` (nếu có Chocolatey)
- [ ] **Cách 3:** `scoop install ffmpeg` (nếu có Scoop)
- [ ] **Cách 4:** Thêm vào PATH: Settings → System → About → Advanced system settings → Environment Variables

### Linux:
- [ ] `sudo apt install ffmpeg` (Ubuntu/Debian)
- [ ] `sudo yum install ffmpeg` (CentOS/RHEL)

### macOS:
- [ ] `brew install ffmpeg`

### Kiểm tra FFmpeg:
- [ ] Chạy: `ffmpeg -version`
- [ ] Hoặc: `where ffmpeg` (Windows) / `which ffmpeg` (Linux/Mac)

## ✅ Bước 3: Clone và cài đặt dự án

```bash
# Clone dự án
git clone <repository-url>
cd stream-recorder

# Cài dependencies
npm install

# (Optional) Tạo file .env nếu cần custom config
cp .env.example .env
```

## ✅ Bước 4: Chạy ứng dụng

```bash
# Development mode (với auto-reload)
npm run dev

# Production mode
npm start
```

## ✅ Bước 5: Kiểm tra

- [ ] Server chạy thành công: `Server running at http://localhost:3000`
- [ ] Thấy: `✓ Found FFmpeg at: ...` hoặc `⚠ FFmpeg not found...`
- [ ] Mở browser: http://localhost:3000
- [ ] Giao diện hiển thị đúng
- [ ] Test record 1 stream
- [ ] Test stop và record lại lần 2
- [ ] Test download file

## ⚠️ Nếu gặp lỗi:

### 1. FFmpeg not found
```
✗ GIẢI PHÁP: Cài FFmpeg và thêm vào PATH
✗ HOẶC: Set biến môi trường FFMPEG_PATH trong .env
```

### 2. Port đã được sử dụng
```
✗ GIẢI PHÁP: Đổi port
Windows: $env:PORT=3001; npm start
Linux/Mac: PORT=3001 npm start
```

### 3. Module not found
```
✗ GIẢI PHÁP: Chạy lại npm install
```

### 4. Lần 2 record không được
```
✓ ĐÃ FIX: Code có auto-cleanup và retry logic
✓ XEM LOGS: Check console để thấy chi tiết
```

## 🎯 Kết quả mong đợi

✅ Chạy được trên bất kỳ máy Windows/Linux/macOS nào có Node.js + FFmpeg  
✅ Không cần config phức tạp  
✅ Tự động detect FFmpeg path  
✅ Record được nhiều lần không bị lỗi  
✅ Hỗ trợ 4 streams đồng thời
