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
const chatgptService_1 = require("./services/chatgpt/chatgptService");
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
app.post("/generate-word-multiple-choice", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { keywords, amount, targetLanguage } = req.body;
        // Validate input
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            res.status(400).json({ error: "Keywords must be a non-empty array." });
            return;
        }
        if (!amount || typeof amount !== "number" || amount < 2) {
            res
                .status(400)
                .json({ error: "Amount must be a number greater than 1." });
            return;
        }
        if (!targetLanguage || typeof targetLanguage !== "string") {
            res
                .status(400)
                .json({ error: "TargetLanguage must be a valid string." });
            return;
        }
        // Call the OpenAI function
        const result = yield (0, chatgptService_1.wordMultipleChoiceQuestion)(keywords, amount, targetLanguage);
        // Send successful response
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
app.post("/generate-rearrangement-question-eng-to-target", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { criticalQuestions, studentLevel, amount, targetLanguage } = req.body;
        // Validate input
        if (!criticalQuestions ||
            !Array.isArray(criticalQuestions) ||
            criticalQuestions.length === 0) {
            res
                .status(400)
                .json({ error: "CriticalQuestions must be a non-empty array." });
            return;
        }
        if (!studentLevel || !["A1", "A2", "B1", "B2"].includes(studentLevel)) {
            res.status(400).json({
                error: "StudentLevel must be one of 'A1', 'A2', 'B1', 'B2'.",
            });
            return;
        }
        if (!amount || typeof amount !== "number" || amount < 1) {
            res
                .status(400)
                .json({ error: "Amount must be a number greater than 0." });
            return;
        }
        if (!targetLanguage || typeof targetLanguage !== "string") {
            res
                .status(400)
                .json({ error: "TargetLanguage must be a valid string." });
            return;
        }
        // Call the function
        const result = yield (0, chatgptService_1.rearrangementQuestionEngToTarget)(criticalQuestions, studentLevel, amount, targetLanguage);
        // Send successful response
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
app.post("/generate-word-rearrangement-question-eng-to-target", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { keywords, amount, targetLanguage } = req.body;
        // Validate input
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            res.status(400).json({ error: "Keywords must be a non-empty array." });
            return;
        }
        if (!amount || typeof amount !== "number" || amount < 1) {
            res
                .status(400)
                .json({ error: "Amount must be a number greater than 0." });
            return;
        }
        if (!targetLanguage || typeof targetLanguage !== "string") {
            res
                .status(400)
                .json({ error: "TargetLanguage must be a valid string." });
            return;
        }
        // Call the generation function
        const result = yield (0, chatgptService_1.wordRearrangementQuestionEngToTarget)(keywords, amount, targetLanguage);
        // Return the result
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
app.post("/generate-rearrangement-question-target-to-eng", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { criticalQuestions, studentLevel, amount, targetLanguage } = req.body;
        // Validate input
        if (!criticalQuestions ||
            !Array.isArray(criticalQuestions) ||
            criticalQuestions.length === 0) {
            res
                .status(400)
                .json({ error: "CriticalQuestions must be a non-empty array." });
            return;
        }
        if (!studentLevel || !["A1", "A2", "B1", "B2"].includes(studentLevel)) {
            res.status(400).json({
                error: "StudentLevel must be one of 'A1', 'A2', 'B1', 'B2'.",
            });
            return;
        }
        if (!amount || typeof amount !== "number" || amount < 1) {
            res
                .status(400)
                .json({ error: "Amount must be a number greater than 0." });
            return;
        }
        if (!targetLanguage || typeof targetLanguage !== "string") {
            res
                .status(400)
                .json({ error: "TargetLanguage must be a valid string." });
            return;
        }
        // Call the function
        const result = yield (0, chatgptService_1.rearrangementQuestionTargetToEng)(criticalQuestions, studentLevel, amount, targetLanguage);
        // Send successful response
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}));
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
            if (data.chunkIndex % 100 === 0) {
                socket.emit("clear-chunks", { checkpoint: data.chunkIndex });
                console.log(`📝 Received and stored chunk ${data.chunkIndex} for ${fileKey}`);
            }
            socket.data.inSync = true;
        }
        catch (error) {
            console.error(`❌ Error processing audio chunk for socket: ${socket.id}`, error);
        }
    });
    socket.on("finish-recording", () => {
        console.log(`📌 Finish recording requested for socket: ${socket.id}`);
        if (socket.data && socket.data.passThrough) {
            const { fileKey, passThrough } = socket.data;
            console.log(`⏹️ Manually finalizing upload for ${fileKey}`);
            // End the stream and remove from active streams
            passThrough.end();
            activeStreams.delete(fileKey);
            // Set flag to prevent double upload on disconnect
            socket.data.isFinished = true;
            // Notify the client
            socket.emit("recording-finished", { fileKey });
            // Optionally disconnect the socket
            socket.disconnect();
        }
        else {
            console.warn(`⚠️ No active recording found for socket: ${socket.id}`);
        }
    });
    socket.on("disconnect", () => {
        var _a;
        console.log(`❌ Socket disconnected: ${socket.id}`);
        // Check if the recording was manually finished to prevent duplicate upload
        if ((_a = socket.data) === null || _a === void 0 ? void 0 : _a.isFinished) {
            console.log(`🚫 Skipping disconnect handling for ${socket.id} (already finished)`);
            return; // Exit early, preventing unnecessary upload
        }
        if (socket.data && socket.data.passThrough) {
            const { fileKey, passThrough } = socket.data;
            console.log(`🛑 Connection lost, keeping stream active for fileKey: ${fileKey}`);
            let elapsedSeconds = 0;
            let checkInterval = 2000; // Start with 2-second intervals
            const interval = setInterval(() => {
                if (elapsedSeconds >= 600) {
                    // Stop after 10 minutes (600s)
                    clearInterval(interval);
                }
                const isFileKeyInUse = [...io.sockets.sockets.values()].some((s) => { var _a; return ((_a = s.data) === null || _a === void 0 ? void 0 : _a.fileKey) === fileKey; });
                if (isFileKeyInUse) {
                    console.log(`🔄 Reconnection detected, keeping stream active for ${fileKey}`);
                    clearInterval(interval); // Stop checking
                }
                else if (elapsedSeconds >= 600) {
                    // If user doesn't reconnect within 10 minutes
                    console.log(`⏹️ No reconnection detected, finalizing upload for ${fileKey}`);
                    passThrough.end();
                    activeStreams.delete(fileKey);
                    clearInterval(interval);
                }
                elapsedSeconds += checkInterval / 1000; // Convert ms to seconds
                // After 1 minute, start exponential backoff
                if (elapsedSeconds >= 60) {
                    checkInterval = Math.min(checkInterval * 2, 30000); // Max interval of 30s
                }
                setTimeout(() => interval, checkInterval); // Dynamically adjust interval timing
            }, checkInterval);
        }
    });
});
// Start the server
const PORT = process.env.PORT || 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
