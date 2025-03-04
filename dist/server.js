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
const activeStreams = new Map();
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("start-audio", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const contentType = (data === null || data === void 0 ? void 0 : data.contentType) || "audio/webm";
        const fileKey = data === null || data === void 0 ? void 0 : data.fileKey;
        if (!fileKey) {
            console.error(`❌ No fileKey received for socket: ${socket.id}. Ignoring request.`);
            return;
        }
        let passThrough;
        if (activeStreams.has(fileKey)) {
            console.log(`🔄 Resuming existing stream for ${fileKey}`);
            passThrough = activeStreams.get(fileKey);
        }
        else {
            console.log(`🎤 Creating new stream for ${fileKey}`);
            passThrough = new stream_1.PassThrough();
            activeStreams.set(fileKey, passThrough);
            (0, storage_1.streamToS3)(passThrough, contentType, fileKey)
                .then((uploadedUrl) => {
                if (uploadedUrl) {
                    console.log(`✅ Upload successful for ${fileKey}: ${uploadedUrl}`);
                    activeStreams.delete(fileKey); // Clean up after successful upload
                }
                else {
                    console.error(`❌ Upload failed for ${fileKey}`);
                }
            })
                .catch((err) => {
                console.error("❌ Error uploading audio stream:", err);
            });
        }
        socket.data = { passThrough, fileKey, contentType, isPaused: false };
        console.log(`🎙️ Streaming setup for ${socket.id} with fileKey ${fileKey}`);
    }));
    socket.on("resume-audio", (data) => {
        const { fileKey } = data;
        if (fileKey && activeStreams.has(fileKey)) {
            console.log(`🔄 Resuming audio for fileKey: ${fileKey}`);
            socket.data = {
                passThrough: activeStreams.get(fileKey),
                fileKey,
                isPaused: false,
            };
        }
        else {
            console.warn(`⚠️ No existing stream found for ${fileKey}, unable to resume.`);
        }
    });
    socket.on("audio-chunk", (data) => {
        const socketData = socket.data;
        if (!socketData || !socketData.passThrough || socketData.isPaused) {
            console.error(`⚠️ Received chunk but no active stream for socket: ${socket.id}`);
            return;
        }
        try {
            let buffer;
            if (Buffer.isBuffer(data.buffer)) {
                buffer = data.buffer;
            }
            else if (data.buffer instanceof ArrayBuffer) {
                buffer = Buffer.from(new Uint8Array(data.buffer));
            }
            else if (typeof data.buffer === "object" && "data" in data.buffer) {
                // @ts-expect-error
                buffer = Buffer.from(data.buffer.data);
            }
            else {
                console.error("❌ Unknown buffer format:", data.buffer);
                return;
            }
            // Hash validation
            const computedHash = computeSHA256(buffer);
            if (computedHash !== data.hash) {
                console.error(`❌ Chunk hash mismatch! Ignoring chunk from socket: ${socket.id}`);
                return;
            }
            // Write verified chunk to stream
            socketData.passThrough.write(buffer);
        }
        catch (error) {
            console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
        }
    });
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("❌ Socket disconnected:", socket.id);
    }));
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
