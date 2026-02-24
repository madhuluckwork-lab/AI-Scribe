"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";

interface SOAPSection {
  content: string;
  evidence?: Array<{ text: string; start: number; end: number }>;
}

const SECTION_LABELS: Record<string, string> = {
  chiefComplaint: "Chief Complaint",
  historyOfPresentIllness: "History of Present Illness",
  pastMedicalHistory: "Past Medical History",
  medications: "Medications",
  socialHistory: "Social History",
  familyHistory: "Family History",
  reviewOfSystems: "Review of Systems",
  physicalExam: "Physical Exam",
  assessmentAndPlan: "Assessment & Plan",
};

interface PatientNoteViewProps {
  note: {
    id: string;
    title: string | null;
    noteType: string;
    content: Record<string, unknown>;
    createdAt: Date;
    encounterType: string;
    encounterDate: Date;
  };
  clinicianName: string;
  sharedAt: Date;
}

export function PatientNoteView({
  note,
  clinicianName,
  sharedAt,
}: PatientNoteViewProps) {
  const content = note.content as Record<string, SOAPSection>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Link href="/portal">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Notes
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{note.title || "Clinical Note"}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Dr. {clinicianName}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(note.encounterDate).toLocaleDateString()}
          </div>
          <Badge variant="outline">
            {note.encounterType.replace("_", " ")}
          </Badge>
          <Badge variant="secondary">{note.noteType}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Shared with you on {new Date(sharedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Note Content */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Clinical Note</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const section = content[key] as SOAPSection | undefined;
            if (
              !section?.content ||
              section.content === "Not documented in encounter."
            ) {
              return null;
            }

            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {section.content}
                </p>
                <Separator className="mt-4" />
              </div>
            );
          })}

          {/* Entities section if available */}
          {content.entities && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Key Information
              </h3>
              <EntitiesSummary
                entities={content.entities as unknown as Record<string, unknown>}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntitiesSummary({
  entities,
}: {
  entities: Record<string, unknown>;
}) {
  const items: Array<{ label: string; value: string }> = [];

  if (entities.patientName)
    items.push({ label: "Patient", value: entities.patientName as string });
  if (entities.patientAge)
    items.push({ label: "Age", value: entities.patientAge as string });
  if (entities.patientGender)
    items.push({ label: "Gender", value: entities.patientGender as string });
  if (entities.providerName)
    items.push({ label: "Provider", value: entities.providerName as string });

  const diagnoses = entities.diagnoses as string[] | undefined;
  if (diagnoses?.length)
    items.push({ label: "Diagnoses", value: diagnoses.join(", ") });

  const allergies = entities.allergies as string[] | undefined;
  if (allergies?.length)
    items.push({ label: "Allergies", value: allergies.join(", ") });

  const procedures = entities.procedures as string[] | undefined;
  if (procedures?.length)
    items.push({ label: "Procedures", value: procedures.join(", ") });

  const meds = entities.medications as
    | Array<{ name: string; dosage?: string; frequency?: string }>
    | undefined;
  if (meds?.length)
    items.push({
      label: "Medications",
      value: meds
        .map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(" - "))
        .join(", "),
    });

  const referrals = entities.referrals as string[] | undefined;
  if (referrals?.length)
    items.push({ label: "Referrals", value: referrals.join(", ") });

  if (items.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border bg-muted/50 px-3 py-2"
        >
          <span className="text-xs font-medium text-muted-foreground">
            {item.label}
          </span>
          <p className="text-sm">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
