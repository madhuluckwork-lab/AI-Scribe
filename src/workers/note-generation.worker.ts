import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import OpenAI from "openai";

interface NoteGenerationJobData {
  encounterId: string;
  userId: string;
  transcriptionText: string;
  segments: Array<{ start: number; end: number; text: string }>;
}

interface SOAPNoteSection {
  content: string;
  evidence: Array<{ text: string; start: number; end: number }>;
}

interface ExtractedEntities {
  patientName: string | null;
  patientAge: string | null;
  patientGender: string | null;
  providerName: string | null;
  diagnoses: string[];
  medications: Array<{ name: string; dosage: string | null; frequency: string | null }>;
  procedures: string[];
  allergies: string[];
  referrals: string[];
}

interface SOAPNote {
  chiefComplaint: SOAPNoteSection;
  historyOfPresentIllness: SOAPNoteSection;
  pastMedicalHistory: SOAPNoteSection;
  medications: SOAPNoteSection;
  socialHistory: SOAPNoteSection;
  familyHistory: SOAPNoteSection;
  reviewOfSystems: SOAPNoteSection;
  physicalExam: SOAPNoteSection;
  assessmentAndPlan: SOAPNoteSection;
  entities: ExtractedEntities;
}

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6380", {
  maxRetriesPerRequest: null,
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const noteGenerationWorker = new Worker<NoteGenerationJobData>(
  "note-generation",
  async (job: Job<NoteGenerationJobData>) => {
    const { encounterId, userId, transcriptionText, segments } = job.data;
    const startTime = Date.now();

    console.log(`[NoteGeneration] Starting job for encounter ${encounterId}`);

    try {
      await job.updateProgress(10);

      // Get encounter type
      const encounter = await prisma.encounter.findUnique({
        where: { id: encounterId },
        select: { encounterType: true },
      });

      const encounterType = encounter?.encounterType || "GENERAL";

      const systemPrompt = `You are an expert medical scribe AI assistant. Generate a structured SOAP clinical note from a medical encounter transcription.

IMPORTANT RULES:
1. Only include information explicitly stated or clearly implied in the transcription.
2. Do not fabricate any medical information, diagnoses, or treatments.
3. Use standard medical terminology appropriately.
4. For each piece of information, provide evidence links back to the specific transcript segments.
5. If information for a section is not available, write "Not documented in encounter."
6. Return valid JSON matching the exact schema requested.
7. Extract key entities mentioned in the encounter and include them in a dedicated "entities" section. Entities include:
   - patientName: Full name of the patient
   - patientAge: Age of the patient
   - patientGender: Gender of the patient
   - providerName: Name of the healthcare provider/doctor
   - diagnoses: Array of diagnosis/condition names mentioned
   - medications: Array of medication names mentioned (name, dosage, frequency if available)
   - procedures: Array of procedures or tests ordered/performed
   - allergies: Array of known allergies mentioned
   - referrals: Array of referrals to other providers or specialists
   If an entity is not mentioned, set its value to null (or empty array for array fields).`;

      const userPrompt = `Generate a SOAP clinical note from this ${encounterType} encounter transcription.

TRANSCRIPTION WITH TIMESTAMPS:
${segments.map((s) => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`).join("\n")}

Return a JSON object with these sections. Each section has "content" (string) and "evidence" (array of {text, start, end}):
- chiefComplaint
- historyOfPresentIllness
- pastMedicalHistory
- medications
- socialHistory
- familyHistory
- reviewOfSystems
- physicalExam
- assessmentAndPlan

Also include an "entities" object with:
- patientName (string or null)
- patientAge (string or null)
- patientGender (string or null)
- providerName (string or null)
- diagnoses (array of strings)
- medications (array of {name, dosage, frequency} objects)
- procedures (array of strings)
- allergies (array of strings)
- referrals (array of strings)

For each section's evidence array, include the transcript text and start/end timestamps in seconds that support the content.`;

      await job.updateProgress(20);

      console.log(
        `[NoteGeneration] Calling OpenAI GPT-4o for encounter ${encounterId}`
      );
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      await job.updateProgress(70);

      // Parse the response
      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error("No text response from OpenAI");
      }

      let jsonStr = messageContent;
      // Handle potential markdown code blocks (shouldn't happen with json_object mode, but just in case)
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const note: SOAPNote = JSON.parse(jsonStr);

      // Build evidence links
      const evidenceLinks: Array<{
        noteSection: string;
        noteText: string;
        transcriptStart: number;
        transcriptEnd: number;
        transcriptText: string;
      }> = [];

      for (const [section, data] of Object.entries(note)) {
        const sectionData = data as SOAPNoteSection;
        if (sectionData.evidence) {
          for (const ev of sectionData.evidence) {
            evidenceLinks.push({
              noteSection: section,
              noteText: sectionData.content.substring(0, 100),
              transcriptStart: ev.start,
              transcriptEnd: ev.end,
              transcriptText: ev.text,
            });
          }
        }
      }

      await job.updateProgress(80);

      // Generate title
      const title =
        note.chiefComplaint.content !== "Not documented in encounter."
          ? `${encounterType} - ${note.chiefComplaint.content.substring(0, 80)}`
          : `${encounterType} Encounter Note`;

      // Store the clinical note
      await prisma.clinicalNote.create({
        data: {
          encounterId,
          userId,
          title,
          noteType: "SOAP",
          content: note as unknown as Prisma.InputJsonValue,
          rawContent: transcriptionText,
          evidenceLinks: evidenceLinks as unknown as Prisma.InputJsonValue,
          llmModel: "gpt-4o",
          llmPromptTokens: response.usage?.prompt_tokens ?? 0,
          llmOutputTokens: response.usage?.completion_tokens ?? 0,
          status: "DRAFT",
          history: {
            create: {
              content: note as unknown as Prisma.InputJsonValue,
              version: 1,
              changedBy: userId,
              changeType: "GENERATED",
            },
          },
        },
      });

      await job.updateProgress(90);

      // Update encounter status
      await prisma.encounter.update({
        where: { id: encounterId },
        data: { status: "REVIEW" },
      });

      await job.updateProgress(100);
      console.log(
        `[NoteGeneration] Completed for encounter ${encounterId} in ${Date.now() - startTime}ms`
      );

      return { success: true, encounterId };
    } catch (error) {
      console.error(
        `[NoteGeneration] Failed for encounter ${encounterId}:`,
        error
      );

      // Update encounter status to ERROR
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
    concurrency: 2,
  }
);

noteGenerationWorker.on("completed", (job) => {
  console.log(`[NoteGeneration] Job ${job.id} completed`);
});

noteGenerationWorker.on("failed", (job, err) => {
  console.error(`[NoteGeneration] Job ${job?.id} failed:`, err.message);
});
