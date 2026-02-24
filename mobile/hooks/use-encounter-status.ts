import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useEncounterStatus(encounterId: string | null) {
  return useQuery({
    queryKey: ["encounter-status", encounterId],
    queryFn: async () => {
      if (!encounterId) return null;
      const res = await api.get(`/api/encounters/${encounterId}`);
      return res.data;
    },
    enabled: !!encounterId,
    refetchInterval: 3000,
  });
}
