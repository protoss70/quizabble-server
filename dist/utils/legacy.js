"use strict";
/**
 * Generates an audio buffer from text using the ElevenLabs TTS API and uploads it to S3.
 *
 * @param text - The text to be converted to speech.
 * @returns The URL of the uploaded audio file if successful.
 */
// export async function uploadTTSFileToS3(text: string): Promise<string | null> {
//   const audioBuffer = await getAudioBlob(text, "michael");
//   if (!audioBuffer) {
//     throw new Error("Failed to generate audio buffer");
//   }
//   const mimeType = "audio/mpeg";
//   console.log("starting upload");
//   return await uploadFileToStorage("tts", "tts/michael", audioBuffer, mimeType);
// }
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
