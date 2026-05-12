import type { Spotify } from "..";
import type { PlaybackState, RecentlyPlayedTracksPage } from "../types";
import { Endpoint, SpotifyHttpError } from "./endpoint";

const idlePlaybackState = (): PlaybackState => ({
  device: {
    id: null,
    is_active: false,
    is_private_session: false,
    is_restricted: false,
    name: "",
    type: "",
    volume_percent: null,
  },
  repeat_state: "off",
  shuffle_state: false,
  context: null,
  timestamp: Date.now(),
  progress_ms: 0,
  is_playing: false,
  item: null,
  currently_playing_type: "",
  actions: {},
});

export class PlayerEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async getRecentlyPlayedTracks(limit = 50): Promise<RecentlyPlayedTracksPage> {
    return this.getJson<RecentlyPlayedTracksPage>("me/player/recently-played", {
      limit,
    });
  }

  async getPlaybackState(): Promise<PlaybackState> {
    const token = (await this.spotify.getAccessToken()).access_token;
    if (!token) {
      return idlePlaybackState();
    }

    const response = await fetch("https://api.spotify.com/v1/me/player", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 204) {
      return idlePlaybackState();
    }

    if (response.status === 429) {
      throw new SpotifyHttpError(
        "Spotify rate limited",
        429,
        null,
        response.headers,
      );
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new SpotifyHttpError(
        `Spotify API ${response.status}: me/player`,
        response.status,
        body,
        response.headers,
      );
    }

    return (await response.json()) as PlaybackState;
  }

  async addItemToPlaybackQueue(uri: string): Promise<void> {
    const q = this.buildQuery({ uri });
    await this.postVoid(`me/player/queue${q}`);
  }

  async skipToNext(deviceId?: string): Promise<void> {
    const q = deviceId ? this.buildQuery({ device_id: deviceId }) : "";
    await this.postVoid(`me/player/next${q}`);
  }

  async playNow(uri: string): Promise<void> {
    await this.addItemToPlaybackQueue(uri);
    await this.skipToNext();
  }
}
