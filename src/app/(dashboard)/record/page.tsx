"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { AudioVisualizer } from "@/components/recording/audio-visualizer";
import { RecordingTimer } from "@/components/recording/recording-timer";
import { UploadProgress } from "@/components/recording/upload-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Mic, Square, Pause, Play, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

export default function RecordPage() {
  const router = useRouter();
  const recorder = useAudioRecorder();
  const [encounterType, setEncounterType] = useState("GENERAL");
  const [patientInitials, setPatientInitials] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function handleUpload() {
    if (!recorder.audioBlob) return;

    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError(undefined);

    try {
      const mimeType = recorder.mimeType || "audio/webm";

      // Upload file via FormData to our API (which stores in Vercel Blob)
      const formData = new FormData();
      formData.append("file", recorder.audioBlob, `recording.${mimeType.includes("mp4") ? "mp4" : "webm"}`);

      const uploadRes = await fetch("/api/upload/presigned", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(60);

      if (!uploadRes.ok) {
        throw new Error("Failed to upload audio");
      }

      const { fileKey, blobUrl } = await uploadRes.json();
      setUploadProgress(80);

      setUploadStatus("processing");

      // Create encounter
      const encounterRes = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterType,
          patientInitials: patientInitials || undefined,
          audioFileKey: fileKey,
          audioBlobUrl: blobUrl,
          audioFormat: mimeType,
          audioSizeBytes: recorder.audioBlob.size,
          duration: recorder.duration,
        }),
      });

      if (!encounterRes.ok) {
        throw new Error("Failed to create encounter");
      }

      const { encounterId } = await encounterRes.json();
      setUploadStatus("done");
      setUploadProgress(100);
      toast.success("Recording uploaded! Processing started.");

      // Navigate to the encounter/note view after a brief delay
      setTimeout(() => {
        router.push(`/notes/${encounterId}?processing=true`);
      }, 1500);
    } catch (err) {
      setUploadStatus("error");
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Recording</h1>
        <p className="text-muted-foreground">
          Record a patient encounter to generate clinical notes.
        </p>
      </div>

      {/* Pre-recording settings */}
      {!recorder.isRecording && !recorder.audioBlob && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Encounter Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="encounterType">Encounter Type</Label>
                <Select value={encounterType} onValueChange={setEncounterType}>
                  <SelectTrigger id="encounterType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="DENTAL_EXAM">Dental Exam</SelectItem>
                    <SelectItem value="DENTAL_PROCEDURE">Dental Procedure</SelectItem>
                    <SelectItem value="OPHTHAL_EXAM">Eye Exam</SelectItem>
                    <SelectItem value="OPHTHAL_PROCEDURE">Eye Procedure</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                    <SelectItem value="INITIAL_CONSULT">Initial Consult</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="TELEHEALTH">Telehealth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientInitials">
                  Patient Initials (Optional)
                </Label>
                <Input
                  id="patientInitials"
                  placeholder="e.g., JD"
                  maxLength={5}
                  value={patientInitials}
                  onChange={(e) =>
                    setPatientInitials(e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {recorder.error && (
        <Alert variant="destructive">
          <p className="text-sm">{recorder.error}</p>
        </Alert>
      )}

      {/* Recording area */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {/* Visualizer */}
          {recorder.isRecording && (
            <AudioVisualizer
              analyserNode={recorder.analyserNode}
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
            />
          )}

          {/* Timer */}
          {(recorder.isRecording || recorder.audioBlob) && (
            <RecordingTimer
              duration={recorder.duration}
              isRecording={recorder.isRecording}
              isPaused={recorder.isPaused}
            />
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!recorder.isRecording && !recorder.audioBlob && (
              <Button
                size="lg"
                className="h-20 w-20 rounded-full bg-[#F4891F] hover:bg-[#d97a1a]"
                onClick={recorder.startRecording}
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}

            {recorder.isRecording && (
              <>
                {recorder.isPaused ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-14 rounded-full"
                    onClick={recorder.resumeRecording}
                  >
                    <Play className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-14 rounded-full"
                    onClick={recorder.pauseRecording}
                  >
                    <Pause className="h-6 w-6" />
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 w-14 rounded-full"
                  onClick={recorder.stopRecording}
                >
                  <Square className="h-6 w-6" />
                </Button>
              </>
            )}

            {recorder.audioBlob && (
              <>
                <Button
                  variant="outline"
                  onClick={recorder.resetRecording}
                  disabled={uploadStatus === "uploading" || uploadStatus === "processing"}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-record
                </Button>
                <Button
                  className="bg-[#F4891F] hover:bg-[#d97a1a]"
                  onClick={handleUpload}
                  disabled={
                    uploadStatus === "uploading" ||
                    uploadStatus === "processing" ||
                    uploadStatus === "done"
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process
                </Button>
              </>
            )}
          </div>

          {/* Audio playback */}
          {recorder.audioUrl && (
            <audio
              controls
              src={recorder.audioUrl}
              className="w-full max-w-md"
            />
          )}

          {/* Upload progress */}
          <UploadProgress
            progress={uploadProgress}
            status={uploadStatus}
            error={uploadError}
          />

          {/* Instructions */}
          {!recorder.isRecording && !recorder.audioBlob && (
            <p className="text-center text-sm text-muted-foreground">
              Click the microphone button to start recording your patient
              encounter. The recording will be transcribed and used to generate
              clinical notes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
