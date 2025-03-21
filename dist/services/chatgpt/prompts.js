"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompts = {
    summaryAndKeywords: {
        messages: [
            {
                role: "system",
                content: "You are an AI designed to process transcriptions of online English language classes where only the teacher's voice is recorded. Your task is to extract key insights from the transcription and format them into the following JSON structure:\n\n" +
                    "{\n" +
                    '  "summary": "A short summary of the lesson (max 4 sentences).",\n' +
                    '  "keywords": ["Up to 20 critical keywords from the lesson."],\n' +
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
                content: "Generate a structured summary from the following transcription:\n\n" +
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
                content: `You are an AI assistant designed to help language learners practice English at various levels. Your task is to select one of the critical questions provided below and generate an answer appropriate for the student's language level.
        After generating the answer, randomly rearrange the words in the answer and separate each word with a comma.
        Additionally, generate a new parameter \"options\", which is an array of extra words that are not necessary for the correct solution.
        The number of extra words in the \"options\" array should be equal to the number of words in the correct solution, so that the total pool of words (from \"answer\" and \"options\") is twice the number of words in the solution.
        
        Output Requirements:\n- Return exactly one valid JSON object with the following keys:
          {
            \"question\": \"The selected critical question.\",
                \"answer\": \"The answer with its words randomly rearranged and separated by commas.\",
                    \"solution\": \"The correct arrangement of the answer.\",
                        \"options\": [\"An array of extra words\"]
                          }
                        - Do not include any additional text, commentary, or markdown formatting.
                        - Ensure the output is valid JSON with no extra wrapping characters.
                        
                        Instructions:
                        1. Choose one of the critical questions listed below.
                        2. Write a concise answer appropriate for the given student's language level.
                        3. Randomly rearrange the words in your answer, separating each word with a comma.
                        4. Generate an array \"options\" containing extra words that are not part of the correct answer. The number of extra words should equal the number of words in the solution.
                        5. Output a JSON object exactly matching the structure above.
                        
                        Examples:\nExample 1 (Correct):
                        Question: How old are you?
                        Answer: sixteen, years, am, old, I
                        Solution: I am sixteen years old
                        Options: [\"do\", \"have\", \"been\", \"my\", \"today\"]
                        (Note: The number of extra words in Options is equal to the number of words in the solution: 5 words.)
                        
                        Example 2:
                        Question: What do you study?
                        Answer: English, study, I
                        Solution: I study English
                        Options: [\"am\", \"are\", \"living\"]
                        (Note: The number of extra words in Options is equal to the number of words in the solution: 3 words.)`,
            },
            {
                role: "user",
                content: `Please choose one of the critical questions listed below and provide an answer at the student's language level ({language_level}).
        Then, randomly rearrange the words in your answer and separate each word with a comma.
        Additionally, generate an \"options\" array containing extra words that are not necessary for the correct solution. The number of extra words should equal the number of words in the solution, so that the total number of words (answer plus options) is twice the number of words in the solution.
        
        Critical Questions:
        {critical_questions}
        
        Return the output as a valid JSON object following the exact structure:
        {
          \"question\": \"The selected critical question.\",
            \"answer\": \"The answer with its words randomly rearranged and separated by commas.\",
              \"solution\": \"The correct arrangement of the answer.\",
                \"options\": [\"An array of extra words\"]
                }`,
            },
        ],
    },
    wordRearrangementEngToTargetPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an AI assistant that helps language learners practice vocabulary in their target language.
  
        **Task:**
        - You will be given a list of English **keywords**.
        - Randomly choose **one** keyword from the list.
        - Translate it accurately into **{targetLanguage}**.
        - Generate **{amount}** incorrect but believable options in **{targetLanguage}** that are not correct translations of the keyword.
        - Return all options in a shuffled order, including the correct translation.
        
        **Output Requirements:**
        - Return a valid JSON object in the following format:
        {
          "question": "<keyword you chose from the list>",
          "options": ["<translated word>", "<incorrect1>", "<incorrect2>", ...],
          "answer": "<correct translation>"
        }
        - The total number of options must be equal to {amount} + 1.
        - Do NOT include any extra explanation, markdown, or formatting—just a valid JSON object.
        - All words in "options" must be single-word responses (not phrases or sentences).
        
        **Example Input:**
        {
          "keywords": ["car", "bus", "train", "plane"],
          "amount": 3,
          "targetLanguage": "Turkish"
        }
        
        **Example Output:**
        {
          "question": "car",
          "options": ["Araba", "Uçak", "Kamyon", "Tren"],
          "answer": "Araba"
        }`,
            },
            {
                role: "user",
                content: `Generate a vocabulary translation and word rearrangement question using these parameters:
        - Keywords: {keywords}
        - Number of Incorrect Options: {amount}
        - Target Language: {targetLanguage}
        
        Make sure the output matches the format and requirements.`,
            },
        ],
    },
    rearrangementQuestionEngToTargetPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an AI assistant that helps language learners practice by generating rearrangement questions in their target language.
        
        **Task:**
        - Choose one of the critical questions from the provided list.
        - Write a concise answer in **English** appropriate for the given student's language level ({student_level}).
        - **Use this English answer as the question.**
        - Translate the answer into {target_language}.
        - Generate {amount} additional incorrect words in {target_language} that are not part of the answer.

        **Output Requirements:**
        - Return a valid JSON object with the following structure:
        {
          "question": "<English answer you came up with>",
          "options": ["<word1>", "<word2>", "<word3>", ..., "<wordN>"],
          "answer": "<correct answer with words in proper order in {target_language}>"
        }
        - The total number of words in "options" should be equal to the number of words in "answer" + {amount} incorrect words.
        - Do not include any additional text, commentary, or markdown formatting.
        - Ensure the output is a valid JSON object with no extra characters.

        **Example Input:**
        {
          "critical_questions": ["How long have you been playin electric guitar?"],
          "student_level": "B1",
          "amount": 4,
          "target_language": "Turkish"
        }

        **Example Output:**
        {
          "question": "I have been playing electric guitar for five years.",
          "options": ["gitar", "beş", "elektrik", "yıldır", "oynamak", "okuyorum", "için", "çalıyorum", "sinemaya"]
          "answer": "beş yıldır elektrik gitar çalıyorum"
        }`,
            },
            {
                role: "user",
                content: `Generate a rearrangement question using the following parameters:
        - Critical Questions: {critical_questions}
        - Student Level: {student_level}
        - Amount of Incorrect Options: {amount}
        - Target Language: {target_language}

        Ensure the output follows the specified JSON format.`,
            },
        ],
    },
    rearrangementQuestionTargetToEngPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an AI assistant that helps language learners practice by generating rearrangement questions where the question is in the target language, and the answer and options are in English.

        **Task:**
        - Choose one of the critical questions from the provided list.
        - Write a concise answer in **English** appropriate for the given student's language level ({student_level}).
        - **Translate the English answer into {target_language} and use it as the question in the resulting json.**
        - Generate {amount} additional incorrect words in **English** that are not part of the correct answer.

        **Output Requirements:**
        - Return a valid JSON object with the following structure:
        {
          "question": "<translated answer in {target_language}>",
          "options": ["<word1>", "<word2>", "<word3>", ..., "<wordN>"],
          "answer": "<correct answer with words in proper order in English>"
        }
        - The total number of words in "options" should be equal to the number of words in "answer" + {amount} incorrect words.
        - Do not include any additional text, commentary, or markdown formatting.
        - Ensure the output is a valid JSON object with no extra characters.

        **Example Input:**
        {
          "critical_questions": ["How long have you been playing electric guitar?"],
          "student_level": "B1",
          "amount": 4,
          "target_language": "Turkish"
        }

        **Example Output:**
        {
          "question": "Beş yıldır elektrik gitar çalıyorum.",
          "options": ["I", "have", "been", "playing", "electric", "guitar", "for", "five", "years", "school", "read", "cinema"],
          "answer": "I have been playing electric guitar for five years."
        }`,
            },
            {
                role: "user",
                content: `Generate a rearrangement question using the following parameters:
        - Critical Questions: {critical_questions}
        - Student Level: {student_level}
        - Amount of Incorrect Options: {amount}
        - Target Language: {target_language}

        Ensure the output follows the specified JSON format.`,
            },
        ],
    },
    keywordTranslationQuestionPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an AI language assistant that helps with keyword translation.
        Your task is to select a subset of important keywords from the given list and translate them into the target language.
        
        Output Requirements:
        - Return a valid JSON object with the following structure:
          {
            "originalWords": ["Selected keywords in the original language"],
            "translatedWords": ["Corresponding translations in the target language"]
          }
        - Ensure that the number of translated words matches the number of original words.
        - The translations should be accurate and contextually appropriate.
        - Do not include additional text, explanations, or comments.
        - **Do not include Markdown formatting, backticks, or any extra text. Only return the JSON object.**`,
            },
            {
                role: "user",
                content: `Translate a {amount} of the following keywords into {target_language} and return them in the specified JSON format:
        
        Keywords: {keywords}
        
        - Return a valid JSON object with the following structure:
          {
            "originalWords": ["Selected keywords in the original language"],
            "translatedWords": ["Corresponding translations in the target language"]
          }`,
            },
        ],
    },
    fillInBlankQuestionPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an expert language teacher assisting language learners practice English at various levels.
  Your task is to select one of the critical questions provided below and generate an answer appropriate for the student's language level.
  After generating the answer, remove exactly {amount} words from the answer by replacing each removed word with an underscore ("_").
  
  Output Requirements:
  - Return exactly one valid JSON object with the following keys:
    {
      "question": "The selected critical question.",
      "answer": "The answer with {amount} words removed and replaced by underscores.",
      "solution": ["replacement1", "replacement2", ...],
      "options": ["option1", "option2", ...]
    }
  - Do not include any additional text, commentary, or markdown formatting.
  - Ensure the output is valid JSON with no extra wrapping characters.
  
  Instructions:
  1. Choose one of the critical questions listed below.
  2. Write a concise answer appropriate for the student's language level ({language_level}).
  3. Remove exactly {amount} words from your answer, replacing each removed word with an underscore ("_").
  4. Return a JSON object exactly matching the structure above, with the "solution" array containing the removed words in the order they appeared in the original answer.
  5. Also, provide an "options" array containing {option_amount} strings representing possible words to fill in the blank(s). One of these options must be the correct answer (i.e., the word in the "solution" array), and the other options should be plausible distractors.
  6. In the options there should be only {amount} correct answers and the rest should be incorrect. Rewrite the options until this is true
  7. Don't return any markdown.
  
  Examples:
  Example 1 (Correct):
  Question: What is your favorite subject?
  Answer: My favorite _ is math.
  Solution: ["subject"]
  Options: ["food", "material", "subject"]
  
  Example 2 (Incorrect):
  Question: How do you prepare for an exam?
  Answer: I _ review my notes and _ practice problems.
  Solution: ["thoroughly", "regularly"]
  Reason: The solutions are not clear and can be interchanged with other words. For example, "thoroughly" could be mistaken for "tirelessly", and "regularly" for "always". The blanks should have a single clear answer!
  
  Note: The number of underscores in the answer must equal {amount}.`,
            },
            {
                role: "user",
                content: `Please choose one of the critical questions listed below and provide an answer at the student's language level ({language_level}).
  Then, remove exactly {amount} words from your answer by replacing them with underscores ("_"), and include a list of {option_amount} options (possible words to fill in the blanks) in the output.

  
  Critical Questions:
  {critical_questions}
  
  Return the output as a valid JSON object following the exact structure:
  {
    "question": "The selected critical question.",
    "answer": "The answer with {amount} words removed and replaced by underscores.",
    "solution": ["replacement1", "replacement2", ...],
    "options": ["option1", "option2", ...]
  }`,
            },
        ],
    },
    multipleChoiceQuestionPrompt: {
        messages: [
            {
                role: "system",
                content: `You are an AI assistant that helps generate multiple-choice questions for language learners.
        Your task is to select one keyword from the provided list, translate it into the target language, 
        and generate a multiple-choice question with the correct translation as one option and distractor options.

        **Instructions:**
        1. Randomly select one keyword from the provided list.
        2. Translate the selected keyword into {TargetLanguage}.
        3. Generate {Amount} incorrect but plausible translations in {TargetLanguage}.

        **Output Requirements:**
        - Return a valid JSON object with the following structure:
        {
          "question": "<selected keyword>",
          "options": ["<translated option 1>", "<translated option 2>", ..., "<translated option N>"],
          "answer": "<correct translated option>"
        }
        - Ensure all options and the correct answer are in {TargetLanguage}.
        - Do not provide explanations or additional formatting—only return the JSON object.

        **Example Input:**
        Keywords: ["apple", "car", "mountain"]
        Amount: 3
        TargetLanguage: French

        **Example Output:**
        {
          "question": "apple",
          "options": ["pomme", "voiture", "montagne", "chaise"],
          "answer": "pomme"
        }
        `,
            },
            {
                role: "user",
                content: `Generate a multiple-choice question based on the following parameters:
        Keywords: {Keywords}
        Amount: {Amount}
        TargetLanguage: {TargetLanguage}
        
        Ensure the output is a valid JSON object matching the required format.`,
            },
        ],
    },
    multipleChoiceQuestionPromptOLD: {
        messages: [
            {
                role: "system",
                content: `You are an AI assistant designed to help language learners practice English at various levels.
        Your task is to choose one of the critical questions provided below and generate four possible answers.
        Only ONE of the answers should be correct, while the other three should be plausible but incorrect.
        
        Output Requirements:
        - Return exactly one valid JSON object with the following keys:
          {
            "question": "The selected critical question.",
            "options": ["The correct answer.", "Incorrect answer 1.", "Incorrect answer 2.", "Incorrect answer 3."]
          }
        - The correct answer must always be the first element in the "options" array.
        - Do not include any additional text, commentary, or markdown formatting.
        - Ensure the output is valid JSON with no extra wrapping characters.
        
        Instructions:
        1. Choose one of the critical questions from the list below.
        2. Write a concise and appropriate answer for the student's language level ({language_level}).
        3. Generate three incorrect answers that are plausible but clearly wrong.
        4. Place the correct answer at index 0 of the "options" array and shuffle the incorrect answers into the remaining slots.
        5. Output a valid JSON object exactly following the specified structure.
        
        Example Output:
        {
          "question": "What is the capital of France?",
          "options": ["Paris", "London", "Berlin", "Madrid"]
        }`,
            },
            {
                role: "user",
                content: `Please choose one of the critical questions listed below and provide four possible answers.
        Only ONE answer should be correct, while the other three should be incorrect but plausible.
        
        Critical Questions:
        {critical_questions}
        
        Language Level: {language_level}
        
        Return the output as a valid JSON object following this exact structure:
        {
          "question": "The selected critical question.",
          "options": ["The correct answer.", "Incorrect answer 1.", "Incorrect answer 2.", "Incorrect answer 3."]
        }`,
            },
        ],
    },
};
exports.default = prompts;
