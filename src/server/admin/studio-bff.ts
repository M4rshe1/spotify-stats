import "server-only";

import {
  serializeError,
  type StudioBFFRequest,
} from "@prisma/studio-core/data/bff";
import { createPostgresJSExecutor } from "@prisma/studio-core/data/postgresjs";
import postgres from "postgres";

import { env } from "@/env";

const globalForPg = globalThis as unknown as {
  adminStudioPostgres?: ReturnType<typeof postgres>;
};

function getAdminStudioPostgres(): ReturnType<typeof postgres> {
  if (!globalForPg.adminStudioPostgres) {
    globalForPg.adminStudioPostgres = postgres(env.DATABASE_URL, {
      idle_timeout: 20,
      max: 8,
    });
  }
  return globalForPg.adminStudioPostgres;
}

function studioJson(body: unknown) {
  return new Response(JSON.stringify(body, jsonReplacer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
    status: 200,
  });
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function handleStudioBff(
  payload: StudioBFFRequest,
  options: { abortSignal?: AbortSignal },
): Promise<Response> {
  const sql = getAdminStudioPostgres();
  const executor = createPostgresJSExecutor(sql);

  if (payload.procedure === "query") {
    const [error, result] = await executor.execute(payload.query, options);
    return studioJson([error ? serializeError(error) : null, result]);
  }

  if (payload.procedure === "sequence") {
    const [firstQuery, secondQuery] = payload.sequence;
    const [firstError, firstResult] = await executor.execute(
      firstQuery,
      options,
    );
    if (firstError) {
      return studioJson([[serializeError(firstError)]]);
    }
    const [secondError, secondResult] = await executor.execute(
      secondQuery,
      options,
    );
    if (secondError) {
      return studioJson([
        [null, firstResult],
        [serializeError(secondError)],
      ]);
    }
    return studioJson([[null, firstResult], [null, secondResult]]);
  }

  if (payload.procedure === "transaction") {
    const runTransaction = executor.executeTransaction;
    if (typeof runTransaction !== "function") {
      return new Response("Transaction execution is not supported", {
        status: 501,
      });
    }
    const [error, result] = await runTransaction(payload.queries, options);
    return studioJson([error ? serializeError(error) : null, result]);
  }

  if (payload.procedure === "sql-lint") {
    const runLintSql = executor.lintSql;
    if (typeof runLintSql !== "function") {
      return new Response("SQL lint is not supported", { status: 501 });
    }
    const [error, result] = await runLintSql(
      {
        schemaVersion: payload.schemaVersion,
        sql: payload.sql,
      },
      options,
    );
    return studioJson([error ? serializeError(error) : null, result]);
  }

  return new Response("Invalid procedure", { status: 400 });
}
