import https from "https";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG_DIR = path.join(__dirname, "ffmpeg-bin");
const FFMPEG_BIN = path.join(FFMPEG_DIR, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

// Skip if FFmpeg already exists
if (fs.existsSync(FFMPEG_BIN)) {
    console.log("✓ FFmpeg already installed");
    process.exit(0);
}

console.log("📦 Installing FFmpeg...");

const downloadFFmpeg = () => {
    if (process.platform !== "win32") {
        console.log("ℹ On Linux/Mac, please install FFmpeg manually:");
        console.log("  Ubuntu/Debian: sudo apt install ffmpeg");
        console.log("  CentOS: sudo yum install ffmpeg");
        console.log("  macOS: brew install ffmpeg");
        process.exit(0);
    }

    // Windows FFmpeg URL (portable version)
    const URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip";

    console.log("Downloading FFmpeg for Windows...");

    https.get(URL, { timeout: 30000 }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            console.log("Following redirect...");
            return downloadFFmpeg.call({ url: response.headers.location });
        }

        if (response.statusCode !== 200) {
            console.error(`✗ Download failed: ${response.statusCode}`);
            process.exit(1);
        }

        const zipFile = path.join(__dirname, "ffmpeg.zip");
        const file = fs.createWriteStream(zipFile);
        let downloadedSize = 0;
        const contentLength = parseInt(response.headers["content-length"], 10);

        response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            const percent = ((downloadedSize / contentLength) * 100).toFixed(1);
            process.stdout.write(`\rDownloading: ${percent}%`);
        });

        response.pipe(file);

        file.on("finish", () => {
            file.close();
            console.log("\n✓ Download complete");
            extractFFmpeg(zipFile);
        });

        file.on("error", (err) => {
            fs.unlink(zipFile, () => { });
            console.error("✗ Download error:", err);
            process.exit(1);
        });
    }).on("error", (err) => {
        console.error("✗ Connection error:", err);
        process.exit(1);
    });
};

const extractFFmpeg = (zipFile) => {
    console.log("Extracting FFmpeg...");

    try {
        if (!fs.existsSync(FFMPEG_DIR)) {
            fs.mkdirSync(FFMPEG_DIR, { recursive: true });
        }

        // Try using built-in tar/unzip if available, otherwise use a simpler approach
        if (process.platform === "win32") {
            execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${FFMPEG_DIR}' -Force"`, {
                stdio: "inherit",
                shell: "powershell"
            });
        } else {
            execSync(`unzip -q '${zipFile}' -d '${FFMPEG_DIR}'`);
        }

        console.log("✓ FFmpeg extracted");

        // Find ffmpeg.exe in extracted folder and move it
        const findFFmpeg = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (file === "ffmpeg.exe" || file === "ffmpeg") {
                    return filePath;
                }
                if (stat.isDirectory()) {
                    const found = findFFmpeg(filePath);
                    if (found) return found;
                }
            }
            return null;
        };

        const foundFFmpeg = findFFmpeg(FFMPEG_DIR);
        if (!foundFFmpeg) {
            console.log("⚠ Warning: Could not find ffmpeg executable in extracted files");
        } else {
            console.log(`✓ Found FFmpeg at: ${foundFFmpeg}`);
            if (foundFFmpeg !== FFMPEG_BIN) {
                fs.copyFileSync(foundFFmpeg, FFMPEG_BIN);
                console.log(`✓ Copied to: ${FFMPEG_BIN}`);
            }
        }

        // Cleanup
        fs.unlinkSync(zipFile);
        console.log("✓ FFmpeg installation complete!");

    } catch (err) {
        console.error("✗ Extraction error:", err.message);
        process.exit(1);
    }
};

downloadFFmpeg();
