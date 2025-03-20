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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummaryAndKeywords = getSummaryAndKeywords;
exports.rearrangementQuestion = rearrangementQuestion;
exports.wordMatchQuestion = wordMatchQuestion;
exports.fillInTheBlankQuestion = fillInTheBlankQuestion;
exports.multipleChoiceQuestion = multipleChoiceQuestion;
exports.wordMultipleChoiceQuestion = wordMultipleChoiceQuestion;
exports.rearrangementQuestionEngToTarget = rearrangementQuestionEngToTarget;
exports.rearrangementQuestionTargetToEng = rearrangementQuestionTargetToEng;
const openai_1 = __importDefault(require("openai"));
const prompts_1 = __importDefault(require("./prompts"));
const templates_1 = require("./templates");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const helper_1 = require("../../utils/helper");
const storage_1 = require("../storage");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Downloads the file content from S3, then generates a summary and keywords.
 * @param fileId - The unique file identifier.
 * @returns The result containing summary, keywords, and questions, or an error message.
 */
function getSummaryAndKeywords(fileId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d, _e;
        try {
            // Fetch file content from S3
            const fileStream = yield (0, storage_1.getFileFromStorage)(fileId, "transcriptions");
            if (!fileStream) {
                throw new Error("File not found in S3.");
            }
            // Read the file stream and convert it to text
            const chunks = [];
            try {
                for (var _f = true, fileStream_1 = __asyncValues(fileStream), fileStream_1_1; fileStream_1_1 = yield fileStream_1.next(), _a = fileStream_1_1.done, !_a; _f = true) {
                    _c = fileStream_1_1.value;
                    _f = false;
                    const chunk = _c;
                    // Ensure each chunk is a Buffer, convert if necessary
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_f && !_a && (_b = fileStream_1.return)) yield _b.call(fileStream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            const fileText = Buffer.concat(chunks).toString("utf-8");
            // Call OpenAI to generate summary and keywords
            const response = yield openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: prompts_1.default.summaryAndKeywords.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content.replace("{text}", fileText),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || "";
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
                result.options = parsedOutput.options || [];
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
                messages: prompts_1.default.keywordTranslationQuestionPrompt.messages.map((msg) => ({
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
function fillInTheBlankQuestion(criticalQuestions, languageLevel, amount) {
    return __awaiter(this, void 0, void 0, function* () {
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
function multipleChoiceQuestion(criticalQuestions, level) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.multipleChoiceQuestionPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{critical_questions}", criticalQuestions.join(", "))
                        .replace("{language_level}", level),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.multipleChoiceQuestionTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.options = (0, helper_1.shuffleArray)(parsedOutput.options || []);
            }
            catch (err) {
                console.error("Failed to parse output:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./${timestamp}_multiple_choice_question.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate multiple choice question." };
        }
    });
}
function wordMultipleChoiceQuestion(keywords, amount, targetLanguage) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.multipleChoiceQuestionPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{Keywords}", keywords.join(", "))
                        .replace("{Amount}", amount.toString())
                        .replace("{TargetLanguage}", targetLanguage),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.multipleChoiceQuestionTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.options = parsedOutput.options || [];
                result.answer = parsedOutput.answer || "";
            }
            catch (err) {
                console.error("Failed to parse output:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./${timestamp}_multiple_choice_question.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate multiple-choice question." };
        }
    });
}
function rearrangementQuestionEngToTarget(criticalQuestions, studentLevel, amount, targetLanguage) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.rearrangementQuestionEngToTargetPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{critical_questions}", JSON.stringify(criticalQuestions))
                        .replace("{student_level}", studentLevel)
                        .replace("{amount}", amount.toString())
                        .replace("{target_language}", targetLanguage),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.rearrangementQuestionTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.options = parsedOutput.options || [];
                result.answer = parsedOutput.answer || "";
            }
            catch (err) {
                console.error("Failed to parse JSON response:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./rearrangement_${timestamp}.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate rearrangement question." };
        }
    });
}
function rearrangementQuestionTargetToEng(criticalQuestions, studentLevel, amount, targetLanguage) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: prompts_1.default.rearrangementQuestionTargetToEngPrompt.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                        .replace("{critical_questions}", JSON.stringify(criticalQuestions))
                        .replace("{student_level}", studentLevel)
                        .replace("{amount}", amount.toString())
                        .replace("{target_language}", targetLanguage),
                })),
                temperature: 0.5,
                max_tokens: 300,
            });
            const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            const result = Object.assign({}, templates_1.rearrangementQuestionTemplate);
            try {
                const parsedOutput = JSON.parse(rawOutput);
                result.question = parsedOutput.question || "";
                result.options = parsedOutput.options || [];
                result.answer = parsedOutput.answer || "";
            }
            catch (err) {
                console.error("Failed to parse JSON response:", err);
            }
            // Save result to a file
            const timestamp = new Date()
                .toLocaleTimeString("en-GB", { hour12: false })
                .replace(/:/g, "_");
            const filePath = `./rearrangement_target_to_eng_${timestamp}.txt`;
            fs_1.default.writeFileSync(filePath, JSON.stringify(result, null, 2));
            console.log(`File saved: ${filePath}`);
            return result;
        }
        catch (error) {
            console.error("Error calling OpenAI:", error);
            return { error: "Failed to generate rearrangement question." };
        }
    });
}
