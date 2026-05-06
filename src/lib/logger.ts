import { env } from "@/env";
import pino from "pino";

const createLogger = () => {
    return pino(env.NODE_ENV === "development" ? {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
        },
    } : undefined);
}

export const logger: pino.Logger = createLogger();