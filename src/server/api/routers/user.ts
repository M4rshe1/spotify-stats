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
import { spotifyProductLabel } from "@/lib/spotify-product";
import getSpotifyApi from "@/server/spotify";
import {
  getSettingForUser,
  getSettingsForUser,
  setSettingForUser,
} from "@/lib/settings";

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
    const profileResult = await spotify.currentUser.profile();

    if (!profileResult) {
      return {
        source: "cached" as const,
        product: cachedProduct,
        label: spotifyProductLabel(cachedProduct),
      };
    }

    const liveProduct = profileResult.product;
    if (liveProduct) {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { product: liveProduct },
      });
    }
    const product = liveProduct ?? cachedProduct;

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

  getPreferredPeriod: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getSettingsForUser(ctx.session.user.id);
    return {
      period:
        settings.PREFERRED_PERIOD ??
        (userSettings.PREFERRED_PERIOD?.defaultValue as Period),
      customStart: settings.CUSTOM_PREFERRED_PERIOD_START,
      customEnd: settings.CUSTOM_PREFERRED_PERIOD_END,
      favoritePeriods: settings.FAVORITE_PERIODS,
    };
  }),

  toggleFavoritePeriod: protectedProcedure
    .input(z.object({ period: periodEnum }))
    .mutation(async ({ ctx, input }) => {
      const favoritePeriods = await getSettingForUser(
        ctx.session.user.id,
        "FAVORITE_PERIODS",
      );
      console.log(favoritePeriods);
      if (!favoritePeriods) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to read favorite periods",
        });
      }

      const currValue = favoritePeriods.value;
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

      await setSettingForUser(
        ctx.session.user.id,
        "FAVORITE_PERIODS",
        JSON.stringify(next),
      );

      return next;
    }),

  setPreferredPeriod: publicProcedure
    .input(
      z.object({
        period: periodEnum,
        customStart: z.date().nullable().optional(),
        customEnd: z.date().nullable().optional(),
      }),
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
          }),
        );

        if (setting) {
          await tryCatch(
            ctx.db.settings.update({
              where: { id: setting.id },
              data: { value, userId: ctx.session?.user.id },
            }),
          );
        } else {
          await tryCatch(
            ctx.db.settings.create({
              data: {
                key,
                value,
                userId: ctx.session?.user.id,
              },
            }),
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
