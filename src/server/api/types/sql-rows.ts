export type PlaybackRow = {
  id: number;
  playedAt: Date;
  trackId: number;
  trackName: string;
  trackImage: string | null;
  duration: number;
  artistNames: string[] | null;
  artistIds: number[] | null;
  artistRoles: string[] | null;
  albumId: number;
  albumName: string;
  playlistId: number | null;
  playlistName: string | null;
  playlistImage: string | null;
};

export type TopTrackRow = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
  artistRoles: string[] | null;
  artistNames: string[] | null;
  artistIds: number[] | null;
};

export type TopAlbumRow = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
  artistNames: string[] | null;
  artistIds: number[] | null;
};

export type TopArtistRow = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
};

export type FirstLastPlayed = {
  playedAt: Date | null;
  trackId: number | null;
  trackName: string | null;
  trackImage: string | null;
};
