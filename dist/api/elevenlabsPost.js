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
exports.callElevenLabsTTS = callElevenLabsTTS;
// src/api/elevenlabsApi.ts
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
    console.error(new Error("ELEVENLABS_API_KEY is not defined in environment variables."));
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
function callElevenLabsTTS(voiceId, text, modelId, voiceSettings) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        const headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        };
        // Create the payload for the API request.
        const payload = { text };
        // Add model ID if provided.
        if (modelId) {
            payload.model_id = modelId;
        }
        // Add voice settings if provided.
        if (voiceSettings) {
            if (voiceSettings.stability !== undefined)
                payload.stability = voiceSettings.stability;
            if (voiceSettings.similarity_boost !== undefined)
                payload.similarity_boost = voiceSettings.similarity_boost;
            if (voiceSettings.style !== undefined)
                payload.style = voiceSettings.style;
            if (voiceSettings.speaker_boost !== undefined)
                payload.speaker_boost = voiceSettings.speaker_boost;
        }
        try {
            // Make the POST request to the ElevenLabs API.
            const response = yield axios_1.default.post(url, payload, {
                headers,
                responseType: "arraybuffer", // to handle binary audio data
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            console.error("Error calling ElevenLabs API:", error);
            throw error;
        }
    });
}
