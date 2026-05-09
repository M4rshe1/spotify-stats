import z from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const searchRouter = createTRPCRouter({
  global: protectedProcedure
    .input(z.object({ q: z.string().min(1).max(128) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const term = input.q.trim();
      const nameMatch = { contains: term, mode: "insensitive" as const };

      const [tracks, albums, artists] = await Promise.all([
        ctx.db.track.findMany({
          where: {
            playbacks: { some: { userId } },
            name: nameMatch,
          },
          take: 10,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            image: true,
            album: { select: { name: true } },
          },
        }),
        ctx.db.album.findMany({
          where: {
            tracks: { some: { playbacks: { some: { userId } } } },
            name: nameMatch,
          },
          take: 10,
          orderBy: { name: "asc" },
          select: { id: true, name: true, image: true },
        }),
        ctx.db.artist.findMany({
          where: {
            tracks: {
              some: {
                track: {
                  playbacks: { some: { userId } },
                },
              },
            },
            name: nameMatch,
          },
          take: 10,
          orderBy: { name: "asc" },
          select: { id: true, name: true, image: true },
        }),
      ]);

      return { tracks, albums, artists };
    }),
});
