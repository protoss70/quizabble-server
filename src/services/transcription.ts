import OpenAI from "openai";
import dotenv from "dotenv";
import { getFileFromStorage, uploadFileToStorage } from "./storage";
import { streamToBuffer } from "../utils/conversions";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes an audio file using Whisper AI and saves the transcription to S3.
 * @param fileId - The unique file identifier.
 * @returns The transcription text or an error message.
 */
export async function transcribeClass(fileId: string): Promise<string | null> {
  console.log("Searching file stream from storage");
  const fileStream = await getFileFromStorage(fileId, "class_recordings");
  if (!fileStream) return "Error downloading file from S3.";

  console.log("Converting stream to buffer");
  const fileBuffer = await streamToBuffer(fileStream);

  // Create a file-like object from the buffer
  const file = new File([fileBuffer], fileId, { type: "audio/mpeg" });  // Replace 'audio/mpeg' with the actual mime type

  console.log("Creating transcription");
  try {
    // Pass the file object to the OpenAI API
    const response = await openai.audio.transcriptions.create({
      file: file, // Now a File object with necessary properties
      model: "whisper-1",
      language: "en",
    });

    const transcription = response.text;
    console.log("Transcription:", transcription);

    // Convert the transcription to a Buffer for uploading
    const transcriptionBuffer = Buffer.from(transcription, "utf-8");

    console.log("Uploading transcription to S3");
    const uploadedFileUrl = await uploadFileToStorage(fileId, "transcriptions", transcriptionBuffer, "text/plain");

    console.log("Transcription saved to S3:", uploadedFileUrl);
    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return null;
  }
}

