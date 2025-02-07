// src/api/elevenlabsApi.ts
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error(new Error('ELEVENLABS_API_KEY is not defined in environment variables.'));
}


/**
 * Sends a request to the ElevenLabs API to convert text to speech.
 *
 * @param voiceId - The voice/model ID to use.
 * @param text - The text to convert to speech.
 * @param modelId - (Optional) An additional model ID parameter if required.
 * @param voiceSettings - (Optional) Voice settings such as stability, similarity, style, and speaker boost.
 * @returns A Promise that resolves with the audio buffer.
 */
export async function callElevenLabsTTS(
  voiceId: string,
  text: string,
  modelId?: string,
  voiceSettings?: { stability?: number; similarity_boost?: number; style?: number; speaker_boost?: boolean }
): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const headers = {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'audio/mpeg'
  };

  // Create the payload for the API request.
  const payload: { text: string; model_id?: string; stability?: number; similarity_boost?: number; style?: number; speaker_boost?: boolean } = { text };
  
  // Add model ID if provided.
  if (modelId) {
    payload.model_id = modelId;
  }

  // Add voice settings if provided.
  if (voiceSettings) {
    if (voiceSettings.stability !== undefined) payload.stability = voiceSettings.stability;
    if (voiceSettings.similarity_boost !== undefined) payload.similarity_boost = voiceSettings.similarity_boost;
    if (voiceSettings.style !== undefined) payload.style = voiceSettings.style;
    if (voiceSettings.speaker_boost !== undefined) payload.speaker_boost = voiceSettings.speaker_boost;
  }

  try {
    // Make the POST request to the ElevenLabs API.
    const response = await axios.post(url, payload, {
      headers,
      responseType: 'arraybuffer' // to handle binary audio data
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error calling ElevenLabs API:', error);
    throw error;
  }
}
