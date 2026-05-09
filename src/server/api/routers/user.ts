import { periods, type Period } from "@/lib/consts/periods";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import z from "zod";
import { tryCatch } from "@/lib/try-catch";
import { userSettings } from "@/lib/consts/settings";
import { TRPCError } from "@trpc/server";
import { MAX_PINNED_PERIODS } from "@/lib/consts/favorite-periods";
import { Prisma } from "generated/prisma";
import {
  DEFAULT_IANA_TIMEZONE,
  isValidIanaTimezone,
  normalizeIanaTimezone,
} from "@/lib/timezone";
import { retrySpotifyCall } from "@/lib/spotify";
import { spotifyProductLabel } from "@/lib/spotify-product";
import getSpotifyApi from "@/server/spotify";

const periodKeys = Object.keys(periods) as Period[];
const periodSet = new Set<string>(periodKeys);
const periodEnum = z.enum(periodKeys as [Period, ...Period[]]);

const isPeriod = (value: unknown): value is Period =>
  typeof value === "string" && periodSet.has(value);

function parseFavoritePeriodsJson(raw: string | undefined): Period[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPeriod);
  } catch {
    return [];
  }
}

export const userRouter = createTRPCRouter({
  getSpotifyPlan: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { product: true },
    });
    const cachedProduct = dbUser?.product ?? null;

    const spotify = getSpotifyApi(ctx.session.user.id);
    const profileResult = await retrySpotifyCall(
      () => spotify.currentUser.profile(),
      "currentUser.profile",
    );

    if (profileResult.error || !profileResult.data) {
      return {
        source: "cached" as const,
        product: cachedProduct,
        label: spotifyProductLabel(cachedProduct),
      };
    }

    const product = profileResult.data.product;
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: { product },
    });

    return {
      source: "live" as const,
      product,
      label: spotifyProductLabel(product),
    };
  }),

  revokeSessionById: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.session.deleteMany({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }
      return { ok: true as const };
    }),

  getTimezone: protectedProcedure.query(async ({ ctx }) => {
    return { timezone: ctx.session.user.timezone ?? DEFAULT_IANA_TIMEZONE };
  }),

  setTimezone: protectedProcedure
    .input(
      z.object({
        timezone: z
          .string()
          .refine(isValidIanaTimezone, "Invalid IANA timezone identifier"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const timezone = normalizeIanaTimezone(input.timezone);
      const { error } = await tryCatch(
        ctx.db.$executeRaw(
          Prisma.sql`UPDATE "user" SET "timezone" = ${timezone} WHERE "id" = ${ctx.session.user.id}`,
        ),
      );

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update timezone",
        });
      }

      return { timezone };
    }),

  getPreferredPeriod: publicProcedure.query(async ({ ctx }) => {
    const settingResult = await tryCatch(
      ctx.db.settings.findMany({
        where: {
          userId: ctx.session?.user.id,
          key: {
            in: [
              "PREFERRED_PERIOD",
              "CUSTOM_PREFERRED_PERIOD_START",
              "CUSTOM_PREFERRED_PERIOD_END",
              "FAVORITE_PERIODS",
            ],
          },
        },
      })
    );
    if (settingResult.error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get preferred period",
      });
    }

    const settingsData = settingResult.data ?? [];
    const settingsObj: Record<string, string | undefined> = {};
    settingsData.forEach(({ key, value }) => {
      settingsObj[key] = value;
    });

    const period = settingsObj["PREFERRED_PERIOD"] as Period | undefined;
    const customStartValue = settingsObj["CUSTOM_PREFERRED_PERIOD_START"];
    const customEndValue = settingsObj["CUSTOM_PREFERRED_PERIOD_END"];
    const favoriteRaw = settingsObj["FAVORITE_PERIODS"];

    const customStart =
      customStartValue && !Number.isNaN(new Date(customStartValue).getTime())
        ? new Date(customStartValue)
        : null;
    const customEnd =
      customEndValue && !Number.isNaN(new Date(customEndValue).getTime())
        ? new Date(customEndValue)
        : null;

    const favoritePeriods =
      parseFavoritePeriodsJson(favoriteRaw).slice(0, MAX_PINNED_PERIODS);

    return {
      period: period ?? userSettings.PREFERRED_PERIOD.defaultValue,
      customStart,
      customEnd,
      favoritePeriods,
    };
  }),

  toggleFavoritePeriod: protectedProcedure
    .input(z.object({ period: periodEnum }))
    .mutation(async ({ ctx, input }) => {
      const { data: rows, error } = await tryCatch(
        ctx.db.settings.findMany({
          where: {
            userId: ctx.session.user.id,
            key: "FAVORITE_PERIODS",
          },
        })
      );
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to read favorite periods",
        });
      }

      const currValue = rows?.[0]?.value;
      const current = parseFavoritePeriodsJson(currValue).slice(
        0,
        MAX_PINNED_PERIODS,
      );
      const alreadyPinned = current.includes(input.period);
      if (!alreadyPinned && current.length >= MAX_PINNED_PERIODS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can pin at most ${MAX_PINNED_PERIODS} periods`,
        });
      }
      const next = alreadyPinned
        ? current.filter((p) => p !== input.period)
        : [...current, input.period];

      const value = JSON.stringify(next);

      if (rows?.[0]) {
        await tryCatch(
          ctx.db.settings.update({
            where: { id: rows[0].id },
            data: { value, userId: ctx.session.user.id },
          })
        );
      } else {
        await tryCatch(
          ctx.db.settings.create({
            data: {
              key: "FAVORITE_PERIODS",
              value,
              userId: ctx.session.user.id,
            },
          })
        );
      }

      return next;
    }),

  setPreferredPeriod: publicProcedure
    .input(
      z.object({
        period: periodEnum,
        customStart: z.date().nullable().optional(),
        customEnd: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        input.period === "custom" &&
        (!input.customStart || !input.customEnd)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom period requires start and end dates",
        });
      }

      const upsertSetting = async (key: string, value: string) => {
        const { data: setting } = await tryCatch(
          ctx.db.settings.findFirst({
            where: {
              userId: ctx.session?.user.id,
              key,
            },
          })
        );

        if (setting) {
          await tryCatch(
            ctx.db.settings.update({
              where: { id: setting.id },
              data: { value, userId: ctx.session?.user.id },
            })
          );
        } else {
          await tryCatch(
            ctx.db.settings.create({
              data: {
                key,
                value,
                userId: ctx.session?.user.id,
              },
            })
          );
        }
      };

      await upsertSetting("PREFERRED_PERIOD", input.period);
      if (input.period === "custom") {
        await upsertSetting(
          "CUSTOM_PREFERRED_PERIOD_START",
          input.customStart!.toISOString(),
        );
        await upsertSetting(
          "CUSTOM_PREFERRED_PERIOD_END",
          input.customEnd!.toISOString(),
        );
      }

      return input.period;
    }),
});
