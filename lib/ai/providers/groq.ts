import Groq from "groq-sdk";
import { env } from "@/lib/env";
import { runStructuredCall } from "../structured-call";
import type { AiTaskType } from "../cache";
import {
  wordDetailsSchema,
  generatedQuizSchema,
  weeklyReportSchema,
  recommendationsSchema,
  sentenceEvaluationSchema,
  extractedVocabularySchema,
  AIValidationError,
  type AIService,
  type AICallContext,
  type GenerateWordDetailsInput,
  type GenerateQuizInput,
  type GenerateQuestionsInput,
  type GenerateWeeklyReportInput,
  type GenerateRecommendationsInput,
  type EvaluateSentenceInput,
  type ExtractVocabularyFromTextInput,
  type WordDetails,
  type GeneratedQuiz,
  type WeeklyReport,
  type Recommendations,
  type SentenceEvaluation,
  type ExtractedVocabulary,
} from "../types";
import { buildWordDetailsPrompt, wordDetailsToolSchema } from "../prompts/word-details";
import {
  buildWeeklyQuizPrompt,
  buildAdaptiveQuestionsPrompt,
  quizQuestionsToolSchema,
} from "../prompts/quiz";
import { buildWeeklyReportPrompt, weeklyReportToolSchema } from "../prompts/weekly-report";
import { buildRecommendationsPrompt, recommendationsToolSchema } from "../prompts/recommendations";
import {
  buildSentenceEvaluationPrompt,
  sentenceEvaluationToolSchema,
} from "../prompts/sentence-evaluation";
import { buildTextExtractionPrompt, textExtractionToolSchema } from "../prompts/text-extraction";
import type { z } from "zod";

const PROVIDER_NAME = "groq";

// Constructed lazily, not at module load: `lib/ai/client.ts` imports both
// provider modules regardless of which one is actually selected via
// AI_PROVIDER, and unlike Anthropic's SDK, the Groq SDK throws synchronously
// if `apiKey` is undefined at construction time — which would crash the app
// at startup whenever GROQ_API_KEY is unset, even for deployments running
// AI_PROVIDER=anthropic.
let client: Groq | null = null;
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

/** Tasks routed to the cheaper/faster model — simple classification/evaluation, not creative generation. */
const FAST_MODEL_TASKS: ReadonlySet<AiTaskType> = new Set(["sentence_evaluation", "text_extraction"]);

function modelForTask(taskType: AiTaskType): string {
  return FAST_MODEL_TASKS.has(taskType) ? env.GROQ_FAST_MODEL : env.GROQ_DEFAULT_MODEL;
}

/** Anthropic-shaped tool definitions (name/description/input_schema) reused across providers — adapted here to Groq's OpenAI-compatible function-calling shape. */
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

function toGroqTool(tool: ToolDefinition): Groq.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

/**
 * Calls Groq's OpenAI-compatible chat completions API with a forced
 * tool_choice (so the response is structured JSON, not free text) and hands
 * the parsed tool-call arguments to runStructuredCall, which owns
 * caching/validation/logging identically across providers.
 */
