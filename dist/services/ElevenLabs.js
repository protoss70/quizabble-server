"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.textToSpeech = textToSpeech;
exports.saveAudioFile = saveAudioFile;
// src/services/elevenlabs.ts
const elevenlabsPost_1 = require("../api/elevenlabsPost");
const fs_1 = require("fs");
const path = __importStar(require("path"));
/**
 * Converts text to speech using the ElevenLabs API via an internal service.
 *
 * @param voiceId - The voice/model ID.
 * @param text - The text to convert to speech.
 * @param modelId - (Optional) Model ID if required.
 * @param voiceSettings - (Optional) Additional voice settings.
 * @returns A Promise that resolves with the audio buffer.
 */
function textToSpeech(voiceId, text, modelId, voiceSettings) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, elevenlabsPost_1.callElevenLabsTTS)(voiceId, text, modelId, voiceSettings);
    });
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
function saveAudioFile(text) {
    return __awaiter(this, void 0, void 0, function* () {
        // Michael C. Vincent's voice settings:
        // (Replace 'michael-c-vincent-voice-id' with the actual voice ID)
        console.log("HERE");
        const voiceId = 'uju3wxzG5OhpWcoi3SMy';
        const modelId = 'eleven_multilingual_v2';
        const voiceSettings = {
            stability: 0.4, // 40%
            similarity_boost: 0.75, // 75%
            style: 0.2, // 50%
            speaker_boost: true, // Enabled
        };
        try {
            console.log("SENT");
            // Get the audio buffer from the ElevenLabs API.
            const audioBuffer = yield textToSpeech(voiceId, text, modelId, voiceSettings);
            console.log("RECIEVED");
            // Resolve the path to the 'assets' directory at the project root.
            const assetsDir = path.resolve(__dirname, '../../assets');
            // Ensure the assets directory exists; if not, create it.
            try {
                yield fs_1.promises.access(assetsDir);
            }
            catch (_a) {
                yield fs_1.promises.mkdir(assetsDir, { recursive: true });
            }
            console.log("YES DIRECTORY");
            // Define the file path where the MP3 will be saved.
            const filePath = path.join(assetsDir, 'tts.mp3');
            console.log("WRITING");
            // Write the audio buffer to the MP3 file.
            yield fs_1.promises.writeFile(filePath, audioBuffer);
            console.log(`Audio file saved successfully at ${filePath}`);
        }
        catch (error) {
            console.error('Error saving audio file:', error);
        }
    });
}
