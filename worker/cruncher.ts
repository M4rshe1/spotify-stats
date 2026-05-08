import { ioRedis } from "@/server/cache";
import { Worker } from "bullmq";
import { logger } from "@/lib/logger";
import Bun from "bun";
import { db } from "@/server/db";
import { tryCatch } from "@/lib/try-catch";
import { importStatus, type ImportStatusLabel } from "@/lib/consts/import";
import {
  addToCreationQueues,
  batch,
  createGenres,
  createAlbums,
  createArtists,
  retrySpotifyCall,
  createTracks,
  Batches,
  createHistory,
} from "@/lib/spotify";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import getSpotifyApi from "@/server/spotify";
import type { Import } from "generated/prisma";

logger.info("Cruncher worker started");

async function getImportRecord(importId: number) {
  const importRecord = await tryCatch(
    db.import.findUnique({
      where: { id: importId, status: "pending" as ImportStatusLabel },
    }),
  );
  if (importRecord.error) {
    throw importRecord.error;
  }
  if (!importRecord.data) {
    throw new Error(`Import ${importId} not found`);
  }
  return importRecord.data;
}

type HistoryItem = {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr: string;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  spotify_track_uri: string;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  audiobook_title: string | null;
  audiobook_uri: string | null;
  audiobook_chapter_uri: string | null;
  audiobook_chapter_title: string | null;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: number;
  incognito_mode: boolean;
};

async function buildQueues(spotify: SpotifyApi) {
  const batches = new Batches().fromQueue("tracks");
  for (const batch of batches) {
    const { error, data: tracksData } = await retrySpotifyCall(
      () => spotify.tracks.get(Array.from(batch) as string[]),
      "tracks.get",
    );
    if (error || !tracksData) {
      logger.error(error);
      return;
    }
    for (const track of tracksData) {
      addToCreationQueues("albums", track.album.id);
      track.artists.forEach((artist) => {
        addToCreationQueues("artists", artist.id);
      });
      track.album.artists.forEach((artist) => {
        addToCreationQueues("artists", artist.id);
      });
      track.album.genres?.forEach((genre) => {
        addToCreationQueues("genres", genre);
      });
    }
  }
}

const worker = new Worker(
  "import",
  async (job) => {
    const importRecord = await getImportRecord(job.data.id);
    const spotify = getSpotifyApi(importRecord.userId);
    const history = await tryCatch(
      Bun.file(`uploads/${importRecord.id}.json`).json() as Promise<
        HistoryItem[]
      >,
    );
    if (history.error) {
      throw history.error;
    }
    for (const item of history.data) {
      addToCreationQueues("tracks", item.spotify_track_uri.split(":")[2] ?? "");
    }
    await buildQueues(spotify);
    await createGenres();
    await createArtists(spotify);
    await createGenres();
    await createAlbums(spotify);
    await createTracks(spotify);
    await createHistory(
      spotify,
      importRecord.userId,
      importRecord.id,
      history.data,
    );
  },
  { connection: ioRedis() },
);

worker.on("completed", (job) => {
  logger.info(`Job ${job?.id} completed`);
});

worker.on("failed", async (job, error) => {
  logger.error(`Job ${job?.id} failed: ${error.message}`);
  await db.import.update({
    where: { id: job?.data.id },
    data: { status: "failed" as ImportStatusLabel },
  });
});

worker.on("error", async (error) => {
  logger.error(`Worker error: ${error.message}`);
});
