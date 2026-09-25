import { ObjectStorageService } from "./objectStorage";
import { isBlobConfigured, rehostUrlToBlob } from "./blobStorage";

const DEFAULT_MODEL = "black-forest-labs/flux-schnell";
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

type ReplicatePrediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: unknown;
};

function modelParts() {
  const model = process.env.REPLICATE_MODEL || DEFAULT_MODEL;
  const [owner, name] = model.split("/");
  if (!owner || !name || model.includes(":")) {
    throw new Error(
      "REPLICATE_MODEL must be an official Replicate model in owner/name form.",
    );
  }
  return { owner, name };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Keep the provider response as text when it is not JSON.
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload)
        : String(payload);
    throw new Error(`Replicate request failed (${response.status}): ${detail}`);
  }

  return payload as T;
}

async function replicateRequest<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN (or REPLICATE_API_KEY) must be configured to generate images.");
  }
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`https://api.replicate.com${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(60_000),
  });
  return parseResponse<T>(response);
}

function outputUrl(output: unknown): string | undefined {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (typeof candidate === "string") return candidate;
  if (
    candidate &&
    typeof candidate === "object" &&
    "url" in candidate &&
    typeof candidate.url === "string"
  ) {
    return candidate.url;
  }
  return undefined;
}

function aspectRatio(value: string) {
  const supported = new Set([
    "1:1",
    "16:9",
    "21:9",
    "3:2",
    "2:3",
    "4:5",
    "5:4",
    "9:16",
    "9:21",
  ]);
  return supported.has(value) ? value : "4:5";
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function generateAndStoreReplicateImage({
  prompt,
  aspectRatio: ratio,
  referenceImages = [],
}: {
  prompt: string;
  aspectRatio: string;
  referenceImages?: string[];
}) {
  const { owner, name } = modelParts();
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio(ratio),
    num_outputs: 1,
    output_format: "jpg",
    output_quality: 90,
  };
  const imageInputField = process.env.REPLICATE_IMAGE_INPUT_FIELD;
  if (imageInputField && referenceImages[0]) {
    input[imageInputField] = referenceImages[0];
  }
  let prediction = await replicateRequest<ReplicatePrediction>(
    `/v1/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
    },
  );

  const deadline = Date.now() + 120_000;
  while (
    prediction.id &&
    prediction.status &&
    !TERMINAL_STATUSES.has(prediction.status) &&
    Date.now() < deadline
  ) {
    await wait(2_000);
    prediction = await replicateRequest<ReplicatePrediction>(
      `/v1/predictions/${prediction.id}`,
      { method: "GET" },
    );
  }

  if (prediction.status !== "succeeded") {
    const detail =
      typeof prediction.error === "string"
        ? prediction.error
        : `Prediction ended with status "${prediction.status || "unknown"}".`;
    throw new Error(detail);
  }

  const generatedUrl = outputUrl(prediction.output);
  if (!generatedUrl) {
    throw new Error("Replicate returned no image output.");
  }

  // 1) Vercel Blob (preferred — no Google Cloud)
  if (isBlobConfigured()) {
    try {
      const hosted = await rehostUrlToBlob(generatedUrl);
      return { previewUrl: hosted.url, objectPath: hosted.pathname };
    } catch (err) {
      console.error("Vercel Blob rehost failed, using Replicate URL:", err);
    }
  }

  // 2) Google Cloud object storage (optional legacy)
  try {
    const imageResponse = await fetch(generatedUrl, {
      signal: AbortSignal.timeout(60_000),
    });
    if (imageResponse.ok) {
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      const contentType =
        imageResponse.headers.get("content-type") || "image/jpeg";
      const objectStorage = new ObjectStorageService();
      const uploadUrl = await objectStorage.getObjectEntityUploadURL();
      const objectPath = objectStorage.normalizeObjectEntityPath(uploadUrl);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: bytes,
        signal: AbortSignal.timeout(60_000),
      });
      if (uploadResponse.ok) {
        return {
          previewUrl: `/api/storage${objectPath}`,
          objectPath,
        };
      }
    }
  } catch {
    // not configured
  }

  // 3) Replicate CDN URL (works for demos)
  return {
    previewUrl: generatedUrl,
    objectPath: null,
  };
}
