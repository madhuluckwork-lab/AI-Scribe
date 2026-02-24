"use client";

import { useQuery } from "@tanstack/react-query";

interface EncounterStatus {
  id: string;
  status: string;
  transcription?: {
    id: string;
    status: string;
  } | null;
  clinicalNote?: {
    id: string;
    status: string;
  } | null;
}

export function useEncounterStatus(encounterId: string | null) {
  return useQuery<EncounterStatus>({
    queryKey: ["encounter-status", encounterId],
    queryFn: async () => {
      const res = await fetch(`/api/encounters/${encounterId}`);
      if (!res.ok) throw new Error("Failed to fetch encounter status");
      return res.json();
    },
    enabled: !!encounterId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      // Stop polling once completed or errored
      if (
        data.status === "COMPLETED" ||
        data.status === "REVIEW" ||
        data.status === "ERROR"
      ) {
        return false;
      }
      return 3000;
    },
  });
}
