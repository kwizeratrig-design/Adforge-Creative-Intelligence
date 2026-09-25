import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Upload bytes (or a remote URL body) to Vercel Blob and return a permanent public URL.
 */
export async function uploadToBlob({
  data,
  contentType,
  filename,
}: {
  data: Buffer | ArrayBuffer | Blob | File | ReadableStream | string;
  contentType?: string;
  filename?: string;
}): Promise<{ url: string; pathname: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  const name = filename || `adforge/${randomUUID()}.jpg`;
  const blob = await put(name, data, {
    access: "public",
    contentType: contentType || "image/jpeg",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/**
 * Download a remote image and re-host it on Vercel Blob.
 */
export async function rehostUrlToBlob(sourceUrl: string, filename?: string) {
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await res.arrayBuffer());
  return uploadToBlob({
    data: bytes,
    contentType,
    filename: filename || `adforge/gen-${randomUUID()}.jpg`,
  });
}
