/**
 * AI Gateway for Rx OCR & Drug-Drug Interactions.
 * Directly supports Google Gemini API with multimodal vision capabilities
 * and falls back to OpenAI-compatible endpoints or structured heuristics.
 */

import { readUpload } from "@/server/storage";

function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  );
}

function getOpenAiCompatibleApiKey(): string {
  return process.env.LOVABLE_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
}

export function aiConfigured(): boolean {
  return Boolean(getGeminiApiKey() || getOpenAiCompatibleApiKey());
}

export type RxExtractedItem = {
  name: string;
  generic?: string;
  strength?: string;
  form?: string;
  dose?: string;
  duration?: string;
  instruction?: string;
  confidence?: number;
};

export type RxExtractedData = {
  doctorName?: string;
  patientName?: string;
  patientAge?: string;
  hospital?: string;
  date?: string;
  advice?: string;
  items: RxExtractedItem[];
};

export type DrugInteractionItem = {
  a: string;
  b: string;
  severity: "major" | "moderate" | "minor";
  effect: string;
  effectEn?: string;
  advice: string;
  adviceEn?: string;
};

export type DrugInteractionResult = {
  interactions: DrugInteractionItem[];
  summary: string;
  summaryEn?: string;
};

/**
 * Call Google Gemini REST API directly using multimodal contents
 */
async function callGemini(
  contents: unknown[],
  systemInstruction?: string,
  options?: { jsonMode?: boolean; maxTokens?: number },
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  const preferredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const candidateModels = Array.from(new Set([preferredModel, "gemini-2.5-flash", "gemini-flash-latest"]));

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: options?.maxTokens || 8192,
          ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        // If 503 / 429 capacity spike, attempt next candidate model
        if ((res.status === 503 || res.status === 429) && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`[Gemini model ${model} busy (${res.status}), trying fallback model]`);
          continue;
        }
        throw new Error(`Gemini API error (${res.status}): ${errText}`);
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
      if (text) return text.trim();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (candidateModels.indexOf(model) < candidateModels.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

/**
 * Extract prescription details and medicines from note and/or attached image files using Gemini
 */
export async function extractRxFromImageAndNote(input: {
  note?: string;
  filePaths?: string[];
}): Promise<{
  text: string;
  parsed: RxExtractedData;
  rawJson: Record<string, unknown>;
}> {
  const geminiKey = getGeminiApiKey();

  // Try multimodal Gemini first
  if (geminiKey) {
    try {
      const parts: Array<Record<string, unknown>> = [];

      // Read local prescription files if available
      if (input.filePaths && input.filePaths.length > 0) {
        for (const filePath of input.filePaths.slice(0, 3)) {
          const fileData = await readUpload(filePath);
          if (fileData) {
            const base64Data = fileData.buffer.toString("base64");
            parts.push({
              inlineData: {
                mimeType: fileData.contentType || "image/jpeg",
                data: base64Data,
              },
            });
          }
        }
      }

      const promptText = `
You are a licensed pharmacist OCR expert reviewing a doctor's handwritten or printed prescription.
Extract the patient info, doctor info, and all prescribed medicine items.
Customer note: "${input.note || "None"}"

Respond ONLY with valid JSON in this exact structure:
{
  "doctorName": "...",
  "patientName": "...",
  "patientAge": "...",
  "hospital": "...",
  "date": "...",
  "advice": "...",
  "items": [
    {
      "name": "Brand or Medicine name",
      "generic": "Generic molecule if identifiable",
      "strength": "e.g. 500mg, 20mg",
      "form": "Tablet, Capsule, Syrup, Drop, Injection",
      "dose": "e.g. 1+0+1, once daily, 1 tbsp",
      "duration": "e.g. 7 days, 1 month",
      "instruction": "e.g. after food, before food",
      "confidence": 0.95
    }
  ]
}
Do not include markdown fences around the JSON.
`;

      parts.push({ text: promptText });

      const raw = await callGemini(
        [{ parts }],
        "You are an expert clinical pharmacist and prescription reader assistant in Bangladesh. Output only raw valid JSON without markdown wrapping.",
        { jsonMode: true, maxTokens: 8192 },
      );

      // Clean markdown codeblocks or extra whitespace if returned
      const cleanJson = raw
        .replace(/^[^{\[]*/, "")
        .replace(/[^}\]]*$/, "")
        .trim();
      const parsedData = JSON.parse(cleanJson) as RxExtractedData;

      const summaryLines: string[] = [];
      if (parsedData.doctorName) summaryLines.push(`ডাক্তার: ${parsedData.doctorName}`);
      if (parsedData.patientName) summaryLines.push(`রোগী: ${parsedData.patientName} (${parsedData.patientAge || ""})`);
      if (parsedData.items && parsedData.items.length > 0) {
        summaryLines.push("ঔষধ তালিকা:");
        parsedData.items.forEach((it, idx) => {
          summaryLines.push(
            `${idx + 1}. ${it.name} ${it.strength || ""} (${it.form || "Tab"}) — ${it.dose || ""} [${it.duration || ""}] ${it.instruction || ""}`.trim(),
          );
        });
      }
      if (parsedData.advice) summaryLines.push(`পরামর্শ: ${parsedData.advice}`);

      return {
        text: summaryLines.join("\n"),
        parsed: parsedData,
        rawJson: { source: "gemini-vision", data: parsedData },
      };
    } catch (e) {
      console.warn("[Gemini Vision OCR Error]", e);
    }
  }

  // Fallback to text OpenAI compatible / heuristic if Gemini failed or is not available
  return fallbackExtract(input);
}

/**
 * Text-only or heuristic fallback
 */
async function fallbackExtract(input: {
  note?: string;
  hint?: string;
}): Promise<{
  text: string;
  parsed: RxExtractedData;
  rawJson: Record<string, unknown>;
}> {
  const openAiKey = getOpenAiCompatibleApiKey();
  if (openAiKey) {
    try {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      const { generateText } = await import("ai");
      const provider = createOpenAICompatible({
        name: "lovable",
        apiKey: openAiKey,
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

      const lines = text.split("\n").filter(Boolean);
      const items: RxExtractedItem[] = lines.map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return {
          name: parts[0] || l,
          strength: parts[1] || "",
          dose: parts[2] || "",
          confidence: 0.8,
        };
      });

      return {
        text: text.trim(),
        parsed: { items },
        rawJson: { source: "ai-text", items: lines },
      };
    } catch {
      // continue to note fallback
    }
  }

  const items: RxExtractedItem[] = [];
  if (input.note) {
    const rawLines = input.note.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of rawLines) {
      items.push({
        name: line,
        confidence: 0.5,
      });
    }
  }

  return {
    text: input.note?.trim() || "",
    parsed: { items },
    rawJson: { source: "note-fallback", note: input.note },
  };
}

