"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  shareNoteAction,
  revokeNoteShareAction,
  getNoteSharesAction,
} from "@/actions/share";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Mail } from "lucide-react";

interface Share {
  id: string;
  sharedAt: Date;
  viewedAt: Date | null;
  patient: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface ShareNoteDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareNoteDialog({
  noteId,
  open,
  onOpenChange,
}: ShareNoteDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [isSending, startSend] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getNoteSharesAction(noteId).then((result) => {
        if (result.shares) {
          setShares(result.shares as Share[]);
        }
        setIsLoading(false);
      });
    }
  }, [open, noteId]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    startSend(async () => {
      const result = await shareNoteAction({
        noteId,
        patientEmail: email,
        message: message || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setEmail("");
        setMessage("");
        // Refresh shares list
        const updated = await getNoteSharesAction(noteId);
        if (updated.shares) setShares(updated.shares as Share[]);
      }
    });
  }

  async function handleRevoke(patientId: string) {
    const result = await revokeNoteShareAction(noteId, patientId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setShares((prev) => prev.filter((s) => s.patient.id !== patientId));
      toast.success("Access revoked");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Patient</DialogTitle>
          <DialogDescription>
            Send an email invitation so the patient can view this note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient-email">Patient Email</Label>
            <Input
              id="patient-email"
              type="email"
              placeholder="patient@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-message">Message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={2}
              maxLength={500}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Invitation
          </Button>
        </form>

        {(shares.length > 0 || isLoading) && (
          <>
            <Separator />
            <div>
              <h4 className="mb-3 text-sm font-medium">Shared with</h4>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm">
                            {share.patient.name || share.patient.email}
                          </span>
                        </div>
                        <p className="ml-5.5 text-xs text-muted-foreground">
                          {share.viewedAt ? "Viewed" : "Not viewed yet"}
                          {" \u00b7 "}
                          Shared {new Date(share.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(share.patient.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
