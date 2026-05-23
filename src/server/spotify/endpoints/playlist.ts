import type { Spotify } from "..";
import type { Playlist } from "../types";
import { Endpoint } from "./endpoint";

export class PlaylistEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async get(id: string): Promise<Playlist> {
    return this.getJson<Playlist>(
      `playlists/${encodeURIComponent(id)}`,
    ) as Promise<Playlist>;
  }
}
