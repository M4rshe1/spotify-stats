import type { Spotify } from "..";
import type { Track } from "../types";
import { Endpoint } from "./endpoint";

export class TrackEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async get(id: string): Promise<Track> {
    return this.getJson<Track>(`tracks/${encodeURIComponent(id)}`);
  }
}
