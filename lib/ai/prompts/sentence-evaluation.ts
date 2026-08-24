export function buildSentenceEvaluationPrompt(word: string, sentence: string) {
  return {
    system: `You are an encouraging but precise English writing tutor. You evaluate whether a learner used a specific word naturally and correctly — checking meaning, grammar, and word form (not just that the word literally appears).`,
    user: `The learner is practicing the word "${word}". They wrote this sentence:

"${sentence}"

Evaluate whether "${word}" (or a correct inflected form of it) is used naturally and correctly in context. Consider meaning, grammar, and natural phrasing. Give brief, specific, encouraging feedback (1-3 sentences). If the usage is incorrect or awkward, provide a corrected version of the sentence that keeps as much of the learner's original wording as possible.

Call the provided tool with the structured result.`,
  };
}

export const sentenceEvaluationToolSchema = {
  name: "provide_sentence_evaluation",
  description: "Provide an evaluation of the learner's sentence.",
  input_schema: {
    type: "object" as const,
    properties: {
      isCorrectUsage: { type: "boolean" },
      feedback: { type: "string" },
      correctedSentence: { type: "string" },
    },
    required: ["isCorrectUsage", "feedback"],
  },
};
