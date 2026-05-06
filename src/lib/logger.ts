import { env } from "@/env";
import pino from "pino";
import pinoPretty from "pino-pretty";

const createLogger = () => {
    if (env.NODE_ENV === "development") {
        return pino(
            {},
            pinoPretty({
                colorize: true,
            }),
        );
    }
    return pino();
};

export const logger: pino.Logger = createLogger();