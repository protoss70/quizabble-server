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
        const timestamp = Date.now();
        const fileExtension = contentType.split("/")[1] || "webm";
        const fileKey = `class_recordings/${timestamp}.${fileExtension}`;
        const passThrough = new stream_1.PassThrough();
        // Start streaming to S3 immediately
        (0, storage_1.streamToS3)(passThrough, contentType, fileKey)
            .then((uploadedUrl) => {
            if (uploadedUrl) {
                socket.emit("upload-success", { url: uploadedUrl });
                console.log(`Upload successful for ${fileKey}: ${uploadedUrl}`);
            }
            else {
                socket.emit("upload-error", { error: "Failed to upload audio" });
            }
        })
            .catch((err) => {
            console.error("Error uploading audio stream:", err);
            socket.emit("upload-error", { error: "Failed to upload audio" });
        });
        // Store stream in socket data for real-time writing
        socket.data = {
            passThrough,
            fileKey,
            contentType,
            isPaused: false, // Track pause state
        };
        console.log(`Started real-time S3 streaming for socket ${socket.id} with key ${fileKey}`);
    }));
    socket.on("audio-chunk", (chunk) => {
        const data = socket.data;
        if (data && data.passThrough && !data.isPaused) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            data.passThrough.write(buffer); // Write to the S3 streaming upload
        }
    });
    socket.on("pause-audio", () => {
        if (socket.data) {
            socket.data.isPaused = true;
            console.log(`Audio stream paused for socket: ${socket.id}`);
        }
    });
    socket.on("resume-audio", () => {
        if (socket.data) {
            socket.data.isPaused = false;
            console.log(`Audio stream resumed for socket: ${socket.id}`);
        }
    });
    socket.on("stop-audio", () => __awaiter(void 0, void 0, void 0, function* () {
        if (socket.data && socket.data.passThrough) {
            socket.data.passThrough.end(); // Close stream
            console.log(`Audio stream ended for socket: ${socket.id}`);
        }
    }));
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("Socket disconnected:", socket.id);
        if (socket.data && socket.data.passThrough) {
            socket.data.passThrough.end(); // Ensure stream is closed on disconnect
            console.log(`Finalizing upload after disconnect for socket: ${socket.id}`);
        }
    }));
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
