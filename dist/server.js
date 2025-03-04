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
        const fileKey = data === null || data === void 0 ? void 0 : data.fileKey;
        if (!fileKey) {
            console.error(`No fileKey received for socket: ${socket.id}. Ignoring request.`);
            return;
        }
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
    socket.on("audio-chunk", (data) => {
        if (!data.fileKey) {
            console.error(`❌ Received audio chunk without fileKey from socket: ${socket.id}. Ignoring chunk.`);
            return;
        }
        console.log("Received chunk data type:", typeof data.buffer);
        const socketData = socket.data;
        if (socketData && socketData.passThrough && !socketData.isPaused) {
            try {
                let buffer;
                // If it's already a Buffer, use it directly
                if (Buffer.isBuffer(data.buffer)) {
                    buffer = data.buffer;
                }
                // If it's an ArrayBuffer, convert it
                else if (data.buffer instanceof ArrayBuffer) {
                    buffer = Buffer.from(new Uint8Array(data.buffer));
                }
                // If it's an object (serialized buffer), properly convert it
                else if (typeof data.buffer === "object" && data.buffer.data) {
                    console.warn("⚠️ Received unexpected object format for buffer. Converting via Uint8Array.");
                    buffer = Buffer.from(new Uint8Array(data.buffer.data)); // Correct conversion
                }
                else {
                    console.error("❌ Unknown buffer format received:", typeof data.buffer);
                    return;
                }
                socketData.passThrough.write(buffer); // Write to the S3 streaming upload
            }
            catch (error) {
                console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
            }
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
    socket.on("stop-audio", (data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!data.fileKey) {
            console.error(`Received stop-audio without fileKey from socket: ${socket.id}. Ignoring.`);
            return;
        }
        if (socket.data && socket.data.passThrough) {
            socket.data.passThrough.end(); // Close stream
            console.log(`Audio stream ended for socket: ${socket.id} with key ${data.fileKey}`);
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
