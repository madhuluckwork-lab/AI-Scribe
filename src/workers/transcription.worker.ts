import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { downloadAudio } from "../lib/storage.js";

interface TranscriptionJobData {
  encounterId: string;
  audioFileKey: string;
  audioBlobUrl: string;
  audioFormat: string;
  userId: string;
}

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6380", {
  maxRetriesPerRequest: null,
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function getElevenLabsClient() {
  return new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });
}

export const transcriptionWorker = new Worker<TranscriptionJobData>(
  "transcription",
  async (job: Job<TranscriptionJobData>) => {
    const { encounterId, audioBlobUrl, audioFormat } = job.data;
    const startTime = Date.now();

    console.log(`[Transcription] Starting job for encounter ${encounterId}`);

    try {
      // Create or reset transcription record (upsert handles retries)
      await prisma.transcription.upsert({
        where: { encounterId },
        update: {
          fullText: "",
          segments: [],
          status: "PROCESSING",
          errorMessage: null,
        },
        create: {
          encounterId,
          fullText: "",
          segments: [],
          status: "PROCESSING",
        },
      });

      await job.updateProgress(10);

      // Download audio via storage module (supports S3 and local filesystem)
      console.log(`[Transcription] Downloading audio from: ${audioBlobUrl}`);
      const audioBuffer = await downloadAudio(audioBlobUrl);

      await job.updateProgress(30);

      // Send to ElevenLabs Scribe API
      console.log(
        `[Transcription] Sending to ElevenLabs Scribe (${audioBuffer.length} bytes)`
      );
      const extension = audioFormat.split("/").pop() || "webm";
      const file = new File(
        [new Uint8Array(audioBuffer)],
        `recording.${extension}`,
        {
          type: audioFormat,
        }
      );

      const rawResult = await getElevenLabsClient().speechToText.convert({
        file,
        modelId: "scribe_v1",
        languageCode: "eng",
        timestampsGranularity: "word",
        tagAudioEvents: false,
      });

      await job.updateProgress(80);

      // The response is a union type - narrow to single-channel response
      // (we don't use multichannel or webhooks)
      if (!("text" in rawResult)) {
        throw new Error("Unexpected multichannel/webhook response from ElevenLabs");
      }
      const result = rawResult;

      // Build segments from word-level timestamps
      // Group words into sentence-like segments (~10 words each)
      const words = result.words || [];
      const segments: Array<{ start: number; end: number; text: string }> = [];
      let currentSegment: { start: number; end: number; words: string[] } | null = null;

      for (const word of words) {
        if (word.type !== "word") continue;

        if (!currentSegment) {
          currentSegment = {
            start: word.start ?? 0,
            end: word.end ?? 0,
            words: [word.text],
          };
        } else {
          currentSegment.end = word.end ?? currentSegment.end;
          currentSegment.words.push(word.text);

          // Split on sentence-ending punctuation or every ~12 words
          const lastWord = word.text;
          const isSentenceEnd = /[.!?]$/.test(lastWord);

          if (isSentenceEnd || currentSegment.words.length >= 12) {
            segments.push({
              start: currentSegment.start,
              end: currentSegment.end,
              text: currentSegment.words.join(" "),
            });
            currentSegment = null;
          }
        }
      }

      // Push any remaining words
      if (currentSegment && currentSegment.words.length > 0) {
        segments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          text: currentSegment.words.join(" "),
        });
      }

      const fullText = result.text || "";

      // Store transcription
      await prisma.transcription.update({
        where: { encounterId },
        data: {
          fullText,
          segments,
          language: result.languageCode || "eng",
          model: "elevenlabs-scribe-v1",
          status: "COMPLETED",
          processingMs: Date.now() - startTime,
        },
      });

      // Update encounter status
      await prisma.encounter.update({
        where: { id: encounterId },
        data: { status: "GENERATING_NOTE" },
      });

      // Import note generation queue and enqueue
      const { Queue } = await import("bullmq");
      const noteQueue = new Queue("note-generation", { connection: redis });

      await noteQueue.add(
        "generate",
        {
          encounterId,
          userId: job.data.userId,
          transcriptionText: fullText,
          segments,
        },
        {
          attempts: 2,
          backoff: { type: "exponential", delay: 10000 },
        }
      );

      await job.updateProgress(100);
      console.log(`[Transcription] Completed for encounter ${encounterId}`);
      return { success: true, encounterId };
    } catch (error) {
      console.error(
        `[Transcription] Failed for encounter ${encounterId}:`,
        error
      );

      // Update status to failed
      await prisma.transcription
        .upsert({
          where: { encounterId },
          update: {
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
          create: {
            encounterId,
            fullText: "",
            segments: [],
            status: "FAILED",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
        })
        .catch(() => {}); // Ignore cleanup errors

      await prisma.encounter
        .update({
          where: { id: encounterId },
          data: { status: "ERROR" },
        })
        .catch(() => {});

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

transcriptionWorker.on("completed", (job) => {
  console.log(`[Transcription] Job ${job.id} completed`);
});

transcriptionWorker.on("failed", (job, err) => {
  console.error(`[Transcription] Job ${job?.id} failed:`, err.message);
});