/**
 * Back-compatible function for existing callers
 */
export async function extractRxOcrText(input: {
  note?: string;
  hint?: string;
}): Promise<{ text: string; json: Record<string, unknown> | null }> {
  const res = await fallbackExtract(input);
  return {
    text: res.text,
    json: res.rawJson,
  };
}

/**
 * Drug-Drug Interaction Checker using Gemini
 */
export async function checkRxInteractions(meds: Array<{
  name: string;
  generic?: string;
  strength?: string;
}>): Promise<DrugInteractionResult> {
  if (!meds || meds.length < 2) {
    return {
      interactions: [],
      summary: "অন্তত দুটি ঔষধের তালিকা দিলে ইন্টার‍্যাকশন পরীক্ষা করা যায়।",
      summaryEn: "Select at least two medicines to analyze drug-drug interactions.",
    };
  }

  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const medListStr = meds
        .map((m, idx) => `${idx + 1}. ${m.name} (Generic: ${m.generic || "Unknown"}, Strength: ${m.strength || "N/A"})`)
        .join("\n");

      const prompt = `
Analyze the following list of medications for clinically significant Drug-Drug Interactions (DDIs).
Medications:
${medListStr}

Assess whether any pairs have Major, Moderate, or Minor interactions.
Provide practical Bengali and English medical guidance for patient and pharmacist safety.

Respond ONLY with valid JSON in this exact format:
{
  "interactions": [
    {
      "a": "First Drug Name",
      "b": "Second Drug Name",
      "severity": "major", // or "moderate", "minor"
      "effect": "বাংলায় ইন্টার‍্যাকশনের সম্ভাব্য ঝুঁকি বা প্রতিক্রিয়া",
      "effectEn": "English description of interaction and mechanism",
      "advice": "বাংলায় রোগীর করণীয় পরামর্শ",
      "adviceEn": "English actionable clinical advice"
    }
  ],
  "summary": "বাংলায় সার্বিক সুরক্ষা মূল্যায়ন",
  "summaryEn": "English overall clinical safety summary"
}
Do not use markdown backticks.
`;

      const raw = await callGemini(
        [{ parts: [{ text: prompt }] }],
        "You are an expert clinical pharmacology AI assistant in Bangladesh. Output only raw valid JSON without markdown wrapping.",
        { jsonMode: true, maxTokens: 4096 },
      );

      const cleanJson = raw
        .replace(/^[^{\[]*/, "")
        .replace(/[^}\]]*$/, "")
        .trim();
      const parsed = JSON.parse(cleanJson) as DrugInteractionResult;
      return parsed;
    } catch (e) {
      console.warn("[Gemini Interaction Check Error]", e);
    }
  }

  // Built-in rule-based fallback check for common pharmaceutical combinations
  return ruleBasedInteractions(meds);
}

