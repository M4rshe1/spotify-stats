import type { Spotify } from "..";
import type { UserProfile } from "../types";
import { Endpoint } from "./endpoint";

export class UserEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async profile(): Promise<UserProfile> {
    return this.getJson<UserProfile>("me");
  }
}
