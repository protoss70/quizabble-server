import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectDB } from './database';
import { getAudioBlob } from './services/elevenlabs';
import { uploadFileToS3 } from './services/s3Uploader';

dotenv.config();
const app = express();
app.use(express.json());

connectDB();

app.get('/', (req: Request, res: Response) => {
  res.send('Server running');
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
  const voiceId = 'uju3wxzG5OhpWcoi3SMy';
  const modelId = 'eleven_multilingual_v2';
  const voiceSettings: VoiceSettings = {
    stability: 0.4,
    similarity_boost: 0.75,
    style: 0.2,
    speaker_boost: true,
  };

  const audioBuffer = await getAudioBlob(text, voiceId, modelId, voiceSettings);
  console.log("GOT THE FILE")
  if (!audioBuffer) {
    throw new Error('Failed to generate audio buffer');
  }

  const mimeType = 'audio/mpeg';
  console.log("starting upload")
  return await uploadFileToS3('tts', 'tts/michael', audioBuffer, mimeType);
}

// Express route to handle TTS requests and upload the resulting audio to S3.
app.post('/tts', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  try {
    const s3Url = await uploadTTSFileToS3(text);
    if (s3Url) {
      res.status(200).json({ message: 'Audio file uploaded successfully', url: s3Url });
    } else {
      res.status(500).json({ error: 'Failed to upload audio file' });
    }
  } catch (error) {
    console.error('Error during TTS processing:', error);
    res.status(500).json({ error: 'An error occurred while generating the audio file' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
