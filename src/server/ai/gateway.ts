/**
 * Minimal AI gateway for Rx OCR / assistants.
 * Uses OpenAI-compatible endpoint when LOVABLE_API_KEY (or AI_GATEWAY_API_KEY) is set.
 * Dynamic imports keep the AI SDK out of cold paths that break prerender.
 */

function apiKey() {
  return process.env.LOVABLE_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
}

export function aiConfigured() {
  return Boolean(apiKey());
}

export async function extractRxOcrText(input: {
  note?: string;
  hint?: string;
}): Promise<{ text: string; json: Record<string, unknown> | null }> {
  const key = apiKey();
  if (!key) {
    return {
      text: input.note?.trim() || "",
      json: input.note ? { source: "note-fallback", note: input.note } : null,
    };
  }

  try {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const { generateText } = await import("ai");
    const provider = createOpenAICompatible({
      name: "lovable",
      apiKey: key,
      baseURL: process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1",
    });

    const prompt = [
      "Extract medicine names, strengths, and doses from this pharmacy prescription note.",
      "Reply with plain text lines: name | strength | dose.",
      input.hint ? `Hint: ${input.hint}` : "",
      `Note:\n${input.note || "(empty)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { text } = await generateText({
      model: provider(process.env.AI_MODEL || "gpt-4o-mini"),
      prompt,
      maxOutputTokens: 800,
    });
    return {
      text: text.trim(),
      json: { source: "ai", items: text.split("\n").filter(Boolean) },
    };
  } catch {
    return {
      text: input.note?.trim() || "",
      json: { source: "ai-error-fallback", note: input.note },
    };
  }
}
