import http from "http";
import { spawn } from "child_process";
import fs from "fs";

const FFMPEG_PATH = "D:\\DevTools\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe";
let ffmpegProcess = null;
const OUTPUT = "record.ts";
let startTime = null; // Track when recording began
let recordingDuration = 0; // Total duration in seconds

const server = http.createServer((req, res) => {

    // ====== HTML UI ======
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Chuyển đổi Livestream Tiktok sang video</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 24px;
        }
        .input-group {
            margin-bottom: 20px;
        }
        input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: border 0.3s;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .btn-start {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-stop {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        .btn-download {
            background: #95a5a6;
            color: white;
            pointer-events: none;
        }
        .btn-download.active {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            pointer-events: auto;
        }
        .btn-delete {
            background: #95a5a6;
            color: white;
            pointer-events: none;
        }
        .btn-delete.active {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            pointer-events: auto;
        }
        .status-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .status-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        .status-value {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        .status-value.recording {
            color: #e74c3c;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        .message {
            text-align: center;
            padding: 10px;
            border-radius: 8px;
            font-size: 14px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message.success { background: #d4edda; color: #155724; }
        .message.error { background: #f8d7da; color: #721c24; }
        .message.info { background: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Chuyển đổi Livestream Tiktok sang video</h1>
        
        <div class="input-group">
            <input type="text" id="url" placeholder="Nhập link livestream" />
        </div>
        
        <div class="button-group">
            <button class="btn-start" onclick="start()">Bắt đầu</button>
            <button class="btn-stop" onclick="stop()">Dừng lại</button>
        </div>
        <div class="button-group">
            <button class="btn-download" id="downloadBtn" onclick="download()">Tải về</button>
            <button class="btn-delete" id="deleteBtn" onclick="deleteFile()">Xoá file</button>
        </div>
        
        <div class="status-box">
            <div class="status-label">Trạng thái:</div>
            <div class="status-value" id="status">Chờ bắt đầu...</div>
        </div>
        
        <div class="message" id="message"></div>
    </div>

    <script>
        function start() {
            const url = document.getElementById("url").value;
            const msgEl = document.getElementById("message");
            if (!url.trim()) {
                msgEl.className = "message error";
                msgEl.innerText = "Vui lòng nhập link livestream!";
                return;
            }
            fetch("/start", {
                method: "POST",
                body: url
            }).then(r => r.text()).then(msg => {
                msgEl.className = "message success";
                msgEl.innerText = "Đang ghi hình...";
                updateStatus();
            });
        }

        function stop() {
            const msgEl = document.getElementById("message");
            fetch("/stop", { method: "POST" })
                .then(r => r.text())
                .then(msg => {
                    msgEl.className = "message info";
                    msgEl.innerText = "Đã dừng ghi hình!";
                    updateStatus();
                });
        }

        function download() {
            const msgEl = document.getElementById("message");
            fetch("/status")
                .then(r => r.json())
                .then(data => {
                    if (data.recording) {
                        msgEl.className = "message error";
                        msgEl.innerText = "Vui lòng dừng ghi hình trước!";
                        return;
                    }
                    fetch("/check-file")
                        .then(r => r.json())
                        .then(result => {
                            if (result.exists) {
                                window.location = "/download";
                                msgEl.className = "message success";
                                msgEl.innerText = "Đang tải xuống...";
                            } else {
                                msgEl.className = "message error";
                                msgEl.innerText = "Chưa có file để tải. Hãy ghi hình trước!";
                            }
                        });
                });
        }

        function deleteFile() {
            const msgEl = document.getElementById("message");
            if (!confirm("Bạn có chắc muốn xoá file đã ghi?")) {
                return;
            }
            fetch("/delete", { method: "POST" })
                .then(r => r.text())
                .then(msg => {
                    msgEl.className = "message success";
                    msgEl.innerText = "Đã xoá file thành công!";
                    updateStatus();
                });
        }

        function updateStatus() {
            fetch("/status")
                .then(r => r.json())
                .then(data => {
                    const statusEl = document.getElementById("status");
                    const downloadBtn = document.getElementById("downloadBtn");
                    
                    const seconds = Math.max(0, Math.floor(data.seconds || 0));
                    const mins = Math.floor(seconds / 60);
                    const hrs = Math.floor(mins / 60);
                    const secs = seconds % 60;
                    const hh = String(hrs).padStart(2, "0");
                    const mm = String(mins % 60).padStart(2, "0");
                    const ss = String(secs).padStart(2, "0");
                    
                    if (data.recording) {
                        fetch("/check-file")
                            .then(r => r.json())
                            .then(result => {
                                const sizeMB = result.size > 0 ? (result.size / (1024 * 1024)).toFixed(1) : "0.0";
                                statusEl.className = "status-value recording";
                                statusEl.innerText = "Đang ghi (" + hh + ":" + mm + ":" + ss + " - " + sizeMB + "MB)";
                            });
                    } else {
                        statusEl.className = "status-value";
                        statusEl.innerText = "Chờ bắt đầu...";
                    }
                    
                    const deleteBtn = document.getElementById("deleteBtn");
                    fetch("/check-file")
                        .then(r => r.json())
                        .then(result => {
                            if (result.exists && result.size > 0) {
                                const sizeMB = (result.size / (1024 * 1024)).toFixed(1);
                                const dur = result.duration || 0;
                                const durMin = Math.floor(dur / 60);
                                const durSec = dur % 60;
                                const durStr = durMin + ":" + String(durSec).padStart(2, "0");
                                downloadBtn.className = "btn-download active";
                                downloadBtn.innerText = "Tải về (" + durStr + " - " + sizeMB + "MB)";
                                deleteBtn.className = "btn-delete active";
                            } else {
                                downloadBtn.className = "btn-download";
                                downloadBtn.innerText = "Tải về";
                                deleteBtn.className = "btn-delete";
                            }
                        });
                })
                .catch(() => {
                    document.getElementById("status").innerText = "Lỗi kết nối";
                });
        }

        setInterval(updateStatus, 1000);
        updateStatus();
    </script>
</body>
</html>`);
    }

    // ====== START RECORD ======
    if (req.url === "/start" && req.method === "POST") {
        let body = "";
        req.on("data", d => body += d);
        req.on("end", () => {

            if (ffmpegProcess) {
                return res.end("Already recording");
            }

            const streamUrl = body.trim();
            if (!streamUrl) {
                return res.end("No stream URL");
            }

            if (fs.existsSync(OUTPUT)) {
                fs.unlinkSync(OUTPUT);
            }

            ffmpegProcess = spawn(FFMPEG_PATH, [
                "-y",
                "-i", streamUrl,
                "-c", "copy",
                "-f", "mpegts",
                OUTPUT
            ]);


            startTime = Date.now();

            ffmpegProcess.on("error", (err) => {
                console.error("FFmpeg error:", err);
                ffmpegProcess = null;
                startTime = null;
            });

            ffmpegProcess.stderr.on("data", d => {
                console.log(d.toString());
            });

            ffmpegProcess.on("close", (code) => {
                if (startTime) {
                    recordingDuration = Math.floor((Date.now() - startTime) / 1000);
                }
                ffmpegProcess = null;
                startTime = null;
                console.log("Recording finished with code:", code);
            });

            res.end("Recording started");
        });
        return;
    }

    // ====== STOP RECORD ======
    if (req.url === "/stop" && req.method === "POST") {
        if (!ffmpegProcess) {
            return res.end("Not recording");
        }

        if (startTime) {
            recordingDuration = Math.floor((Date.now() - startTime) / 1000);
        }
        ffmpegProcess.kill("SIGINT");
        startTime = null;
        res.end("Recording stopped");
        return;
    }

    // ====== STATUS ======
    if (req.url === "/status") {
        const recording = !!ffmpegProcess;
        const seconds = recording && startTime ? (Date.now() - startTime) / 1000 : 0;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ recording, seconds }));
        return;
    }

    // ====== CHECK FILE ======
    if (req.url === "/check-file") {
        const exists = fs.existsSync(OUTPUT);
        const size = exists ? fs.statSync(OUTPUT).size : 0;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ exists, size, duration: recordingDuration }));
        return;
    }

    // ====== DELETE FILE ======
    if (req.url === "/delete" && req.method === "POST") {
        if (ffmpegProcess) {
            return res.end("Cannot delete while recording");
        }
        if (fs.existsSync(OUTPUT)) {
            fs.unlinkSync(OUTPUT);
            recordingDuration = 0;
            res.end("File deleted");
        } else {
            res.end("No file to delete");
        }
        return;
    }

    // ====== DOWNLOAD ======
    if (req.url === "/download") {
        if (!fs.existsSync(OUTPUT)) {
            res.writeHead(404);
            return res.end("No record file");
        }

        res.writeHead(200, {
            "Content-Type": "video/mp4",
            "Content-Disposition": "attachment; filename=record.mp4"
        });

        fs.createReadStream(OUTPUT).pipe(res);
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
