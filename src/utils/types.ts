export type LanguageLevels = 'A1' | 'A2' | 'B1' | 'B2';

export enum QuestionTypes {
  Rearrangement = "Rearrangement",
  WordMatch = "WordMatch",
  MultipleChoice = "MultipleChoice",
  FillInTheBlank = "FillInTheBlank",
  // Listening   
  RearrangementListening = "Rearrangement-Listening",
  FillInTheBlankListening = "FillInTheBlank-Listening"
}

export type GetSummaryAndKeywordsParams = {
  fileId: string;
};

export type RearrangementQuestionType = {
  type: QuestionTypes.Rearrangement | QuestionTypes.RearrangementListening;
  criticalQuestions: string[];
  level: LanguageLevels;
};

export type WordMatchType = {
  type: QuestionTypes.WordMatch;
  keywords: string[];
  target_language: string;
  amount: number;
};

export type FillInBlankType = {
  type: QuestionTypes.FillInTheBlank | QuestionTypes.FillInTheBlankListening;
  criticalQuestions: string[];
  languageLevel: string;
  amount: number;
};

export type MultipleChoiceType = {
  type: QuestionTypes.MultipleChoice;
  criticalQuestions: string[];
  level: LanguageLevels;
};