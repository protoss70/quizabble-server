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
 * Calls the textToSpeech function and returns the resulting audio buffer as a Blob.
 *
 * @param text - The text to be converted to speech.
 * @param voiceId - The ID of the voice to be used.
 * @param modelId - The ID of the model to be used.
 * @param voiceSettings - The voice settings configuration.
 * @returns A Blob containing the generated audio file.
 */
export async function getAudioBlob(
  text: string,
  voiceId: string,
  modelId: string,
  voiceSettings: VoiceSettings
): Promise<Buffer | null> {
  try {
    const audioBuffer = await callElevenLabsTTS(voiceId, text, modelId, voiceSettings);
    
    return audioBuffer;
  } catch (error) {
    console.error('Error generating audio Blob:', error);
    return null;
  }
}


/**
 * Calls the textToSpeech function and saves the resulting audio buffer as an MP3 file
 * in the 'assets' folder located at the project root.
 */
export async function saveAudioFile(text: string) {
  const voiceId = 'uju3wxzG5OhpWcoi3SMy';
  const modelId = 'eleven_multilingual_v2';
  const voiceSettings: VoiceSettings = {
    stability: 0.4,
    similarity_boost: 0.75,
    style: 0.2,
    speaker_boost: true,
  };

  try {
    const audioBuffer = await callElevenLabsTTS(voiceId, text, modelId, voiceSettings);
    const assetsDir = path.resolve(__dirname, '../../assets');

    try {
      await fs.access(assetsDir);
    } catch {
      await fs.mkdir(assetsDir, { recursive: true });
    }

    const filePath = path.join(assetsDir, 'tts.mp3');
    await fs.writeFile(filePath, audioBuffer);

    console.log(`Audio file saved successfully at ${filePath}`);
  } catch (error) {
    console.error('Error saving audio file:', error);
  }
}
