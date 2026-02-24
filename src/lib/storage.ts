import { nanoid } from "nanoid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const USE_S3 = !!process.env.S3_BUCKET_NAME;

let s3: S3Client | null = null;
function getS3() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }
  return s3;
}

const BUCKET = process.env.S3_BUCKET_NAME || "";

// ─── Local filesystem fallback (dev only) ───────────────────────────────
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function uploadAudio(params: {
  userId: string;
  file: Buffer;
  contentType: string;
  fileExtension: string;
}) {
  const key = `audio/${params.userId}/${nanoid()}.${params.fileExtension}`;

  if (USE_S3) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: params.file,
        ContentType: params.contentType,
      })
    );
    const url = await getSignedUrl(
      getS3(),
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 3600 * 24 * 7 }
    );
    return { url, key };
  }

  // Local fallback
  const filepath = path.join(UPLOAD_DIR, key);
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, params.file);
  // Use API route for serving audio (works in both dev and production)
  const url = `${BASE_URL}/api/audio/${key.replace(/^audio\//, "")}`;
  return { url, key };
}

export async function downloadAudio(urlOrKey: string): Promise<Buffer> {
  if (USE_S3) {
    // If it's a full URL, extract the key; otherwise treat as key
    const key = urlOrKey.includes("/uploads/")
      ? urlOrKey.replace(/.*\/uploads\//, "")
      : urlOrKey.startsWith("audio/")
        ? urlOrKey
        : urlOrKey;

    // If it looks like an S3 key, download from S3
    if (key.startsWith("audio/")) {
      const result = await getS3().send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key })
      );
      const chunks: Uint8Array[] = [];
      const stream = result.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
  }

  // If it's a full HTTP(S) URL, always fetch via HTTP
  // (critical for cloud deployments where worker runs in a separate container)
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    const response = await fetch(urlOrKey);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  // Local filesystem (dev only — same-process access)
  const uploadsMatch = urlOrKey.match(/\/uploads\/(.+)$/);
  if (uploadsMatch) {
    const filepath = path.join(UPLOAD_DIR, uploadsMatch[1]);
    return fs.readFile(filepath);
  }

  throw new Error(`Cannot download audio: unrecognized path format: ${urlOrKey}`);
}

export async function deleteAudio(urlOrKey: string) {
  if (USE_S3) {
    const key = urlOrKey.startsWith("audio/")
      ? urlOrKey
      : urlOrKey.replace(/.*\/uploads\//, "");
    if (key.startsWith("audio/")) {
      await getS3().send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
      );
      return;
    }
  }

  // Local filesystem
  if (urlOrKey.includes("/uploads/")) {
    const relativePath = urlOrKey.replace(/.*\/uploads\//, "");
    const filepath = path.join(UPLOAD_DIR, relativePath);
    await fs.unlink(filepath).catch(() => {});
  }
}

export async function getAudioUrl(key: string): Promise<string> {
  if (USE_S3) {
    return getSignedUrl(
      getS3(),
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
  }
  return `${BASE_URL}/api/audio/${key.replace(/^audio\//, "")}`;
}
