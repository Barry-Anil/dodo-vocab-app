import Anthropic from "@anthropic-ai/sdk";
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

const PROVIDER_NAME = "anthropic";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** Tasks routed to the cheaper/faster model — simple classification/evaluation, not creative generation. */
const FAST_MODEL_TASKS: ReadonlySet<AiTaskType> = new Set(["sentence_evaluation", "text_extraction"]);

function modelForTask(taskType: AiTaskType): string {
  return FAST_MODEL_TASKS.has(taskType) ? env.ANTHROPIC_FAST_MODEL : env.ANTHROPIC_DEFAULT_MODEL;
}

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
}

/**
 * Calls Anthropic with a forced tool_choice (so the response is structured
 * JSON, not free text) and hands the raw tool input to runStructuredCall,
 * which owns caching/validation/logging identically across providers.
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

  return runStructuredCall({
    taskType,
    input,
    provider: PROVIDER_NAME,
    model,
    userId,
    schema,
    requestPayload: { system, user },
    execute: async () => {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
      });

      const toolUseBlock = response.content.find((block) => block.type === "tool_use");
      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        throw new AIValidationError("Provider did not return a tool_use block.", response.content);
      }

      return {
        raw: toolUseBlock.input,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      };
    },
  });
}

export class AnthropicAIService implements AIService {
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
        // Known words affect the prompt but not the cache key's identity
        // beyond a length signal, to avoid an enormous/unstable hash input.
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
