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
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});
// Track file streams and chunk indexes
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
        let lastChunkIndex = -1;
        if (activeStreams.has(fileKey)) {
            console.log(`🔄 Resuming stream for ${fileKey}`);
            passThrough = activeStreams.get(fileKey).passThrough;
            lastChunkIndex = activeStreams.get(fileKey).lastChunkIndex;
        }
        else {
            console.log(`🎤 Creating new stream for ${fileKey}`);
            passThrough = new stream_1.PassThrough();
            activeStreams.set(fileKey, { passThrough, lastChunkIndex });
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
        socket.data = { passThrough, fileKey, lastChunkIndex, inSync: true };
        console.log(`🎙️ Streaming setup for ${socket.id} with fileKey ${fileKey}, last received chunk: ${lastChunkIndex}`);
        // Inform frontend of the last received chunk index
        socket.emit("chunk-index", { lastChunkIndex });
    }));
    socket.on("audio-chunk", (data) => {
        var _a, _b;
        const socketData = socket.data;
        if (!socketData || !socketData.passThrough) {
            console.error(`⚠️ Received chunk but no active stream for socket: ${socket.id}`);
            return;
        }
        const { passThrough, fileKey } = socketData;
        // Fetch stored last chunk index for this file
        let lastChunkIndex = (_b = (_a = activeStreams.get(fileKey)) === null || _a === void 0 ? void 0 : _a.lastChunkIndex) !== null && _b !== void 0 ? _b : -1;
        if (data.chunkIndex !== lastChunkIndex + 1) {
            console.warn(`⚠️ Out-of-order chunk: Expected ${lastChunkIndex + 1}, but received ${data.chunkIndex}. Ignoring.`);
            if (socket.data.inSync) {
                console.log("Sent chunk index", lastChunkIndex);
                socket.emit("chunk-index", { lastChunkIndex: lastChunkIndex });
                socket.data.inSync = false;
            }
            return;
        }
        try {
            const buffer = Buffer.from(data.buffer);
            const computedHash = computeSHA256(buffer);
            if (computedHash !== data.hash) {
                console.error(`❌ Chunk hash mismatch! Ignoring chunk ${data.chunkIndex} from socket: ${socket.id}`);
                return;
            }
            passThrough.write(buffer);
            activeStreams.get(fileKey).lastChunkIndex = data.chunkIndex; // Update chunk index
            console.log(`📝 Received and stored chunk ${data.chunkIndex} for ${fileKey}`);
            socket.data.inSync = true;
        }
        catch (error) {
            console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
        }
    });
    socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
        if (socket.data && socket.data.passThrough) {
            const { fileKey, passThrough } = socket.data;
            console.log(`🛑 Connection lost, keeping stream active for fileKey: ${fileKey}`);
            // Wait for some time before finalizing the upload (grace period for reconnects)
            setTimeout(() => {
                if (activeStreams.has(fileKey)) {
                    console.log(`🔍 Checking for reconnects on ${fileKey}...`);
                    const isFileKeyInUse = [...io.sockets.sockets.values()].some((s) => { var _a; return ((_a = s.data) === null || _a === void 0 ? void 0 : _a.fileKey) === fileKey; });
                    if (!isFileKeyInUse) {
                        console.log(`⏹️ No reconnection detected, finalizing upload for ${fileKey}`);
                        passThrough.end(); // Close stream
                        activeStreams.delete(fileKey); // Clean up
                    }
                    else {
                        console.log(`🔄 Reconnection detected, keeping stream active for ${fileKey}`);
                    }
                }
            }, 10000); // 10 seconds grace period for reconnect
        }
    });
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
