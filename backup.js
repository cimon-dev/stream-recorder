import http from "http";
import { spawn } from "child_process";
import fs from "fs";

const FFMPEG_PATH = "D:\\DevTools\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe";
let ffmpegProcess = null;
// 111111111111111111
// const OUTPUT = "record.mp4";
const OUTPUT = "record.ts";
let startTime = null; // Track when recording began

const server = http.createServer((req, res) => {

    // ====== HTML UI ======
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Live Stream Recorder</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 16px;">
    <h3>Live Stream Recorder (Node + ffmpeg)</h3>

    <input id="url" style="width:500px" placeholder="Paste stream URL (m3u8 / flv / rtmp)" />
    <br><br>

    <button onclick="start()">Start</button>
    <button onclick="stop()">Stop</button>
    <button onclick="download()">Download</button>

    <p id="status">Status: idle</p>
    <p id="message"></p>

    <script>
        function start() {
            const url = document.getElementById("url").value;
            if (!url.trim()) {
                document.getElementById("message").innerText = "Please enter a stream URL";
                return;
            }
            fetch("/start", {
                method: "POST",
                body: url
            }).then(r => r.text()).then(msg => {
                document.getElementById("message").innerText = msg;
                updateStatus();
            });
        }

        function stop() {
            fetch("/stop", { method: "POST" })
                .then(r => r.text())
                .then(msg => {
                    document.getElementById("message").innerText = msg;
                    updateStatus();
                });
        }

        function download() {
            fetch("/status")
                .then(r => r.json())
                .then(data => {
                    if (data.recording) {
                        document.getElementById("message").innerText = "Stop recording first!";
                        return;
                    }
                    fetch("/check-file")
                        .then(r => r.json())
                        .then(result => {
                            if (result.exists) {
                                window.location = "/download";
                                document.getElementById("message").innerText = "Downloading...";
                            } else {
                                document.getElementById("message").innerText = "No file to download. Record something first!";
                            }
                        });
                });
        }

        function updateStatus() {
            fetch("/status")
                .then(r => r.json())
                .then(data => {
                    const seconds = Math.max(0, Math.floor(data.seconds || 0));
                    const mins = Math.floor(seconds / 60);
                    const hrs = Math.floor(mins / 60);
                    const secs = seconds % 60;
                    const hh = String(hrs).padStart(2, "0");
                    const mm = String(mins % 60).padStart(2, "0");
                    const ss = String(secs).padStart(2, "0");
                    document.getElementById("status").innerText = data.recording
                        ? "Status: recording (" + hh + ":" + mm + ":" + ss + ")"
                        : "Status: idle";
                })
                .catch(() => {
                    document.getElementById("status").innerText = "Status: unknown";
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

            // 111111111111111111
            // ffmpegProcess = spawn(FFMPEG_PATH, [
            //     "-y",
            //     "-i", streamUrl,
            //     "-c:v", "libx264",
            //     "-preset", "veryfast",
            //     "-c:a", "aac",
            //     "-movflags", "+faststart",
            //     OUTPUT
            // ]);
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
        res.end(JSON.stringify({ exists, size }));
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
