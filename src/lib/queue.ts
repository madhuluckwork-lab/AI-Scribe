import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const transcriptionQueue = new Queue("transcription", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

export const noteGenerationQueue = new Queue("note-generation", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});
