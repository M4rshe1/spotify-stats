import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";

export const affinityRouter = createTRPCRouter({
  getAffinity: protectedProcedure.input(periodSchema).query(async ({ ctx }) => {
    return 1;
  }),
});
