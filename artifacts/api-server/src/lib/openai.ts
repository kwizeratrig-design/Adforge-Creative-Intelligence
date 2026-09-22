type JsonRecord = Record<string, unknown>;

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

async function openAIResponse(input: unknown, schemaName: string, schema: JsonRecord) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${raw.slice(0, 500)}`);
  }

  const payload = JSON.parse(raw) as { output_text?: string };
  if (!payload.output_text) throw new Error("OpenAI returned no structured output.");
  return JSON.parse(payload.output_text) as JsonRecord;
}

const conceptSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    concepts: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          family: { type: "string" },
          angle: { type: "string" },
          visualDirection: { type: "string" },
          hook: { type: "string" },
          headline: { type: "string" },
          bodyCopy: { type: "string" },
          cta: { type: "string" },
          composition: { type: "string" },
          colorDirection: { type: "string" },
          emotion: { type: "string" },
          audienceInsight: { type: "string" },
        },
        required: ["name","family","angle","visualDirection","hook","headline","bodyCopy","cta","composition","colorDirection","emotion","audienceInsight"],
      },
    },
  },
  required: ["concepts"],
};

const inspectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    passed: { type: "boolean" },
    brandConsistency: { type: "integer", minimum: 0, maximum: 100 },
    promptAdherence: { type: "integer", minimum: 0, maximum: 100 },
    productConsistency: { type: "integer", minimum: 0, maximum: 100 },
    visualQuality: { type: "integer", minimum: 0, maximum: 100 },
    textAccuracy: { type: "integer", minimum: 0, maximum: 100 },
    languageCorrectness: { type: "integer", minimum: 0, maximum: 100 },
    unexpectedElements: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
    repairInstructions: { type: "array", items: { type: "string" } },
  },
  required: ["passed","brandConsistency","promptAdherence","productConsistency","visualQuality","textAccuracy","languageCorrectness","unexpectedElements","failures","repairInstructions"],
};

export async function generateCreativeConceptSet(input: {
  brand: unknown;
  campaign: unknown;
}) {
  const result = await openAIResponse(
    [{
      role: "system",
      content: "You are AdForge's Creative Director. Build five genuinely different advertising concepts. Use only supplied facts. Never invent claims, prices, proof, testimonials, features, or guarantees. Concepts must differ across strategy, emotion, visual treatment, copy approach, and composition.",
    }, {
      role: "user",
      content: JSON.stringify({
        brand: input.brand,
        campaign: input.campaign,
        requiredCreativeTerritories: [
          "Problem → Solution","Product Demonstration","Lifestyle","Pattern Interrupt",
          "Editorial","Curiosity","Education","Objection Handling","Product Hero","Customer Story",
        ],
      }),
    }],
    "adforge_concepts",
    conceptSchema,
  );
  return (result?.concepts as JsonRecord[] | undefined) ?? null;
}

export async function inspectCreative(input: {
  imageUrl: string;
  brand: unknown;
  campaign: unknown;
  creative: unknown;
}) {
  return openAIResponse(
    [{
      role: "system",
      content: "You are AdForge's visual quality inspector. Inspect the supplied ad image against the structured campaign and brand requirements. Be conservative: critical failures should not pass. Scores are internal heuristics, not scientific measurements. Do not infer facts not visible or supplied.",
    }, {
      role: "user",
      content: [
        { type: "input_text", text: JSON.stringify({ brand: input.brand, campaign: input.campaign, creative: input.creative }) },
        { type: "input_image", image_url: input.imageUrl, detail: "high" },
      ],
    }],
    "adforge_quality_check",
    inspectionSchema,
  );
}
