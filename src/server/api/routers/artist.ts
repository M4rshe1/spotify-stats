import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const artistRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const artist = await ctx.db.artist.findUnique({
        where: {
          id: input.id,
        },
        include: {
          _count: {
            select: {
              tracks: true,
              albums: true,
            },
          },
          genres: true,
        },
      });
      if (!artist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Artist not found" });
      }
      return artist;
    }),
});
