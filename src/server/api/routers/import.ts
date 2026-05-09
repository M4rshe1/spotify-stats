import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getImportQueue } from "@/server/queues/import";

export const importRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.import.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        entriesAdded: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 50,
    });
  }),
  reporcess: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const importRecord = await ctx.db.import.findUnique({
        where: { id: input.id },
      });
      if (!importRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Import not found" });
      }
      await ctx.db.import.update({
        where: { id: input.id },
        data: {
          status: "pending",
          progress: 0,
          error: null,
          entriesAdded: 0,
        },
      });
      await getImportQueue().add("import", { id: importRecord.id });
    }),
});
