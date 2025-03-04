"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const stream_1 = require("stream");
const database_1 = require("./services/database");
const storage_1 = require("./services/storage");
const cors_1 = __importDefault(require("cors"));
const crypto_1 = require("crypto");
function computeSHA256(buffer) {
    return (0, crypto_1.createHash)("sha256").update(buffer).digest("hex");
}
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Set up CORS policies
const allowedOrigins = ["http://localhost:5173", "https://quizabble.web.app"];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
}));
// Connect to the database
(0, database_1.connectDB)();
app.get("/", (req, res) => {
    res.send("Server running");
});
// Use HTTP server
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("start-audio", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const contentType = (data === null || data === void 0 ? void 0 : data.contentType) || "audio/webm";
        const fileKey = data === null || data === void 0 ? void 0 : data.fileKey; // Get fileKey from frontend
        if (!fileKey) {
            console.error(`❌ No fileKey received for socket: ${socket.id}. Ignoring request.`);
            return;
        }
        const passThrough = new stream_1.PassThrough();
        // Start streaming to S3 immediately
        (0, storage_1.streamToS3)(passThrough, contentType, fileKey)
            .then((uploadedUrl) => {
            if (uploadedUrl) {
                socket.emit("upload-success", { url: uploadedUrl });
                console.log(`✅ Upload successful for ${fileKey}: ${uploadedUrl}`);
            }
            else {
                socket.emit("upload-error", { error: "Failed to upload audio" });
            }
        })
            .catch((err) => {
            console.error("❌ Error uploading audio stream:", err);
            socket.emit("upload-error", { error: "Failed to upload audio" });
        });
        // Store fileKey and stream in socket data
        socket.data = {
            passThrough,
            fileKey,
            contentType,
            isPaused: false, // Track pause state
        };
        console.log(`🎤 Started streaming for socket ${socket.id} with fileKey ${fileKey}`);
    }));
    socket.on("audio-chunk", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const socketData = socket.data;
        if (!socketData || !socketData.passThrough || socketData.isPaused) {
            console.error(`⚠️ Received chunk but no active stream for socket: ${socket.id}`);
            return;
        }
        try {
            const buffer = Buffer.isBuffer(data.buffer)
                ? data.buffer
                : Buffer.from(new Uint8Array(data.buffer));
            const computedHash = computeSHA256(buffer);
            if (computedHash !== data.hash) {
                console.error(`❌ Chunk hash mismatch! Possible corruption. Ignoring chunk from socket: ${socket.id}`);
                return; // Discard corrupt chunk
            }
            socketData.passThrough.write(buffer); // Write only verified chunks to S3
        }
        catch (error) {
            console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
        }
    }));
    socket.on("pause-audio", () => {
        if (socket.data) {
            socket.data.isPaused = true;
            console.log(`⏸️ Audio stream paused for socket: ${socket.id}`);
        }
    });
    socket.on("resume-audio", () => {
        if (socket.data) {
            socket.data.isPaused = false;
            console.log(`▶️ Audio stream resumed for socket: ${socket.id}`);
        }
    });
    socket.on("stop-audio", () => __awaiter(void 0, void 0, void 0, function* () {
        if (socket.data && socket.data.passThrough) {
            socket.data.passThrough.end(); // Close stream
            console.log(`⏹️ Audio stream ended for socket: ${socket.id}`);
        }
    }));
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("❌ Socket disconnected:", socket.id);
        if (socket.data && socket.data.passThrough) {
            socket.data.passThrough.end(); // Ensure stream is closed on disconnect
            console.log(`🛑 Finalizing upload after disconnect for socket: ${socket.id}`);
        }
    }));
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
