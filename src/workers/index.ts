import dotenv from "dotenv";
import path from "path";

// Load .env first, then .env.local to match Next.js behavior
// Must happen before any worker imports since they read env vars at module level
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { transcriptionWorker } = await import("./transcription.worker.js");
  const { noteGenerationWorker } = await import("./note-generation.worker.js");

  console.log("[Workers] Starting BullMQ workers...");
  console.log("[Workers] Transcription worker: active");
  console.log("[Workers] Note generation worker: active");

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`\n[Workers] Received ${signal}. Shutting down gracefully...`);

    await Promise.allSettled([
      transcriptionWorker.close(),
      noteGenerationWorker.close(),
    ]);

    console.log("[Workers] All workers closed. Exiting.");
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (err) => {
  console.error("[Workers] Unhandled rejection:", err);
});

main().catch((err) => {
  console.error("[Workers] Failed to start:", err);
  process.exit(1);
});
