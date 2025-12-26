import http from "http";
import { spawn } from "child_process";
import fs from "fs";

const MAX_STREAMS = 4; // Maximum concurrent streams - easy to modify
const FFMPEG_PATH = "D:\\DevTools\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe";
const recordings = new Map(); // Map<id, {process, startTime, outputFile, url, duration}>

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
            padding: 20px;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 15px;
        }
        .add-button {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid white;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .add-button:hover:not(:disabled) {
            background: rgba(255,255,255,0.3);
            transform: scale(1.05);
        }
        .add-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .streams-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            max-width: 1400px;
            margin: 0 auto;
        }
        .stream-card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 30px;
            position: relative;
            transition: all 0.3s;
        }
        .streams-grid[data-count="1"] .stream-card {
            width: 600px;
        }
        .streams-grid[data-count="2"] .stream-card {
            width: calc(50% - 10px);
            min-width: 500px;
        }
        .streams-grid[data-count="3"] .stream-card:nth-child(1),
        .streams-grid[data-count="3"] .stream-card:nth-child(2) {
            width: calc(50% - 10px);
            min-width: 500px;
        }
        .streams-grid[data-count="3"] .stream-card:nth-child(3) {
            width: 600px;
        }
        .streams-grid[data-count="4"] .stream-card {
            width: calc(50% - 10px);
            min-width: 500px;
        }
        .close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #ff6b6b;
            color: white;
            border: none;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        .close-btn:hover:not(:disabled) {
            background: #ee5a6f;
            transform: scale(1.1);
        }
        .close-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        .stream-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 20px;
        }
        .input-group {
            margin-bottom: 15px;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 14px;
            transition: border 0.3s;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .button-group {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }
        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover:not(:disabled) {
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
            font-size: 12px;
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
            padding: 12px;
            margin-bottom: 12px;
        }
        .status-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .status-value {
            font-size: 16px;
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
            padding: 8px;
            border-radius: 8px;
            font-size: 13px;
            min-height: 35px;
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
    <div class="header">
        <h1>Chuyển đổi Livestream Tiktok sang video</h1>
        <button class="add-button" onclick="addStream()" id="addBtn">
            <span style="font-size: 24px;">+</span>
            <span>Thêm Stream (<span id="remainingCount">4</span>)</span>
        </button>
    </div>
    
    <div class="streams-grid" id="streamsGrid" data-count="1">
        <!-- Stream cards will be added here -->
    </div>

    <script>
        const MAX_STREAMS = ${MAX_STREAMS};
        let streamCount = 0;
        let nextId = 1;

        function addStream() {
            if (streamCount >= MAX_STREAMS) return;
            
            const id = nextId++;
            streamCount++;
            
            const grid = document.getElementById("streamsGrid");
            grid.setAttribute("data-count", streamCount);
            
            const card = document.createElement("div");
            card.className = "stream-card";
            card.id = "stream-" + id;
            card.innerHTML = \`
                <button class="close-btn" onclick="removeStream(\${id})" \${streamCount === 1 ? 'disabled' : ''}>×</button>
                <div class="stream-title">Stream #\${id}</div>
                
                <div class="input-group">
                    <input type="text" id="url-\${id}" placeholder="Nhập link livestream" />
                </div>
                
                <div class="button-group">
                    <button class="btn-start" onclick="start(\${id})">Bắt đầu</button>
                    <button class="btn-stop" onclick="stop(\${id})">Dừng lại</button>
                </div>
                <div class="button-group">
                    <button class="btn-download" id="downloadBtn-\${id}" onclick="download(\${id})">Tải về</button>
                    <button class="btn-delete" id="deleteBtn-\${id}" onclick="deleteFile(\${id})">Xoá file</button>
                </div>
                
                <div class="status-box">
                    <div class="status-label">Trạng thái:</div>
                    <div class="status-value" id="status-\${id}">Chờ bắt đầu...</div>
                </div>
                
                <div class="message" id="message-\${id}"></div>
            \`;
            
            grid.appendChild(card);
            updateAddButton();
            updateCloseButtons();
        }

        function removeStream(id) {
            if (streamCount <= 1) return;
            
            const card = document.getElementById("stream-" + id);
            if (card) {
                card.remove();
                streamCount--;
                document.getElementById("streamsGrid").setAttribute("data-count", streamCount);
                updateAddButton();
                updateCloseButtons();
            }
        }

        function updateAddButton() {
            const remaining = MAX_STREAMS - streamCount;
            document.getElementById("remainingCount").innerText = remaining;
            document.getElementById("addBtn").disabled = remaining <= 0;
        }

        function updateCloseButtons() {
            const closeButtons = document.querySelectorAll(".close-btn");
            closeButtons.forEach(btn => {
                btn.disabled = streamCount <= 1;
            });
        }

        function start(id) {
            const url = document.getElementById("url-" + id).value;
            const msgEl = document.getElementById("message-" + id);
            if (!url.trim()) {
                msgEl.className = "message error";
                msgEl.innerText = "Vui lòng nhập link livestream!";
                return;
            }
            fetch("/start", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id, url})
            }).then(r => r.text()).then(msg => {
                msgEl.className = "message success";
                msgEl.innerText = "Đang ghi hình...";
                updateStatus(id);
            });
        }

        function stop(id) {
            const msgEl = document.getElementById("message-" + id);
            fetch("/stop", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id})
            }).then(r => r.text()).then(msg => {
                msgEl.className = "message info";
                msgEl.innerText = "Đã dừng ghi hình!";
                updateStatus(id);
            });
        }

        function download(id) {
            const msgEl = document.getElementById("message-" + id);
            fetch("/status/" + id)
                .then(r => r.json())
                .then(data => {
                    if (data.recording) {
                        msgEl.className = "message error";
                        msgEl.innerText = "Vui lòng dừng ghi hình trước!";
                        return;
                    }
                    if (data.fileExists) {
                        window.location = "/download/" + id;
                        msgEl.className = "message success";
                        msgEl.innerText = "Đang tải xuống...";
                    } else {
                        msgEl.className = "message error";
                        msgEl.innerText = "Chưa có file để tải!";
                    }
                });
        }

        function deleteFile(id) {
            const msgEl = document.getElementById("message-" + id);
            if (!confirm("Bạn có chắc muốn xoá file đã ghi?")) {
                return;
            }
            fetch("/delete/" + id, { method: "POST" })
                .then(r => r.text())
                .then(msg => {
                    msgEl.className = "message success";
                    msgEl.innerText = "Đã xoá file thành công!";
                    updateStatus(id);
                });
        }

        function updateStatus(id) {
            fetch("/status/" + id)
                .then(r => r.json())
                .then(data => {
                    const statusEl = document.getElementById("status-" + id);
                    const downloadBtn = document.getElementById("downloadBtn-" + id);
                    const deleteBtn = document.getElementById("deleteBtn-" + id);
                    
                    if (!statusEl) return;
                    
                    const seconds = Math.max(0, Math.floor(data.seconds || 0));
                    const mins = Math.floor(seconds / 60);
                    const hrs = Math.floor(mins / 60);
                    const secs = seconds % 60;
                    const hh = String(hrs).padStart(2, "0");
                    const mm = String(mins % 60).padStart(2, "0");
                    const ss = String(secs).padStart(2, "0");
                    
                    if (data.recording) {
                        const sizeMB = data.fileSize > 0 ? (data.fileSize / (1024 * 1024)).toFixed(1) : "0.0";
                        statusEl.className = "status-value recording";
                        statusEl.innerText = "Đang ghi (" + hh + ":" + mm + ":" + ss + " - " + sizeMB + "MB)";
                    } else {
                        statusEl.className = "status-value";
                        statusEl.innerText = "Chờ bắt đầu...";
                    }
                    
                    if (data.fileExists && data.fileSize > 0) {
                        const sizeMB = (data.fileSize / (1024 * 1024)).toFixed(1);
                        const dur = data.duration || 0;
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
                })
                .catch(() => {});
        }

        function updateAllStatuses() {
            const cards = document.querySelectorAll(".stream-card");
            cards.forEach(card => {
                const id = parseInt(card.id.split("-")[1]);
                updateStatus(id);
            });
        }

        // Initialize with one stream
        addStream();
        setInterval(updateAllStatuses, 1000);
    </script>
</body>
</html>`);
    }

    // ====== START RECORD ======
    if (req.url === "/start" && req.method === "POST") {
        let body = "";
        req.on("data", d => body += d);
        req.on("end", () => {
            const { id, url } = JSON.parse(body);

            if (recordings.has(id)) {
                return res.end("Already recording");
            }

            const streamUrl = url.trim();
            if (!streamUrl) {
                return res.end("No stream URL");
            }

            const outputFile = `record_${id}.ts`;
            if (fs.existsSync(outputFile)) {
                fs.unlinkSync(outputFile);
            }

            const process = spawn(FFMPEG_PATH, [
                "-y",
                "-i", streamUrl,
                "-c", "copy",
                "-f", "mpegts",
                outputFile
            ]);

            const startTime = Date.now();

            process.on("error", (err) => {
                console.error(`FFmpeg error [${id}]:`, err);
                recordings.delete(id);
            });

            process.stderr.on("data", d => {
                console.log(`[${id}] ${d.toString()}`);
            });

            process.on("close", (code) => {
                const rec = recordings.get(id);
                if (rec && rec.startTime) {
                    rec.duration = Math.floor((Date.now() - rec.startTime) / 1000);
                }
                if (recordings.has(id)) {
                    recordings.get(id).process = null;
                    recordings.get(id).startTime = null;
                }
                console.log(`Recording ${id} finished with code:`, code);
            });

            recordings.set(id, {
                process,
                startTime,
                outputFile,
                url: streamUrl,
                duration: 0
            });

            res.end("Recording started");
        });
        return;
    }

    // ====== STOP RECORD ======
    if (req.url === "/stop" && req.method === "POST") {
        let body = "";
        req.on("data", d => body += d);
        req.on("end", () => {
            const { id } = JSON.parse(body);
            const rec = recordings.get(id);

            if (!rec || !rec.process) {
                return res.end("Not recording");
            }

            if (rec.startTime) {
                rec.duration = Math.floor((Date.now() - rec.startTime) / 1000);
            }
            rec.process.kill("SIGINT");
            rec.startTime = null;
            res.end("Recording stopped");
        });
        return;
    }

    // ====== STATUS ======
    if (req.url.startsWith("/status/")) {
        const id = parseInt(req.url.split("/")[2]);
        const rec = recordings.get(id);

        const recording = !!(rec && rec.process);
        const seconds = recording && rec.startTime ? (Date.now() - rec.startTime) / 1000 : 0;
        const outputFile = rec ? rec.outputFile : `record_${id}.ts`;
        const fileExists = fs.existsSync(outputFile);
        const fileSize = fileExists ? fs.statSync(outputFile).size : 0;
        const duration = rec ? rec.duration : 0;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ recording, seconds, fileExists, fileSize, duration }));
        return;
    }

    // ====== DELETE FILE ======
    if (req.url.startsWith("/delete/") && req.method === "POST") {
        const id = parseInt(req.url.split("/")[2]);
        const rec = recordings.get(id);

        if (rec && rec.process) {
            return res.end("Cannot delete while recording");
        }

        const outputFile = rec ? rec.outputFile : `record_${id}.ts`;
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
            if (rec) rec.duration = 0;
            res.end("File deleted");
        } else {
            res.end("No file to delete");
        }
        return;
    }

    // ====== DOWNLOAD ======
    if (req.url.startsWith("/download/")) {
        const id = parseInt(req.url.split("/")[2]);
        const rec = recordings.get(id);
        const outputFile = rec ? rec.outputFile : `record_${id}.ts`;

        if (!fs.existsSync(outputFile)) {
            res.writeHead(404);
            return res.end("No record file");
        }

        res.writeHead(200, {
            "Content-Type": "video/mp2t",
            "Content-Disposition": `attachment; filename=stream_${id}.ts`
        });

        fs.createReadStream(outputFile).pipe(res);
        return;
    }

    res.writeHead(404);
    res.end();
});

const PORT = Number(process.env.PORT) || 3000;
server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.\n` +
            "Tip: stop the other server or run with a different port, e.g. PORT=3001.");
    } else {
        console.error("Server error:", err);
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Maximum concurrent streams: ${MAX_STREAMS}`);
});
