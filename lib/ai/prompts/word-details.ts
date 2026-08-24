import type { CefrLevel } from "../types";

export function buildWordDetailsPrompt(word: string, userLevel?: CefrLevel) {
  return {
    system: `You are a vocabulary-learning content writer for an English vocabulary app. You write clear, natural, everyday-useful content — never artificial or overly academic phrasing. Examples must sound like something a native speaker would actually say or write.`,
    user: `Generate structured vocabulary details for the English word or phrase: "${word}".
${userLevel ? `The learner's level is roughly ${userLevel} — keep the definition and explanations understandable at that level, but the examples should still show natural, real usage.` : ""}

Requirements:
- 2 to 4 example sentences, natural and useful in everyday life (not contrived).
- A "simple explanation" a beginner could understand in one sentence.
- A "practical explanation" that shows when/how someone would actually use this word.
- Real synonyms, antonyms, and collocations (common word pairings) — omit ones that don't naturally exist for this word rather than inventing weak ones.
- "Usage notes" covering register (formal/informal), common contexts, or nuance.
- "Common mistakes" learners make with this specific word (confusion with a similar word, wrong preposition, etc.) — if there's truly no common mistake, say so briefly.
- Assign the CEFR level (A1-C2) that best matches how advanced this word is.

Call the provided tool with the structured result.`,
  };
}

export const wordDetailsToolSchema = {
  name: "provide_word_details",
  description: "Provide structured vocabulary details for a word.",
  input_schema: {
    type: "object" as const,
    properties: {
      partOfSpeech: {
        type: "string",
        enum: [
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
        ],
      },
      pronunciation: { type: "string", description: "Human-readable pronunciation guide." },
      ipa: { type: "string", description: "IPA transcription, e.g. /rɪˈlʌktənt/." },
      cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
      definition: { type: "string" },
      simpleExplanation: { type: "string" },
      practicalExplanation: { type: "string" },
      examples: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
      synonyms: { type: "array", items: { type: "string" } },
      antonyms: { type: "array", items: { type: "string" } },
      collocations: { type: "array", items: { type: "string" } },
      wordFamily: { type: "array", items: { type: "string" } },
      usageNotes: { type: "string" },
      commonMistakes: { type: "string" },
    },
    required: [
      "partOfSpeech",
      "pronunciation",
      "ipa",
      "cefrLevel",
      "definition",
      "simpleExplanation",
      "practicalExplanation",
      "examples",
      "synonyms",
      "antonyms",
      "collocations",
      "wordFamily",
      "usageNotes",
      "commonMistakes",
    ],
  },
};
