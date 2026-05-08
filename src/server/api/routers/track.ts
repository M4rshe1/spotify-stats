import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";

export const trackRouter = createTRPCRouter({
  getTrack: protectedProcedure.input(periodSchema).query(async ({ ctx }) => {
    return 1;
  }),
});
