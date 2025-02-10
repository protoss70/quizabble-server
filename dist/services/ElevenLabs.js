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
exports.getAudioBlob = getAudioBlob;
exports.saveAudioFile = saveAudioFile;
// src/services/elevenlabs.ts
const elevenlabsPost_1 = require("../api/elevenlabsPost");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const voices = {
    michael: {
        voiceId: "uju3wxzG5OhpWcoi3SMy",
        modelId: "eleven_multilingual_v2",
        voiceSettings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.2,
            speaker_boost: true,
        },
    },
    jeff: {
        voiceId: "gs0tAILXbY5DNrJrsM6F",
        modelId: "eleven_multilingual_v2",
        voiceSettings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.2,
            speaker_boost: true,
        },
    },
};
/**
 * Calls the textToSpeech function and returns the resulting audio buffer as a Blob.
 *
 * @param text - The text to be converted to speech.
 * @param voiceKey - key for which voice config to be used
 * @returns A Blob containing the generated audio file.
 */
function getAudioBlob(text, voiceKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { voiceId, modelId, voiceSettings } = voices[voiceKey];
            const audioBuffer = yield (0, elevenlabsPost_1.callElevenLabsTTS)(voiceId, text, modelId, voiceSettings);
            return audioBuffer;
        }
        catch (error) {
            console.error("Error generating audio Blob:", error);
            return null;
        }
    });
}
/**
 * Calls the textToSpeech function and saves the resulting audio buffer as an MP3 file
 * in the 'assets' folder located at the project root.
 */
function saveAudioFile(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const voiceId = "uju3wxzG5OhpWcoi3SMy";
        const modelId = "eleven_multilingual_v2";
        const voiceSettings = {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.2,
            speaker_boost: true,
        };
        try {
            const audioBuffer = yield (0, elevenlabsPost_1.callElevenLabsTTS)(voiceId, text, modelId, voiceSettings);
            const assetsDir = path.resolve(__dirname, "../../assets");
            try {
                yield fs_1.promises.access(assetsDir);
            }
            catch (_a) {
                yield fs_1.promises.mkdir(assetsDir, { recursive: true });
            }
            const filePath = path.join(assetsDir, "tts.mp3");
            yield fs_1.promises.writeFile(filePath, audioBuffer);
            console.log(`Audio file saved successfully at ${filePath}`);
        }
        catch (error) {
            console.error("Error saving audio file:", error);
        }
    });
}
