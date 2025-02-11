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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
(0, database_1.connectDB)();
app.get("/", (req, res) => {
    res.send("Server running");
});
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
//     // const result = await wordMatchQuestion(["introduction",
//     // "music",
//     // "instruments",
//     // "viola",
//     // "electric guitar",
//     // "concert",
//     // "band",
//     // "hobbies",
//     // "favorite artist",
//     // "songwriting"], "Turkish", 5)
//     const result = await fillInTheBlankQuestion(
//       [
//         "Could you please introduce yourself?",
//         "Which grade are you in?",
//         "What instruments do you play?",
//         "Who is your favorite singer?",
//         "Have you ever been to a concert by your favorite band?",
//         "How was the feedback from the audience?",
//         "Why do you want to play viola?",
//         "Do you want to write your own songs?",
//       ],
//       "B2",
//       2,
//     );
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error during text summarization:", error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while generating the summary" });
//   }
// });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
