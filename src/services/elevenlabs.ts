// src/services/elevenlabs.ts
import { callElevenLabsTTS } from '../api/elevenlabsPost';
import { promises as fs } from 'fs';
import * as path from 'path';

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speaker_boost?: boolean;
}

/**
 * Converts text to speech using the ElevenLabs API via an internal service.
 *
 * @param voiceId - The voice/model ID.
 * @param text - The text to convert to speech.
 * @param modelId - (Optional) Model ID if required.
 * @param voiceSettings - (Optional) Additional voice settings.
 * @returns A Promise that resolves with the audio buffer.
 */
export async function textToSpeech(
  voiceId: string,
  text: string,
  modelId?: string,
  voiceSettings?: VoiceSettings
): Promise<Buffer> {
  return callElevenLabsTTS(voiceId, text, modelId, voiceSettings);
}

/**
 * Calls the textToSpeech function and saves the resulting audio buffer as an MP3 file
 * in the 'assets' folder located at the project root.
 *
 * This configuration uses the following settings for Michael C. Vincent:
 * - Model: Eleven Multilingual v2
 * - Stability: 40%
 * - Similarity: 75%
 * - Style: 50%
 * - Speaker boost: Enabled
 */
export async function saveAudioFile(text: string) {
  // Michael C. Vincent's voice settings:
  // (Replace 'michael-c-vincent-voice-id' with the actual voice ID)
  console.log("HERE")
  const voiceId = 'uju3wxzG5OhpWcoi3SMy';
  const modelId = 'eleven_multilingual_v2';
  const voiceSettings: VoiceSettings = {
    stability: 0.4,         // 40%
    similarity_boost: 0.75,   // 75%
    style: 0.2,               // 50%
    speaker_boost: true,      // Enabled
  };

  try {
    console.log("SENT")
    // Get the audio buffer from the ElevenLabs API.
    const audioBuffer = await textToSpeech(voiceId, text, modelId, voiceSettings);
    console.log("RECIEVED")
    // Resolve the path to the 'assets' directory at the project root.
    const assetsDir = path.resolve(__dirname, '../../assets');

    // Ensure the assets directory exists; if not, create it.
    try {
      await fs.access(assetsDir);
    } catch {
      await fs.mkdir(assetsDir, { recursive: true });
    }
    console.log("YES DIRECTORY")
    // Define the file path where the MP3 will be saved.
    const filePath = path.join(assetsDir, 'tts.mp3');
    console.log("WRITING")
    // Write the audio buffer to the MP3 file.
    await fs.writeFile(filePath, audioBuffer);

    console.log(`Audio file saved successfully at ${filePath}`);
  } catch (error) {
    console.error('Error saving audio file:', error);
  }
}
