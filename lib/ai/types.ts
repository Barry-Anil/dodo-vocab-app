import { z } from "zod";

/**
 * Zod schemas for every AIService output shape. Nothing produced by the AI
 * provider ever reaches a domain table (words, quizzes, ...) without first
 * passing one of these — see lib/ai/cache.ts for the validate-then-persist
 * flow.
 */

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const partOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "phrase",
  "other",
]);
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

export const questionTypeSchema = z.enum([
  "multiple_choice",
  "meaning_identification",
  "synonym",
  "antonym",
  "fill_blank",
  "sentence_selection",
  "word_matching",
  "reverse_recall",
  "typing",
  "contextual_usage",
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

// ---- generateWordDetails ---------------------------------------------------

export const wordDetailsSchema = z.object({
  partOfSpeech: partOfSpeechSchema,
  pronunciation: z.string().min(1),
  ipa: z.string().min(1),
  cefrLevel: cefrLevelSchema,
  definition: z.string().min(1),
  simpleExplanation: z.string().min(1),
  practicalExplanation: z.string().min(1),
  examples: z.array(z.string().min(1)).min(2).max(4),
  synonyms: z.array(z.string().min(1)).default([]),
  antonyms: z.array(z.string().min(1)).default([]),
  collocations: z.array(z.string().min(1)).default([]),
  wordFamily: z.array(z.string().min(1)).default([]),
  usageNotes: z.string().min(1),
  commonMistakes: z.string().min(1),
});
export type WordDetails = z.infer<typeof wordDetailsSchema>;

// ---- generateQuiz / generateQuestions --------------------------------------

export const quizQuestionSchema = z.object({
  wordText: z.string().min(1),
  questionType: questionTypeSchema,
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().min(1),
});
export type GeneratedQuizQuestion = z.infer<typeof quizQuestionSchema>;

export const generatedQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;

// ---- generateWeeklyReport ---------------------------------------------------

export const weeklyReportSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string().min(1)).default([]),
  weakAreas: z.array(z.string().min(1)).default([]),
  strategySuggestions: z.array(z.string().min(1)).default([]),
});
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;

export const weeklyStatsSnapshotSchema = z.object({
  wordsLearned: z.number().int().nonnegative(),
  wordsMastered: z.number().int().nonnegative(),
  reviewsCompleted: z.number().int().nonnegative(),
  reviewAccuracy: z.number().min(0).max(1).nullable(),
  quizAverageScore: z.number().min(0).max(100).nullable(),
  currentStreak: z.number().int().nonnegative(),
  strongestCategory: z.string().nullable(),
  weakestCategory: z.string().nullable(),
});
export type WeeklyStatsSnapshot = z.infer<typeof weeklyStatsSnapshotSchema>;

// ---- generateRecommendations ------------------------------------------------

export const recommendationsSchema = z.object({
  recommendedWords: z
    .array(
      z.object({
        text: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .min(1),
});
export type Recommendations = z.infer<typeof recommendationsSchema>;

// ---- evaluateSentence --------------------------------------------------------

export const sentenceEvaluationSchema = z.object({
  isCorrectUsage: z.boolean(),
  feedback: z.string().min(1),
  correctedSentence: z.string().optional(),
});
export type SentenceEvaluation = z.infer<typeof sentenceEvaluationSchema>;

// ---- extractVocabularyFromText -----------------------------------------------

export const extractedVocabularySchema = z.object({
  words: z
    .array(
      z.object({
        text: z.string().min(1),
        contextSentence: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .default([]),
});
export type ExtractedVocabulary = z.infer<typeof extractedVocabularySchema>;

// ---- AIService interface -----------------------------------------------------

export interface GenerateWordDetailsInput {
  word: string;
  userLevel?: CefrLevel;
}

export interface GenerateQuizInput {
  userId: string;
  /** (userWordId, word) pairs the quiz should be built from. */
  targetWords: Array<{ userWordId: string; word: WordDetails & { text: string } }>;
  questionCount: number;
}

export interface GenerateQuestionsInput {
  userWordId: string;
  wordText: string;
  word: WordDetails;
  count: number;
  preferredTypes?: QuestionType[];
}

export interface GenerateWeeklyReportInput {
  userId: string;
  weekStartDate: string;
  statsSnapshot: WeeklyStatsSnapshot;
}

export interface GenerateRecommendationsInput {
  userId: string;
  level: CefrLevel;
  goals: string[];
  knownWords: string[];
  weakCategories: string[];
  count: number;
}

export interface EvaluateSentenceInput {
  word: string;
  sentence: string;
}

export interface ExtractVocabularyFromTextInput {
  text: string;
  userLevel?: CefrLevel;
  maxWords?: number;
}

/**
 * Optional call context, separate from the task input itself — carries the
 * requesting user for ai_generations logging/rate-limiting even on methods
 * whose task input has no natural "userId" field (e.g. generateWordDetails,
 * whose result is shared/canonical, not user-scoped).
 */
export interface AICallContext {
  userId?: string;
}

/**
 * Provider-agnostic AI service. Callers depend only on this interface (via
 * getAIService() in client.ts) — nothing outside lib/ai/providers should
 * import a specific provider SDK.
 */
export interface AIService {
  generateWordDetails(input: GenerateWordDetailsInput, context?: AICallContext): Promise<WordDetails>;
  generateQuiz(input: GenerateQuizInput, context?: AICallContext): Promise<GeneratedQuiz>;
  generateQuestions(input: GenerateQuestionsInput, context?: AICallContext): Promise<GeneratedQuiz>;
  generateWeeklyReport(input: GenerateWeeklyReportInput, context?: AICallContext): Promise<WeeklyReport>;
  generateRecommendations(input: GenerateRecommendationsInput, context?: AICallContext): Promise<Recommendations>;
  evaluateSentence(input: EvaluateSentenceInput, context?: AICallContext): Promise<SentenceEvaluation>;
  extractVocabularyFromText(
    input: ExtractVocabularyFromTextInput,
    context?: AICallContext,
  ): Promise<ExtractedVocabulary>;
}

/** Thrown when a provider response fails Zod validation, even after retry. */
export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown,
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}

/** Thrown when a user has exceeded their AI rate limit for a task type. */
export class AIRateLimitError extends Error {
  constructor(message = "You're generating too quickly. Please wait a moment and try again.") {
    super(message);
    this.name = "AIRateLimitError";
  }
}
