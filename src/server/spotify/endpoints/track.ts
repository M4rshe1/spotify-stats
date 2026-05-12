import type { Spotify } from "..";
import type { Track } from "../types";
import { Endpoint } from "./endpoint";

export class TrackEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  /**
   * February 2026: batch `GET /tracks` removed; fetches each id via `GET /tracks/{id}`.
   */
  async get(id: string): Promise<Track>;
  async get(ids: string[]): Promise<Track[]>;
  async get(id: string | string[]): Promise<Track | Track[]> {
    if (Array.isArray(id)) {
      return Promise.all(id.map((id) => this.get(id)));
    }
    return this.getJson<Track>(`tracks/${encodeURIComponent(id)}`);
  }
}
