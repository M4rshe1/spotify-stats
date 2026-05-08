import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { getImportQueue } from "@/server/queues/import";

export const runtime = "nodejs";

const IMPORT_FILE_EXTENSION = ".json";
const IMPORT_TYPE = "spotify_history";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  const fallbackFile = formData.get("file");
  if (files.length === 0 && fallbackFile instanceof File) {
    files.push(fallbackFile);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const fileContents: Array<{ fileName: string; content: string }> = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(IMPORT_FILE_EXTENSION)) {
      return NextResponse.json(
        { error: `Only JSON files are supported (${file.name})` },
        { status: 400 },
      );
    }

    const content = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: `Invalid JSON file (${file.name})` },
        { status: 400 },
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: `Import JSON must be an array (${file.name})` },
        { status: 400 },
      );
    }

    fileContents.push({ fileName: file.name, content });
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const queuedImportIds: number[] = [];
  const failedFileNames: string[] = [];

  for (const fileContent of fileContents) {
    const importRecord = await db.import.create({
      data: {
        userId: session.user.id,
        type: IMPORT_TYPE,
        status: "pending",
        progress: 0,
        entriesAdded: 0,
        startedAt: new Date(),
      },
      select: { id: true },
    });

    try {
      const targetPath = path.join(uploadsDir, `${importRecord.id}.json`);
      await writeFile(targetPath, fileContent.content, "utf8");
      await getImportQueue().add("import-history", { id: importRecord.id });
      queuedImportIds.push(importRecord.id);
    } catch (error: any) {
      failedFileNames.push(fileContent.fileName);
      await db.import.update({
        where: { id: importRecord.id },
        data: {
          status: "failed",
          error: error?.message ?? "Failed to enqueue import",
          completedAt: new Date(),
        },
      });
    }
  }

  if (queuedImportIds.length === 0) {
    return NextResponse.json(
      { error: "Failed to enqueue imports" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ids: queuedImportIds,
    count: queuedImportIds.length,
    failed: failedFileNames.length,
    failedFiles: failedFileNames,
  });
}
