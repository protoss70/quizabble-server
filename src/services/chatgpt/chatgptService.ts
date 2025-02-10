import OpenAI from "openai";
import prompts from "./prompts";
import {
  rearrangementQuestionTemplate,
  summaryAndKeywordsTemplate,
  wordMatchingTemplate,
} from "./templates";
import dotenv from "dotenv";
import fs from "fs";
import { shuffleArray } from "../../utils/helper";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getSummaryAndKeywords(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompts.summaryAndKeywords.messages.map((msg) => ({
        role: msg.role,
        content: msg.content.replace("{text}", text),
      })),
      temperature: 0.5,
      max_tokens: 300,
    });

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...summaryAndKeywordsTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.summary = parsedOutput.summary || "";
      result.keywords = parsedOutput.keywords || [];
      result.questions = parsedOutput.questions || [];
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./${timestamp}.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate summary and keywords." };
  }
}

async function rearrangementQuestion(
  criticalQuestions: string[],
  level: "A1" | "A2" | "B1" | "B2",
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.rearrangementQuestionPrompt.messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .replace("{critical_questions}", criticalQuestions.join(", "))
          .replace("{language_level}", level),
      })),
      temperature: 0.5,
      max_tokens: 300,
    });

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...rearrangementQuestionTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.answer = parsedOutput.answer || "";
      result.solution = parsedOutput.solution || "";
    } catch (err) {
      console.error("Failed to parse output:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./${timestamp}_critical_question.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate critical question answer." };
  }
}

async function wordMatchQuestion(
  keywords: string[],
  target_language: string,
  amount: number
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.keywordTranslation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .replace("{keywords}", JSON.stringify(keywords))
          .replace("{target_language}", target_language)
          .replace("{amount}", amount.toString()),
      })),
      temperature: 0.5,
      max_tokens: 200,
    });

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...wordMatchingTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.originalWords = parsedOutput.originalWords || [];
      result.translatedWords = shuffleArray(parsedOutput.translatedWords || []);
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./word_match_${timestamp}.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate word match question." };
  }
}

export { getSummaryAndKeywords, rearrangementQuestion, wordMatchQuestion };
