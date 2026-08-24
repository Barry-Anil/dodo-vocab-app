import type { CefrLevel } from "../types";

export function buildTextExtractionPrompt(text: string, userLevel?: CefrLevel, maxWords = 15) {
  return {
    system: `You identify genuinely useful vocabulary for a language learner from a piece of text — words worth learning, not trivial common words (the, is, go, good, etc.) and not proper nouns.`,
    user: `From the following text, identify up to ${maxWords} words or short phrases that would be genuinely useful for a learner to add to their vocabulary. Skip basic/common words${userLevel ? ` a ${userLevel} learner would already know` : ""}, skip proper nouns, skip numbers.

For each word, include the exact sentence from the text it appeared in as "contextSentence", and optionally a brief "reason" it's worth learning.

Text:
"""
${text}
"""

Call the provided tool with the structured result.`,
  };
}

export const textExtractionToolSchema = {
  name: "provide_extracted_vocabulary",
  description: "Provide a list of useful vocabulary words extracted from text.",
  input_schema: {
    type: "object" as const,
    properties: {
      words: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            contextSentence: { type: "string" },
            reason: { type: "string" },
          },
          required: ["text"],
        },
      },
    },
    required: ["words"],
  },
};
