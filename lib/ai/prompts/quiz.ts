import type { WordDetails, QuestionType } from "../types";

const QUESTION_TYPES: QuestionType[] = [
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
];

export function buildWeeklyQuizPrompt(
  targetWords: Array<{ text: string; word: WordDetails }>,
  questionCount: number,
) {
  return {
    system: `You are an assessment writer for an English vocabulary app. You write varied, fair quiz questions that test real understanding of a word, not just rote pattern-matching. Every question must be answerable from general English knowledge plus the word info given — never require outside facts.`,
    user: `Create a ${questionCount}-question quiz covering these words:

${targetWords.map((w, i) => `${i + 1}. "${w.text}" (${w.word.partOfSpeech}) — ${w.word.definition}\n   Examples: ${w.word.examples.join(" | ")}\n   Synonyms: ${w.word.synonyms.join(", ") || "none"}\n   Antonyms: ${w.word.antonyms.join(", ") || "none"}`).join("\n\n")}

Rules:
- Cover every word at least once across the quiz.
- Vary the question type across questions — do NOT use the same question_type for every word. Draw from: ${QUESTION_TYPES.join(", ")}.
- For multiple_choice / synonym / antonym / word_matching / sentence_selection questions, provide 3-4 "options" including exactly one correct answer, with plausible distractors (not obviously wrong).
- For fill_blank, write a natural sentence with a blank ("___") where the word belongs.
- For typing/reverse_recall, the questionText should describe the word (via definition or context) and correctAnswer is the target word itself.
- "correctAnswer" must exactly match one of the "options" when options are given, or the target word/phrase otherwise.
- Set "wordText" to the exact word this question is testing.

Call the provided tool with the structured result.`,
  };
}

export function buildAdaptiveQuestionsPrompt(
  wordText: string,
  word: WordDetails,
  count: number,
  preferredTypes?: QuestionType[],
) {
  const types = preferredTypes && preferredTypes.length > 0 ? preferredTypes : QUESTION_TYPES;
  return {
    system: `You are an assessment writer for an English vocabulary app, generating extra practice questions for a word the learner has been struggling with. The goal is genuine understanding from multiple angles, not memorizing one fixed question.`,
    user: `Generate ${count} DIFFERENT question(s) for the word "${wordText}" (${word.partOfSpeech}) — ${word.definition}.
Examples: ${word.examples.join(" | ")}
Synonyms: ${word.synonyms.join(", ") || "none"}
Antonyms: ${word.antonyms.join(", ") || "none"}
Common mistakes: ${word.commonMistakes}

Use a different question_type for each question, drawn from: ${types.join(", ")}. Do not repeat the same question_type twice in this set.
For multiple_choice / synonym / antonym / sentence_selection questions, provide 3-4 plausible "options" with exactly one correct answer.
Set "wordText" to "${wordText}" for every question.

Call the provided tool with the structured result.`,
  };
}

export const quizQuestionsToolSchema = {
  name: "provide_quiz_questions",
  description: "Provide a list of structured quiz questions.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            wordText: { type: "string" },
            questionType: {
              type: "string",
              enum: QUESTION_TYPES,
            },
            questionText: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correctAnswer: { type: "string" },
          },
          required: ["wordText", "questionType", "questionText", "correctAnswer"],
        },
      },
    },
    required: ["questions"],
  },
};