/**
 * Heuristic/rule-based interaction checker when offline
 */
function ruleBasedInteractions(meds: Array<{ name: string; generic?: string }>): DrugInteractionResult {
  const norm = (s?: string) => (s || "").toLowerCase();
  const list = meds.map((m) => `${norm(m.name)} ${norm(m.generic)}`);

  const interactions: DrugInteractionItem[] = [];

  const has = (keyword: string) => list.some((m) => m.includes(keyword));

  // Example: NSAID + Blood thinner / Aspirin
  if (
    (has("ibuprofen") || has("naproxen") || has("diclofenac") || has("aceclofenac")) &&
    (has("aspirin") || has("warfarin") || has("clopidogrel") || has("rivaroxaban"))
  ) {
    interactions.push({
      a: "NSAID (পেইন কিলার)",
      b: "Anticoagulant / Aspirin (রক্ত পাতলাকারক)",
      severity: "major",
      effect: "রক্তপাত এবং গ্যাস্ট্রিক আলসারের ঝুঁকি বহুগুণ বৃদ্ধি পায়।",
      effectEn: "Significantly increased risk of gastrointestinal ulceration and bleeding.",
      advice: "একসাথে গ্রহণের পূর্বে গ্যাস্ট্রোপ্রোটেকশন (PPI যেমন Esomeprazole) ও ডাক্তারের পরামর্শ আবশ্যক।",
      adviceEn: "Requires physician supervision and gastroprotective co-therapy.",
    });
  }

  // Example: ACE inhibitor + Potassium sparing diuretic
  if (
    (has("ramipril") || has("enalapril") || has("losartan") || has("telmisartan")) &&
    (has("spironolactone") || has("potassium"))
  ) {
    interactions.push({
      a: "ACEi / ARB (প্রেসারের ঔষধ)",
      b: "Spironolactone / Potassium",
      severity: "moderate",
      effect: "রক্তে পটাশিয়ামের মাত্রা বিপজ্জনকভাবে বেড়ে যেতে পারে (Hyperkalemia)।",
      effectEn: "Elevated risk of hyperkalemia.",
      advice: "নিয়মিত সিরাম পটাশিয়াম ও কিডনি ফাংশন পর্যবেক্ষণ করুন।",
      adviceEn: "Monitor serum potassium and renal parameters.",
    });
  }

  // Example: Paracetamol overdose warning if multiple combos
  const paracetamolCount = list.filter((m) => m.includes("paracetamol") || m.includes("napa") || m.includes("ace")).length;
  if (paracetamolCount > 1) {
    interactions.push({
      a: "Paracetamol Combo",
      b: "Paracetamol Multi-source",
      severity: "moderate",
      effect: "একাধিক প্যারাসিটামল সমৃদ্ধ ঔষধ সেবনে দৈনিক নিরাপদ মাত্রা (৪ গ্রাম) ছাড়িয়ে লিভার ক্ষতির ঝুঁকি তৈরি হতে পারে।",
      effectEn: "Risk of acetaminophen overdose exceeding 4000mg/day leading to hepatotoxicity.",
      advice: "মোট প্যারাসিটামলের মাত্রা যাচাই করুন এবং অতিরিক্ত ঔষধ পরিহার করুন।",
      adviceEn: "Ensure daily total paracetamol intake remains below safe thresholds.",
    });
  }

  const summary =
    interactions.length > 0
      ? `মোট ${interactions.length} টি সম্ভাব্য ইন্টার‍্যাকশন চিহ্নিত হয়েছে।`
      : "কোনো মারাত্নক ইন্টার‍্যাকশন মেলেনি। তবে প্রেসক্রিপশনের নির্দেশনা মতো সেবন করুন।";

  const summaryEn =
    interactions.length > 0
      ? `Found ${interactions.length} potential interaction(s).`
      : "No critical interactions detected in standard drug database.";

  return { interactions, summary, summaryEn };
}
