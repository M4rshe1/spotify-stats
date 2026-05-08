import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";

export const artistRouter = createTRPCRouter({
  getArtist: protectedProcedure.input(periodSchema).query(async ({ ctx }) => {
    return 1;
  }),
});
