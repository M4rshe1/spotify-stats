import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import z from "zod";
import { periods, type Period } from "@/lib/consts/periods";
import { TRPCError } from "@trpc/server";
import { getPeriods, getPreviousPeriod } from "@/lib/periods";
import { tryCatch } from "@/lib/try-catch";

export const dashboardRouter = createTRPCRouter({
  getKeyMetrics: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, Period]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period,
        input.from,
        input.to,
      );

      const [period, previousPeriod, artists, previousArtists] =
        await Promise.all([
          tryCatch(
            ctx.db.playback.aggregate({
              _sum: {
                duration: true,
              },
              _count: {
                _all: true,
              },
              where: {
                playedAt: {
                  gte: start as Date,
                  lte: end as Date,
                },
                user: {
                  id: ctx.session.user.id,
                },
              },
            }),
          ),
          tryCatch(
            ctx.db.playback.aggregate({
              _sum: {
                duration: true,
              },
              _count: {
                _all: true,
              },
              where: {
                playedAt: {
                  gte: previousStart as Date,
                  lt: start as Date,
                },
                user: {
                  id: ctx.session.user.id,
                },
              },
            }),
          ),
          tryCatch(
            ctx.db.artist.aggregate({
              _count: {
                _all: true,
              },
              where: {
                tracks: {
                  some: {
                    track: {
                      playbacks: {
                        some: {
                          playedAt: {
                            gte: start as Date,
                            lte: end as Date,
                          },
                          user: {
                            id: ctx.session.user.id,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          ),
          tryCatch(
            ctx.db.artist.aggregate({
              _count: {
                _all: true,
              },
              where: {
                tracks: {
                  some: {
                    track: {
                      playbacks: {
                        some: {
                          playedAt: {
                            gte: previousStart as Date,
                            lt: start as Date,
                          },
                          user: {
                            id: ctx.session.user.id,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          ),
        ]);
      if (period.error || previousPeriod.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get tracks listened",
        });
      }
      return {
        duration: period.data?._sum?.duration ?? 0,
        tracks: period.data?._count?._all ?? 0,
        previousDuration: previousPeriod.data?._sum?.duration ?? 0,
        previousTracks: previousPeriod.data?._count?._all ?? 0,
        artists: artists.data?._count?._all ?? 0,
        previousArtists: previousArtists.data?._count?._all ?? 0,
      };
    }),
  getTopTrack: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, string]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period as Period,
        input.from,
        input.to,
      );
      const topTrack = await tryCatch(
        ctx.db.playback.groupBy({
          by: ["trackId"],
          _sum: {
            duration: true,
          },
          _count: {
            _all: true,
          },
          where: {
            playedAt: {
              gte: start as Date,
              lte: end as Date,
            },
            user: {
              id: ctx.session.user.id,
            },
          },
          orderBy: {
            _sum: {
              duration: "desc",
            },
          },
          take: 1,
        }),
      );
      if (topTrack.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get top track",
        });
      }
      const track = await tryCatch(
        ctx.db.track.findUnique({
          where: {
            id: topTrack.data?.[0]?.trackId,
          },
        }),
      );
      if (track.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get track",
        });
      }
      return {
        track: track.data,
        duration: topTrack.data?.[0]?._sum?.duration ?? 0,
        tracks: topTrack.data?.[0]?._count?._all ?? 0,
      };
    }),
  getTopArtist: protectedProcedure
    .input(
      z.object({
        period: z.enum(Object.keys(periods) as [Period, string]),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end, previousStart } = getPeriods(
        input.period as Period,
        input.from,
        input.to,
      );
      const groupResult = await tryCatch(
        ctx.db.playback.groupBy({
          by: ["artistId"],
          _count: {
            _all: true,
          },
          _sum: {
            duration: true,
          },
          where: {
            playedAt: {
              gte: start as Date,
              lte: end as Date,
            },
            user: {
              id: ctx.session.user.id,
            },
          },
          orderBy: {
            _sum: {
              duration: "desc",
            },
          },
          take: 1,
        }),
      );
      if (groupResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to group playbacks",
        });
      }
      const topTrackGroup = await tryCatch(
        ctx.db.playback.groupBy({
          by: ["trackId"],
          _count: {
            _all: true,
          },
          _sum: {
            duration: true,
          },
          where: {
            playedAt: {
              gte: start as Date,
              lte: end as Date,
            },
            artistId: groupResult.data?.[0]?.artistId,
            user: {
              id: ctx.session.user.id,
            },
          },
        }),
      );
      if (topTrackGroup.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to group playbacks",
        });
      }
      const artist = await tryCatch(
        ctx.db.artist.findFirst({
          where: {
            spotifyId: groupResult.data?.[0]?.artistId,
          },
        }),
      );
      if (artist.error || !artist.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get artist for top track",
        });
      }
      return {
        artist: {
          ...artist.data,
        },
        differentTracks: topTrackGroup.data?.length ?? 0,
        tracks: groupResult.data?.[0]?._count?._all ?? 0,
        duration: groupResult.data?.[0]?._sum?.duration ?? 0,
      };
    }),
});
