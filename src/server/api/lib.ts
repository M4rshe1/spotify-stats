import z from "zod";
import { periods, type Period } from "@/lib/consts/periods";
const periodKeys = Object.keys(periods) as Period[];
const periodEnum = z.enum(periodKeys as [Period, ...Period[]]);

export const periodSchema = z.object({
  period: periodEnum,
  from: z.date().nullable().optional(),
  to: z.date().nullable().optional(),
});

export type PeriodQueryInput = z.infer<typeof periodSchema>;

type ArtistArraysRow = {
  artistNames: string[] | null;
  artistIds: number[] | null;
  artistRoles?: string[] | null;
};

export function rowToArtists(row: ArtistArraysRow) {
  return [
    ...(row.artistNames ?? []).map((name, index) => ({
      id: row.artistIds?.[index] ?? null,
      name,
      role: row.artistRoles?.[index] ?? "feature",
    })),
  ];
}
