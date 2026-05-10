import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "@/server/api/routers/user";
import { dashboardRouter } from "@/server/api/routers/dashboard";
import { controlRouter } from "@/server/api/routers/control";
import { chartRouter } from "@/server/api/routers/chart";
import { importRouter } from "@/server/api/routers/import";
import { affinityRouter } from "@/server/api/routers/affinity";
import { albumRouter } from "@/server/api/routers/album";
import { artistRouter } from "@/server/api/routers/artist";
import { genreRouter } from "@/server/api/routers/genre";
import { trackRouter } from "@/server/api/routers/track";
import { topRouter } from "@/server/api/routers/top";
import { sessionRouter } from "@/server/api/routers/session";
import { searchRouter } from "@/server/api/routers/search";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  dashboard: dashboardRouter,
  control: controlRouter,
  chart: chartRouter,
  import: importRouter,
  affinity: affinityRouter,
  album: albumRouter,
  artist: artistRouter,
  genre: genreRouter,
  track: trackRouter,
  top: topRouter,
  session: sessionRouter,
  search: searchRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
