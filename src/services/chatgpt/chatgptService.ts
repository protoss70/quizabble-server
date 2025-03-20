import OpenAI from "openai";
import prompts from "./prompts";
import {
  fillInTheBlankTemplate,
  multipleChoiceQuestionTemplate,
  rearrangementQuestionTemplate,
  summaryAndKeywordsTemplate,
  wordMatchingTemplate,
} from "./templates";
import dotenv from "dotenv";
import fs from "fs";
import { shuffleArray } from "../../utils/helper";
import { getFileFromStorage } from "../storage";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Downloads the file content from S3, then generates a summary and keywords.
 * @param fileId - The unique file identifier.
 * @returns The result containing summary, keywords, and questions, or an error message.
 */
async function getSummaryAndKeywords(fileId: string) {
  try {
    // Fetch file content from S3
    const fileStream = await getFileFromStorage(fileId, "transcriptions");

    if (!fileStream) {
      throw new Error("File not found in S3.");
    }

    // Read the file stream and convert it to text
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      // Ensure each chunk is a Buffer, convert if necessary
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const fileText = Buffer.concat(chunks).toString("utf-8");

    // Call OpenAI to generate summary and keywords
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompts.summaryAndKeywords.messages.map((msg) => ({
        role: msg.role,
        content: msg.content.replace("{text}", fileText),
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
      result.options = parsedOutput.options || [];
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
  amount: number,
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.keywordTranslationQuestionPrompt.messages.map(
        (msg) => ({
          role: msg.role,
          content: msg.content
            .replace("{keywords}", JSON.stringify(keywords))
            .replace("{target_language}", target_language)
            .replace("{amount}", amount.toString()),
        }),
      ),
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

async function fillInTheBlankQuestion(
  criticalQuestions: string[],
  languageLevel: string,
  amount: number,
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.fillInBlankQuestionPrompt.messages.map((msg) => ({
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

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...fillInTheBlankTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.answer = parsedOutput.answer || "";
      result.solution = parsedOutput.solution || [];
      result.options = parsedOutput.options || [];
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./fill_in_blank_${timestamp}.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate fill-in-the-blank question." };
  }
}

async function multipleChoiceQuestion(
  criticalQuestions: string[],
  level: "A1" | "A2" | "B1" | "B2",
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.multipleChoiceQuestionPrompt.messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .replace("{critical_questions}", criticalQuestions.join(", "))
          .replace("{language_level}", level),
      })),
      temperature: 0.5,
      max_tokens: 300,
    });

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...multipleChoiceQuestionTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.options = shuffleArray(parsedOutput.options || []);
    } catch (err) {
      console.error("Failed to parse output:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./${timestamp}_multiple_choice_question.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate multiple choice question." };
  }
}

async function wordMultipleChoiceQuestion(
  keywords: string[],
  amount: number,
  targetLanguage: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.multipleChoiceQuestionPrompt.messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .replace("{Keywords}", keywords.join(", "))
          .replace("{Amount}", amount.toString())
          .replace("{TargetLanguage}", targetLanguage),
      })),
      temperature: 0.5,
      max_tokens: 300,
    });

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...multipleChoiceQuestionTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.options = parsedOutput.options || [];
      result.answer = parsedOutput.answer || "";
    } catch (err) {
      console.error("Failed to parse output:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./${timestamp}_multiple_choice_question.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate multiple-choice question." };
  }
}

async function rearrangementQuestionEngToTarget(
  criticalQuestions: string[],
  studentLevel: "A1" | "A2" | "B1" | "B2",
  amount: number,
  targetLanguage: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.rearrangementQuestionEngToTargetPrompt.messages.map((msg) => ({
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

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...rearrangementQuestionTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.options = parsedOutput.options || [];
      result.answer = parsedOutput.answer || "";
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./rearrangement_${timestamp}.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate rearrangement question." };
  }
}

async function rearrangementQuestionTargetToEng(
  criticalQuestions: string[],
  studentLevel: "A1" | "A2" | "B1" | "B2",
  amount: number,
  targetLanguage: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: prompts.rearrangementQuestionTargetToEngPrompt.messages.map((msg) => ({
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

    const rawOutput = response.choices[0]?.message?.content || "";
    const result = { ...rearrangementQuestionTemplate };

    try {
      const parsedOutput = JSON.parse(rawOutput);
      result.question = parsedOutput.question || "";
      result.options = parsedOutput.options || [];
      result.answer = parsedOutput.answer || "";
    } catch (err) {
      console.error("Failed to parse JSON response:", err);
    }

    // Save result to a file
    const timestamp = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .replace(/:/g, "_");
    const filePath = `./rearrangement_target_to_eng_${timestamp}.txt`;
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`File saved: ${filePath}`);

    return result;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return { error: "Failed to generate rearrangement question." };
  }
}

export {
  getSummaryAndKeywords,
  rearrangementQuestion,
  wordMatchQuestion,
  fillInTheBlankQuestion,
  multipleChoiceQuestion,
  wordMultipleChoiceQuestion,
  rearrangementQuestionEngToTarget,
  rearrangementQuestionTargetToEng,
};
