"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlignLeft, List, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updatePreferencesAction } from "@/actions/preferences";
import {
  ALL_SOAP_SECTIONS,
  SOAP_SECTION_LABELS,
  type NoteFormat,
  type SoapSectionKey,
} from "@/types/preferences";

interface NotePreferencesFormProps {
  currentFormat: string;
  currentVisibleSections: string[];
}

export function NotePreferencesForm({
  currentFormat,
  currentVisibleSections,
}: NotePreferencesFormProps) {
  const [noteFormat, setNoteFormat] = useState<NoteFormat>(
    (currentFormat as NoteFormat) || "paragraph"
  );
  const [visibleSections, setVisibleSections] = useState<SoapSectionKey[]>(
    (currentVisibleSections as SoapSectionKey[]) || []
  );
  const [isPending, startTransition] = useTransition();

  // Empty array means all sections visible
  const effectiveSections: readonly SoapSectionKey[] =
    visibleSections.length === 0 ? ALL_SOAP_SECTIONS : visibleSections;

  function isSectionVisible(key: SoapSectionKey): boolean {
    return effectiveSections.includes(key);
  }

  function toggleSection(key: SoapSectionKey) {
    if (visibleSections.length === 0) {
      // Currently "all visible" — switching to explicit list minus the toggled one
      setVisibleSections(
        ALL_SOAP_SECTIONS.filter((s) => s !== key) as SoapSectionKey[]
      );
    } else if (visibleSections.includes(key)) {
      // Remove this section
      const updated = visibleSections.filter((s) => s !== key);
      // If removing would leave none visible, don't allow it
      if (updated.length === 0) {
        toast.error("At least one section must be visible");
        return;
      }
      setVisibleSections(updated);
    } else {
      // Add this section
      const updated = [...visibleSections, key];
      // If all sections are now visible, store empty array (= all)
      if (updated.length === ALL_SOAP_SECTIONS.length) {
        setVisibleSections([]);
      } else {
        setVisibleSections(updated);
      }
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePreferencesAction({
        noteFormat,
        visibleSections,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Preferences saved");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note Preferences</CardTitle>
        <CardDescription>
          Configure how generated clinical notes are formatted and displayed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Toggle */}
        <div className="space-y-2">
          <Label>Note Format</Label>
          <div className="flex items-center gap-1 rounded-md border p-1 w-fit">
            <Button
              type="button"
              variant={noteFormat === "paragraph" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setNoteFormat("paragraph")}
            >
              <AlignLeft className="h-4 w-4" />
              Paragraph
            </Button>
            <Button
              type="button"
              variant={noteFormat === "bulleted" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setNoteFormat("bulleted")}
            >
              <List className="h-4 w-4" />
              Bulleted
            </Button>
          </div>
        </div>

        {/* Section Visibility */}
        <div className="space-y-3">
          <Label>Visible Sections</Label>
          <p className="text-xs text-muted-foreground">
            Choose which sections appear in generated notes.
          </p>
          <div className="space-y-2">
            {ALL_SOAP_SECTIONS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <Label htmlFor={`section-${key}`} className="cursor-pointer font-normal">
                  {SOAP_SECTION_LABELS[key]}
                </Label>
                <Switch
                  id={`section-${key}`}
                  checked={isSectionVisible(key)}
                  onCheckedChange={() => toggleSection(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isPending} className="bg-[#F4891F] hover:bg-[#d97a1a]">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
