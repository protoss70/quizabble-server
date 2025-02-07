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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const elevenlabs_1 = require("./services/elevenlabs");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
(0, database_1.connectDB)();
app.get('/', (req, res) => {
    res.send('Server running');
});
// New route for handling text-to-speech
app.post('/tts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { text } = req.body; // Extract the text from the request body
    if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
    }
    try {
        // Call saveAudioFile to generate and save the audio file
        yield (0, elevenlabs_1.saveAudioFile)(text);
        res.status(200).json({ message: 'Audio file saved successfully' });
    }
    catch (error) {
        console.error('Error during TTS processing:', error);
        res.status(500).json({ error: 'An error occurred while generating the audio file' });
    }
}));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
