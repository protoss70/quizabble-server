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
exports.uploadTTSFileToS3 = uploadTTSFileToS3;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./services/database");
const elevenlabs_1 = require("./services/elevenlabs");
const storage_1 = require("./services/storage");
const spdy_1 = __importDefault(require("spdy"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
(0, database_1.connectDB)();
app.get("/", (req, res) => {
    res.send("Server running");
});
const PORT = process.env.PORT || 5000;
const server = spdy_1.default.createServer({
    key: fs_1.default.readFileSync("server-key.pem"),
    cert: fs_1.default.readFileSync("server.pem"),
}, app);
/**
 * Generates an audio buffer from text using the ElevenLabs TTS API and uploads it to S3.
 *
 * @param text - The text to be converted to speech.
 * @returns The URL of the uploaded audio file if successful.
 */
function uploadTTSFileToS3(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const audioBuffer = yield (0, elevenlabs_1.getAudioBlob)(text, "michael");
        if (!audioBuffer) {
            throw new Error("Failed to generate audio buffer");
        }
        const mimeType = "audio/mpeg";
        console.log("starting upload");
        return yield (0, storage_1.uploadFileToStorage)("tts", "tts/michael", audioBuffer, mimeType);
    });
}
// app.post("/tts", async (req: Request, res: Response) => {
//   const {text} = req.body
//   const result = await uploadTTSFileToS3(text);
//   res.status(200).json({ message: "TTS successful", result });
// })
// // POST endpoint to start transcription
// app.post("/transcribe", async (req: Request, res: Response)=> {
//   const { fileId } = req.body;
//   console.log(fileId);
//   // Check if fileId is provided
//   if (!fileId) {
//     res.status(400).json({ message: "File ID is required" });
//     return
//   }
//   try {
//     // Call the transcribeAudio function to start the transcription
//     const transcription = await transcribeClass(fileId);
//     if (!transcription) {
//       res.status(500).json({ message: "Error transcribing the audio file." });
//       return
//     }
//     // Respond with the transcription text
//     res.status(200).json({ message: "Transcription successful", transcription });
//     return
//   } catch (error) {
//     console.error("Error processing transcription:", error);
//     res.status(500).json({ message: "Internal server error" });
//     return
//   }
// });
// app.post("/summarize", async (req: Request, res: Response): Promise<void> => {
//   try {
//     // const result = await wordMatchQuestion([
//     // "introduction",
//     // "travel",
//     // "hobbies",
//     // "studies",
//     // "food",
//     // "music",
//     // "university",
//     // "volleyball",
//     // "future",
//     // "experiences"],
//     // "Turkish", 5)
//     const result = await getSummaryAndKeywords("recording_nosilence_2_150.mp3-4127e60a-4cc6-4c86-86f5-501a17218f57");
//     // const result = await rearrangementQuestion(
//     //   [
//     //     "What do you do?",
//     //     "Is there a skill or a talent that you always wanted to learn?"
//     //   ],
//     //   "A2"
//     // );
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error during text summarization:", error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while generating the summary" });
//   }
// });
// // Initialize Socket.IO on the same server
// const io = new Server(server, {
//   cors: {
//     origin: "*", // adjust this for production
//     methods: ["GET", "POST"],
//   },
// });
// io.on("connection", (socket) => {
//   console.log("Socket connected:", socket.id);
//   socket.on("start-audio", (data: { contentType?: string }) => {
//     const contentType = data?.contentType || "audio/webm";
//     const timestamp = Date.now();
//     const fileExtension = contentType.split("/")[1] || "webm";
//     const fileKey = `class_recordings/${timestamp}.${fileExtension}`;
//     // Create a PassThrough stream to pipe incoming audio data directly to S3.
//     const passThrough = new PassThrough();
//     // Save necessary data on the socket for later use.
//     // We also add an "uploadTriggered" flag to avoid duplicate uploads.
//     socket.data = { passThrough, fileKey, contentType, uploadTriggered: false };
//     console.log(
//       `Started S3 streaming upload for socket ${socket.id} with key ${fileKey}`
//     );
//   });
//   socket.on("audio-chunk", (chunk: ArrayBuffer | Buffer) => {
//     const data = socket.data;
//     if (data && data.passThrough) {
//       const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
//       data.passThrough.write(buffer);
//     }
//   });
//   socket.on("stop-audio", async () => {
//     const data = socket.data;
//     if (data && data.passThrough && data.fileKey && data.contentType && !data.uploadTriggered) {
//       // Signal end-of-stream.
//       data.passThrough.end();
//       console.log("Audio stream ended for socket:", socket.id);
//       try {
//         const uploadedUrl = await startStreamingUploadToS3(
//           data.passThrough,
//           data.contentType,
//           data.fileKey
//         );
//         socket.emit("upload-success", { url: uploadedUrl });
//       } catch (err) {
//         console.error("Error uploading audio stream:", err);
//         socket.emit("upload-error", { error: "Failed to upload audio" });
//       }
//       data.uploadTriggered = true;
//     }
//   });
//   socket.on("disconnect", async () => {
//     console.log("Socket disconnected:", socket.id);
//     const data = socket.data;
//     if (data && data.passThrough && !data.uploadTriggered) {
//       data.passThrough.end();
//       console.log("Finalizing upload after disconnect for socket:", socket.id);
//       try {
//         const uploadedUrl = await startStreamingUploadToS3(
//           data.passThrough,
//           data.contentType,
//           data.fileKey
//         );
//         console.log("Upload successful on disconnect, URL:", uploadedUrl);
//       } catch (err) {
//         console.error("Error uploading audio stream on disconnect:", err);
//       }
//       data.uploadTriggered = true;
//     }
//   });
// });
// // Fallback HTTP POST endpoint (if needed)
// app.post("/upload-audio", async (req: Request, res: Response): Promise<void> => {
//   try {
//     const contentType = req.headers["content-type"];
//     if (!contentType || !contentType.startsWith("audio/")) {
//       res.status(400).json({ error: "Invalid content type. Must be an audio stream." });
//       return;
//     }
//     console.log("Receiving audio stream via HTTP POST...");
//     const uploadedUrl = await streamToS3(req, contentType);
//     if (!uploadedUrl) {
//       res.status(500).json({ error: "Failed to upload audio to S3" });
//       return;
//     }
//     res.status(200).json({ message: "Audio uploaded successfully", url: uploadedUrl });
//   } catch (error) {
//     console.error("Error uploading audio stream:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
// Start the server.
server.listen(PORT, () => {
    console.log(`HTTP/2 Server is running on port ${PORT}`);
});
