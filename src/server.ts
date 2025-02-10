import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectDB } from "./services/database";
import { getAudioBlob } from "./services/elevenlabs";
import { uploadFileToS3 } from "./services/s3Uploader";
import { rearrangementQuestion, wordMatchQuestion } from "./services/chatgpt/chatgptService";

dotenv.config();
const app = express();
app.use(express.json());

connectDB();

app.get("/", (req: Request, res: Response) => {
  res.send("Server running");
});

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speaker_boost?: boolean;
}

/**
 * Generates an audio buffer from text using the ElevenLabs TTS API and uploads it to S3.
 *
 * @param text - The text to be converted to speech.
 * @returns The URL of the uploaded audio file if successful.
 */
export async function uploadTTSFileToS3(text: string): Promise<string | null> {
  const audioBuffer = await getAudioBlob(text, "michael");
  if (!audioBuffer) {
    throw new Error("Failed to generate audio buffer");
  }

  const mimeType = "audio/mpeg";
  console.log("starting upload");
  return await uploadFileToS3("tts", "tts/michael", audioBuffer, mimeType);
}

// app.post("/summarize", async (req: Request, res: Response): Promise<void> => {
//   try {
//     const result = await wordMatchQuestion(["introduction",
//     "music",
//     "instruments",
//     "viola",
//     "electric guitar",
//     "concert",
//     "band",
//     "hobbies",
//     "favorite artist",
//     "songwriting"], "Turkish", 5)

//     // const result = await rearrangementQuestion(
//     //   [
//     //     "Could you please introduce yourself?",
//     //     "Which grade are you in?",
//     //     "Do you have any hobbies other than studying?",
//     //     "What instruments do you play?",
//     //     "How long have you been playing electric guitar?",
//     //     "Who is your favorite singer?",
//     //     "Have you ever been to a concert by your favorite band?",
//     //     "How was the feedback from the audience?",
//     //     "Why do you want to play viola?",
//     //     "Do you want to write your own songs?",
//     //   ],
//     //   "A1",
//     // );
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
