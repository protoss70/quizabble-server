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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
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
        origin: "*", // Adjust this for production
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("start-audio", (data) => {
        const contentType = (data === null || data === void 0 ? void 0 : data.contentType) || "audio/webm";
        const timestamp = Date.now();
        const fileExtension = contentType.split("/")[1] || "webm";
        const fileKey = `class_recordings/${timestamp}.${fileExtension}`;
        const passThrough = new stream_1.PassThrough();
        socket.data = { passThrough, fileKey, contentType, uploadTriggered: false };
        console.log(`Started S3 streaming upload for socket ${socket.id} with key ${fileKey}`);
    });
    socket.on("audio-chunk", (chunk) => {
        const data = socket.data;
        if (data && data.passThrough) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            data.passThrough.write(buffer);
        }
    });
    socket.on("stop-audio", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = socket.data;
        if (data &&
            data.passThrough &&
            data.fileKey &&
            data.contentType &&
            !data.uploadTriggered) {
            data.passThrough.end();
            console.log("Audio stream ended for socket:", socket.id);
            try {
                const uploadedUrl = yield (0, storage_1.streamToS3)(data.passThrough, data.contentType, data.fileKey);
                socket.emit("upload-success", { url: uploadedUrl });
            }
            catch (err) {
                console.error("Error uploading audio stream:", err);
                socket.emit("upload-error", { error: "Failed to upload audio" });
            }
            data.uploadTriggered = true;
        }
    }));
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Socket disconnected:", socket.id);
        const data = socket.data;
        if (data && data.passThrough && !data.uploadTriggered) {
            data.passThrough.end();
            console.log("Finalizing upload after disconnect for socket:", socket.id);
            try {
                const uploadedUrl = yield (0, storage_1.streamToS3)(data.passThrough, data.contentType, data.fileKey);
                console.log("Upload successful on disconnect, URL:", uploadedUrl);
            }
            catch (err) {
                console.error("Error uploading audio stream on disconnect:", err);
            }
            data.uploadTriggered = true;
        }
    }));
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
