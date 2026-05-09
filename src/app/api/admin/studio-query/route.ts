import type { StudioBFFRequest } from "@prisma/studio-core/data/bff";

import { auth } from "@/server/better-auth";
import { handleStudioBff } from "@/server/admin/studio-bff";

function parseBody(json: unknown): StudioBFFRequest {
  if (!json || typeof json !== "object") {
    throw new Error("invalid body");
  }
  const proc = (json as { procedure?: unknown }).procedure;
  if (
    proc !== "query" &&
    proc !== "sequence" &&
    proc !== "transaction" &&
    proc !== "sql-lint"
  ) {
    throw new Error("invalid procedure");
  }
  return json as StudioBFFRequest;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: StudioBFFRequest;
  try {
    payload = parseBody(await request.json());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  return handleStudioBff(payload, { abortSignal: request.signal });
}
