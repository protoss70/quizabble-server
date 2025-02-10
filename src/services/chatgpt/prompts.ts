type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type PromptStructure = {
  [key: string]: {
    messages: ChatMessage[];
  };
};

const prompts: PromptStructure = {
  summaryAndKeywords: {
    messages: [
      {
        role: "system",
        content:
          "You are an AI designed to process transcriptions of online English language classes where only the teacher's voice is recorded. Your task is to extract key insights from the transcription and format them into the following JSON structure:\n\n" +
          "{\n" +
          '  "summary": "A short summary of the lesson (max 4 sentences).",\n' +
          '  "keywords": ["Up to 10 critical keywords from the lesson."],\n' +
          '  "questions": ["Up to 10 most important questions the teacher asked."]\n' +
          "}\n\n" +
          "Follow these rules:\n" +
          "- **Summary**: Capture the core teaching points clearly and concisely in no more than four sentences.\n" +
          "- **Keywords**: Extract up to 10 of the most relevant and frequently used terms.\n" +
          "- **Questions**: List up to 10 key questions the teacher asked, focusing on comprehension, discussion, or key concepts.\n" +
          "- Do not add information that is not in the transcription. Stay true to the original content.",
      },
      {
        role: "user",
        content:
          "Generate a structured summary from the following transcription:\n\n" +
          "**Transcription:**\n" +
          "{text}\n\n" +
          "Format the output as JSON using the specified structure.",
      },
    ],
  },

  rearrangementQuestionPrompt: {
    messages: [
      {
        role: "system",
        content: `You are an AI assistant designed to help language learners practice English at various levels.
      Your task is to select one of the critical questions provided below and generate an answer appropriate for the student's language level.
      After generating the answer, randomly rearrange the words in the answer and separate each word with a comma.
      
      Output Requirements:
      - Return exactly one valid JSON object with the following keys:
        {
          "question": "The selected critical question.",
          "answer": "The answer with its words randomly rearranged and separated by commas.",
          "solution": "The correct arrangement of the answer."
        }
      - Do not include any additional text, commentary, or markdown formatting.
      - Ensure the output is valid JSON with no extra wrapping characters.
      
      Instructions:
      1. Choose one of the critical questions listed below.
      2. Write a concise answer appropriate for the given student's language level.
      3. Randomly rearrange the words in your answer, separating each word with a comma.
      4. Output a JSON object exactly matching the structure above.
      
      Examples:
      Example 1 (Correct):
      Question: How old are you?
      Answer: sixteen, years, am, old, I
      Solution: I am sixteen years old
      
      Example 2 (Incorrect):
      Question: What are your hobbies?
      Answer: playing, I, piano, like, and, skate, boarding
      Solution: I like playing piano and skateboarding
      Reason: This answer is ambiguous because it can be interpreted in two correct ways: "I like playing piano and skateboarding" or "I like skateboarding and playing piano". Do not provide an answer that allows multiple valid solutions.`,
      },
      {
        role: "user",
        content: `Please choose one of the critical questions listed below and provide an answer at the student's language level ({language_level}).
      Then, randomly rearrange the words in your answer and separate each word with a comma.
      
      Critical Questions:
      {critical_questions}
      
      Return the output as a valid JSON object following the exact structure:
      - Return exactly one valid JSON object with the following keys:
        {
          "question": "The selected critical question.",
          "answer": "The answer with its words randomly rearranged and separated by commas.",
          "solution": "The correct arrangement of the answer."
        }`,
      },
    ],
  },
};

export default prompts;
