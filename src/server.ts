import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectDB } from './database';
import { saveAudioFile } from './services/elevenlabs';

dotenv.config();
const app = express();
app.use(express.json());

connectDB();

app.get('/', (req: Request, res: Response) => {
  res.send('Server running');
});

// New route for handling text-to-speech
app.post('/tts', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body; // Extract the text from the request body

  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  try {
    // Call saveAudioFile to generate and save the audio file
    await saveAudioFile(text);
    res.status(200).json({ message: 'Audio file saved successfully' });
  } catch (error) {
    console.error('Error during TTS processing:', error);
    res.status(500).json({ error: 'An error occurred while generating the audio file' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