async function callStructured<T>(params: {
  taskType: AiTaskType;
  input: unknown;
  system: string;
  user: string;
  tool: ToolDefinition;
  schema: z.ZodType<T>;
  userId?: string;
}): Promise<T> {
  const { taskType, input, system, user, tool, schema, userId } = params;
  const model = modelForTask(taskType);
  const groqTool = toGroqTool(tool);

  return runStructuredCall({
    taskType,
    input,
    provider: PROVIDER_NAME,
    model,
    userId,
    schema,
    requestPayload: { system, user },
    execute: async () => {
      const response = await getClient().chat.completions.create({
        model,
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [groqTool],
        tool_choice: { type: "function", function: { name: tool.name } },
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.type !== "function") {
        throw new AIValidationError("Provider did not return a tool call.", response.choices[0]?.message);
      }

      let raw: unknown;
      try {
        raw = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new AIValidationError("Provider returned malformed JSON tool arguments.", toolCall.function.arguments);
      }

      return {
        raw,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      };
    },
  });
}

export class GroqAIService implements AIService {
  async generateWordDetails(
    input: GenerateWordDetailsInput,
    context?: AICallContext,
  ): Promise<WordDetails> {
    const { system, user } = buildWordDetailsPrompt(input.word, input.userLevel);
    return callStructured({
      taskType: "word_details",
      input,
      system,
      user,
      tool: wordDetailsToolSchema,
      schema: wordDetailsSchema,
      userId: context?.userId,
    });
  }

  async generateQuiz(input: GenerateQuizInput, context?: AICallContext): Promise<GeneratedQuiz> {
    const { system, user } = buildWeeklyQuizPrompt(
      input.targetWords.map((w) => ({ text: w.word.text, word: w.word })),
      input.questionCount,
    );
    return callStructured({
      taskType: "quiz_generation",
      input: { targetWordIds: input.targetWords.map((w) => w.userWordId), count: input.questionCount },
      system,
      user,
      tool: quizQuestionsToolSchema,
      schema: generatedQuizSchema,
      userId: context?.userId ?? input.userId,
    });
  }

  async generateQuestions(
    input: GenerateQuestionsInput,
    context?: AICallContext,
  ): Promise<GeneratedQuiz> {
    const { system, user } = buildAdaptiveQuestionsPrompt(
      input.wordText,
      input.word,
      input.count,
      input.preferredTypes,
    );
    return callStructured({
      taskType: "question_generation",
      input: {
        userWordId: input.userWordId,
        count: input.count,
        preferredTypes: input.preferredTypes,
      },
      system,
      user,
      tool: quizQuestionsToolSchema,
      schema: generatedQuizSchema,
      userId: context?.userId,
    });
  }

  async generateWeeklyReport(
    input: GenerateWeeklyReportInput,
    context?: AICallContext,
  ): Promise<WeeklyReport> {
    const { system, user } = buildWeeklyReportPrompt(input.weekStartDate, input.statsSnapshot);
    return callStructured({
      taskType: "weekly_report",
      input: { userId: input.userId, weekStartDate: input.weekStartDate },
      system,
      user,
      tool: weeklyReportToolSchema,
      schema: weeklyReportSchema,
      userId: context?.userId ?? input.userId,
    });
  }

  async generateRecommendations(
    input: GenerateRecommendationsInput,
    context?: AICallContext,
  ): Promise<Recommendations> {
    const { system, user } = buildRecommendationsPrompt(input);
    return callStructured({
      taskType: "recommendations",
      input: {
        userId: input.userId,
        level: input.level,
        goals: input.goals,
        weakCategories: input.weakCategories,
        count: input.count,
        knownWordsCount: input.knownWords.length,
      },
      system,
      user,
      tool: recommendationsToolSchema,
      schema: recommendationsSchema,
      userId: context?.userId ?? input.userId,
    });
  }

  async evaluateSentence(
    input: EvaluateSentenceInput,
    context?: AICallContext,
  ): Promise<SentenceEvaluation> {
    const { system, user } = buildSentenceEvaluationPrompt(input.word, input.sentence);
    return callStructured({
      taskType: "sentence_evaluation",
      input,
      system,
      user,
      tool: sentenceEvaluationToolSchema,
      schema: sentenceEvaluationSchema,
      userId: context?.userId,
    });
  }

  async extractVocabularyFromText(
    input: ExtractVocabularyFromTextInput,
    context?: AICallContext,
  ): Promise<ExtractedVocabulary> {
    const MAX_INPUT_CHARS = 8000;
    if (input.text.length > MAX_INPUT_CHARS) {
      throw new Error(`Text is too long (max ${MAX_INPUT_CHARS} characters).`);
    }

    const { system, user } = buildTextExtractionPrompt(input.text, input.userLevel, input.maxWords);
    return callStructured({
      taskType: "text_extraction",
      input,
      system,
      user,
      tool: textExtractionToolSchema,
      schema: extractedVocabularySchema,
      userId: context?.userId,
    });
  }
}
