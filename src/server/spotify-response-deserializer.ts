import type { IResponseDeserializer } from "@spotify/web-api-ts-sdk";

/**
 * Spotify sometimes returns 2xx with an empty or non-JSON body (e.g. add-to-queue).
 * The SDK's default deserializer always JSON.parses non-empty bodies and throws.
 */
export default class SpotifyResponseDeserializer implements IResponseDeserializer {
    public async deserialize<TReturnType>(
        response: Response,
    ): Promise<TReturnType> {
        const text = await response.text();
        if (text.length === 0) {
            return null as TReturnType;
        }
        try {
            return JSON.parse(text) as TReturnType;
        } catch {
            // 2xx responses are validated before deserialize; non-JSON success bodies are OK.
            return null as TReturnType;
        }
    }
}
