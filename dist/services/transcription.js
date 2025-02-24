"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeClass = transcribeClass;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const storage_1 = require("./storage");
const conversions_1 = require("../utils/conversions");
dotenv_1.default.config();
const openai = new openai_1.default({
  apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Transcribes an audio file using Whisper AI and saves the transcription to S3.
 * @param fileId - The unique file identifier.
 * @returns The transcription text or an error message.
 */
function transcribeClass(fileId) {
  return __awaiter(this, void 0, void 0, function* () {
    console.log("Searching file stream from storage");
    const fileStream = yield (0, storage_1.getFileFromStorage)(
      fileId,
      "class_recordings",
    );
    if (!fileStream) return "Error downloading file from S3.";
    console.log("Converting stream to buffer");
    const fileBuffer = yield (0, conversions_1.streamToBuffer)(fileStream);
    // Create a file-like object from the buffer
    const file = new File([fileBuffer], fileId, { type: "audio/mpeg" }); // Replace 'audio/mpeg' with the actual mime type
    console.log("Creating transcription");
    try {
      // Pass the file object to the OpenAI API
      const response = yield openai.audio.transcriptions.create({
        file: file, // Now a File object with necessary properties
        model: "whisper-1",
        language: "en",
      });
      const transcription = response.text;
      console.log("Transcription:", transcription);
      // Convert the transcription to a Buffer for uploading
      const transcriptionBuffer = Buffer.from(transcription, "utf-8");
      console.log("Uploading transcription to S3");
      const uploadedFileUrl = yield (0, storage_1.uploadFileToStorage)(
        fileId,
        "transcriptions",
        transcriptionBuffer,
        "text/plain",
      );
      console.log("Transcription saved to S3:", uploadedFileUrl);
      return transcription;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      return null;
    }
  });
}
