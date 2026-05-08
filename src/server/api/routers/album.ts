import { createTRPCRouter, protectedProcedure } from "../trpc";
import { periodSchema } from "../lib";

export const albumRouter = createTRPCRouter({
  getAlbum: protectedProcedure.input(periodSchema).query(async ({ ctx }) => {
    return 1;
  }),
});
