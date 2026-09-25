/**
 * Higgsfield AI image generation
 * Docs: https://docs.higgsfield.ai/docs/guides/images
 * Auth: Authorization: Key {key_id}:{key_secret}
 */

type HiggsfieldSubmit = {
  status?: string;
  request_id?: string;
  status_url?: string;
  cancel_url?: string;
  error?: unknown;
};

type HiggsfieldStatus = {
  status?: string;
  request_id?: string;
  images?: Array<{ url?: string }>;
  error?: unknown;
};

function getCredentials(): { id: string; secret: string } | null {
  const combined =
    process.env.HIGGSFIELD_API_KEY ||
    process.env.HIGGSFIRLD_API_KEY ||
    process.env.HF_API_KEY ||
    "";
  if (combined.includes(":")) {
    const [id, ...rest] = combined.split(":");
    const secret = rest.join(":");
    if (id && secret) return { id: id.trim(), secret: secret.trim() };
  }
  const id =
    process.env.HIGGSFIELD_API_KEY_ID ||
    process.env.HF_API_KEY_ID ||
    "";
  const secret =
    process.env.HIGGSFIELD_API_KEY_SECRET ||
    process.env.HF_API_KEY_SECRET ||
    "";
  if (id && secret) return { id: id.trim(), secret: secret.trim() };
  return null;
}

export function isHiggsfieldConfigured(): boolean {
  return Boolean(getCredentials());
}

function authHeader(): string {
  const creds = getCredentials();
  if (!creds) throw new Error("Higgsfield API key is not configured.");
  return `Key ${creds.id}:${creds.secret}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Generate an image with Higgsfield Soul v2 and return a public CDN URL.
 */
export async function generateHiggsfieldImage({
  prompt,
}: {
  prompt: string;
  aspectRatio?: string;
}): Promise<{ previewUrl: string } | null> {
  const creds = getCredentials();
  if (!creds) return null;

  const submitRes = await fetch(
    "https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard",
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: prompt.slice(0, 2500),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const submitText = await submitRes.text();
  let submit: HiggsfieldSubmit = {};
  try {
    submit = submitText ? JSON.parse(submitText) : {};
  } catch {
    throw new Error(`Higgsfield submit non-JSON (${submitRes.status}): ${submitText.slice(0, 200)}`);
  }

  if (!submitRes.ok) {
    throw new Error(
      `Higgsfield submit failed (${submitRes.status}): ${JSON.stringify(submit)}`,
    );
  }

  const statusUrl =
    submit.status_url ||
    (submit.request_id
      ? `https://api.higgsfield.ai/requests/${submit.request_id}/status`
      : null);

  if (!statusUrl) {
    throw new Error("Higgsfield did not return a status_url or request_id.");
  }

  // Poll until completed (keep within serverless budget)
  const maxAttempts = 24;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(i === 0 ? 1500 : 2500);
    const statusRes = await fetch(statusUrl, {
      headers: {
        Authorization: authHeader(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });
    const statusText = await statusRes.text();
    let status: HiggsfieldStatus = {};
    try {
      status = statusText ? JSON.parse(statusText) : {};
    } catch {
      continue;
    }

    const state = String(status.status || "").toLowerCase();
    if (state === "completed" || state === "success" || state === "succeeded") {
      const url = status.images?.[0]?.url;
      if (url) return { previewUrl: url };
      throw new Error("Higgsfield completed but returned no image URL.");
    }
    if (state === "failed" || state === "canceled" || state === "nsfw") {
      throw new Error(`Higgsfield generation ${state}: ${JSON.stringify(status.error || status)}`);
    }
  }

  throw new Error("Higgsfield generation timed out while polling status.");
}
