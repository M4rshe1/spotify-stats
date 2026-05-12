export type PlaybackRow = {
  id: number;
  playedAt: Date;
  trackId: number;
  trackName: string;
  trackImage: string | null;
  duration: number;
  artistNames: string[] | null;
  artistIds: number[] | null;
  albumId: number;
  albumName: string;
  playlistId: number | null;
  playlistName: string | null;
  playlistImage: string | null;
};
