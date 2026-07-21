import "server-only";

import { createHash, createHmac } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = { key: string; url: string; path: string };

function encodedPath(value: string) { return value.split("/").map(encodeURIComponent).join("/"); }
function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
function hmac(key: Buffer | string, value: string) { return createHmac("sha256", key).update(value).digest(); }

function storageConfig() {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secret = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  if (endpoint && accessKey && secret && bucket) return { endpoint, accessKey, secret, bucket, region: process.env.S3_REGION || "auto" };
  if (process.env.NODE_ENV === "production") throw new Error("S3 storage configuration is required in production.");
  return null;
}

async function signedRequest(method: "PUT" | "DELETE", key: string, body?: Buffer) {
  const config = storageConfig();
  if (!config) throw new Error("S3 is not configured.");
  const url = new URL(`${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodedPath(key)}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? "");
  const headers = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical = `${method}\n${url.pathname}\n\n${headers}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/${config.region}/s3/aws4_request`;
  const toSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonical)}`;
  const dateKey = hmac(`AWS4${config.secret}`, date);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(toSign).digest("hex");
  const response = await fetch(url, { method, headers: {
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate,
    ...(body ? { "content-type": "image/jpeg" } : {})
  }, body: body ? new Uint8Array(body) : undefined });
  if (!response.ok) throw new Error(`Object storage ${method} failed (${response.status}).`);
  return url;
}

export async function storeTrainingImage(key: string, body: Buffer): Promise<StoredObject> {
  const config = storageConfig();
  if (config) {
    const url = await signedRequest("PUT", key, body);
    const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    return { key, path: key, url: publicBase ? `${publicBase}/${encodedPath(key)}` : url.toString() };
  }
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  return { key, path: filePath, url: `/uploads/${key}` };
}

export async function deleteTrainingImage(object: StoredObject) {
  const config = storageConfig();
  if (config) { await signedRequest("DELETE", object.key); return; }
  await unlink(object.path).catch(() => undefined);
}
