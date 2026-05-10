import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "../trpc";
import { getSettings, setSettings } from "@/lib/settings";

export const adminRouter = createTRPCRouter({
  getSettings: adminProcedure.query(async ({ ctx }) => {
    return await getSettings();
  }),

  setSettings: adminProcedure
    .input(
      z.object({
        settings: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      await setSettings(input.settings);
    }),
});
