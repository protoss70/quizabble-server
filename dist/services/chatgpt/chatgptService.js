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
exports.getSummaryAndKeywords = getSummaryAndKeywords;
exports.rearrangementQuestion = rearrangementQuestion;
exports.wordMatchQuestion = wordMatchQuestion;
exports.fillInTheBlankQuestion = fillInTheBlankQuestion;
const openai_1 = __importDefault(require("openai"));
const prompts_1 = __importDefault(require("./prompts"));
const templates_1 = require("./templates");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const helper_1 = require("../../utils/helper");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function getSummaryAndKeywords(text) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: prompts_1.default.summaryAndKeywords.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content.replace("{text}", text),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.summaryAndKeywordsTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.summary = parsedOutput.summary || "";
                result.keywords = parsedOutput.keywords || [];
                result.questions = parsedOutput.questions || [];
            }
            catch (err) {
                console.error("Failed to parse JSON response:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./${timestamp}.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate summary and keywords." };
        }
    });
}
function rearrangementQuestion(criticalQuestions, level) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.rearrangementQuestionPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{critical_questions}", criticalQuestions.join(", "))
                        .replace("{language_level}", level),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.rearrangementQuestionTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.answer = parsedOutput.answer || "";
                result.solution = parsedOutput.solution || "";
            }
            catch (err) {
                console.error("Failed to parse output:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./${timestamp}_critical_question.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate critical question answer." };
        }
    });
}
function wordMatchQuestion(keywords, target_language, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.keywordTranslation.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{keywords}", JSON.stringify(keywords))
                        .replace("{target_language}", target_language)
                        .replace("{amount}", amount.toString()),
                })),
                temperature: 0.5,
                max_tokens: 200,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.wordMatchingTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.originalWords = parsedOutput.originalWords || [];
                result.translatedWords = (0, helper_1.shuffleArray)(parsedOutput.translatedWords || []);
            }
            catch (err) {
                console.error("Failed to parse JSON response:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./word_match_${timestamp}.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate word match question." };
        }
    });
}
function fillInTheBlankQuestion(criticalQuestions_1, languageLevel_1, amount_1) {
    return __awaiter(this, arguments, void 0, function* (criticalQuestions, languageLevel, amount, option_amount = 4) {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.fillInBlankQuestionPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{language_level}", languageLevel)
                        .replace("{critical_questions}", JSON.stringify(criticalQuestions))
                        .replace("{amount}", amount.toString())
                        .replace("{option_amount}", (amount * 2 + 1).toString()),
                })),
                temperature: 0.5,
                max_tokens: 200,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.fillInTheBlankTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.answer = parsedOutput.answer || "";
                result.solution = parsedOutput.solution || [];
                result.options = parsedOutput.options || [];
            }
            catch (err) {
                console.error("Failed to parse JSON response:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./fill_in_blank_${timestamp}.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate fill-in-the-blank question." };
        }
    });
}
