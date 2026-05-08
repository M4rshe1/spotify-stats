"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadIcon, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type ImportRow = {
  id: number;
  type: string;
  status: string;
  progress: number;
  entriesAdded: number;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const statusMeta: Record<
  string,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" }
> = {
  pending: { label: "Pending", badgeVariant: "secondary" },
  processing: { label: "Processing", badgeVariant: "default" },
  completed: { label: "Completed", badgeVariant: "default" },
  failed: { label: "Failed", badgeVariant: "destructive" },
};

const formatDateTime = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "—";

function normalizeProgress(status: string, progress: number) {
  if (status === "completed") return 100;
  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}

function estimateFinishedAt(row: ImportRow): Date | null {
  if (row.status === "completed") return row.completedAt;
  if (!["pending", "processing"].includes(row.status)) return null;
  if (row.progress <= 0 || row.progress >= 1) return null;

  const elapsedMs = Date.now() - new Date(row.startedAt).getTime();
  if (elapsedMs <= 0) return null;

  const estimatedTotalMs = elapsedMs / row.progress;
  const estimatedFinishMs =
    new Date(row.startedAt).getTime() + estimatedTotalMs;
  return new Date(estimatedFinishMs);
}

function formatDuration(startedAt: Date, completedAt: Date | null) {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

type UploadFileStatus = "ready" | "uploading" | "uploaded" | "failed";

type UploadFileItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadFileStatus;
  error: string | null;
};

const getFileId = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

const uploadStatusLabel: Record<UploadFileStatus, string> = {
  ready: "Ready",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
};

function UploadCard({
  onUpload,
  isUploading,
}: {
  onUpload: (
    files: File[],
    onFileUpdate: (update: {
      fileId: string;
      progress?: number;
      status?: UploadFileStatus;
      error?: string | null;
    }) => void,
  ) => Promise<void>;
  isUploading: boolean;
}) {
  const [selectedFiles, setSelectedFiles] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasFiles = selectedFiles.length > 0;
  const areFilesReady =
    hasFiles && selectedFiles.every((item) => item.status === "ready");

  const mergeFiles = (incomingFiles: File[]) => {
    const jsonFiles = incomingFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".json"),
    );
    const skippedFiles = incomingFiles.length - jsonFiles.length;
    if (skippedFiles > 0) {
      toast.error(
        `Skipped ${skippedFiles} non-JSON file${skippedFiles === 1 ? "" : "s"}`,
      );
    }
    if (jsonFiles.length === 0) return;

    setSelectedFiles((current) => {
      const deduped = new Map(current.map((item) => [item.id, item]));
      for (const file of jsonFiles) {
        const fileId = getFileId(file);
        if (!deduped.has(fileId)) {
          deduped.set(fileId, {
            id: fileId,
            file,
            progress: 0,
            status: "ready",
            error: null,
          });
        }
      }
      return Array.from(deduped.values());
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload import file</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            mergeFiles(files);
          }}
        />
        <button
          type="button"
          className={cn(
            "bg-muted/25 hover:bg-muted/40 flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
            isDragging && "border-primary bg-primary/5",
            hasFiles && "border-primary/70",
          )}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const files = Array.from(event.dataTransfer.files ?? []);
            mergeFiles(files);
          }}
        >
          <UploadIcon className="text-muted-foreground size-6" />
          <p className="text-sm font-medium">Drop JSON files here</p>
          <p className="text-muted-foreground text-xs">
            or click to choose one or more files
          </p>
          {hasFiles ? (
            <p className="text-muted-foreground text-xs">
              {selectedFiles.length} selected
            </p>
          ) : null}
        </button>
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Upload one or more Spotify streaming history JSON files.
          </p>
          <Button
            onClick={async () => {
              if (!hasFiles) {
                toast.error("Choose at least one JSON file first");
                return;
              }
              if (!areFilesReady) {
                toast.error("Wait until all files are ready before uploading");
                return;
              }
              await onUpload(
                selectedFiles.map((item) => item.file),
                ({ fileId, progress, status, error }) => {
                  if (status === "uploaded") {
                    setSelectedFiles((current) =>
                      current.filter((item) => item.id !== fileId),
                    );
                    return;
                  }
                  setSelectedFiles((current) =>
                    current.map((item) =>
                      item.id !== fileId
                        ? item
                        : {
                            ...item,
                            progress: progress ?? item.progress,
                            status: status ?? item.status,
                            error: error ?? item.error,
                          },
                    ),
                  );
                },
              );
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            disabled={isUploading || !areFilesReady}
          >
            <UploadIcon className="mr-1 size-4" />
            {isUploading
              ? "Uploading..."
              : selectedFiles.length > 1
                ? `Upload (${selectedFiles.length})`
                : "Upload"}
          </Button>
        </div>
        {hasFiles ? (
          <div className="space-y-2">
            {selectedFiles.map((item) => (
              <div key={item.id} className="space-y-1 rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.file.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        item.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.error ?? uploadStatusLabel[item.status]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedFiles((current) =>
                        current.filter(
                          (currentItem) => currentItem.id !== item.id,
                        ),
                      );
                    }}
                    disabled={isUploading}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <Progress value={item.progress} />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImportList({ imports }: { imports: ImportRow[] }) {
  const [expandedImportId, setExpandedImportId] = useState<number | null>(null);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isFailedOpen, setIsFailedOpen] = useState(false);

  const activeImports = imports.filter((row) =>
    ["pending", "processing"].includes(row.status),
  );
  const completedImports = imports.filter((row) => row.status === "completed");
  const failedImports = imports.filter((row) => row.status === "failed");

  if (imports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Imports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No imports yet. Upload your first file above.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderImportRows = (rows: ImportRow[]) =>
    rows.map((row) => {
      const status = statusMeta[row.status] ?? {
        label: row.status,
        badgeVariant: "secondary" as const,
      };
      const progress = normalizeProgress(row.status, row.progress);
      const eta = estimateFinishedAt(row);
      const duration = formatDuration(row.startedAt, row.completedAt);
      const isExpanded = expandedImportId === row.id;
      return (
        <div key={row.id} className="space-y-2 border p-3">
          <button
            type="button"
            className="w-full text-left"
            onClick={() =>
              setExpandedImportId((current) =>
                current === row.id ? null : row.id,
              )
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Import #{row.id}</p>
                  <Badge variant={status.badgeVariant}>{status.label}</Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {row.type} • Started {formatDateTime(row.startedAt)}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {row.completedAt
                  ? `Finished ${formatDateTime(row.completedAt)}`
                  : eta
                    ? `Est. finished ${formatDateTime(eta)}`
                    : "Est. finished —"}
              </p>
            </div>
          </button>
          <Progress value={progress} />
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>{progress}%</span>
            {row.error ? (
              <span className="text-destructive line-clamp-1">{row.error}</span>
            ) : (
              <span>Updated {formatDateTime(row.updatedAt)}</span>
            )}
          </div>
          {isExpanded ? (
            <div className="text-muted-foreground border-t pt-2 text-xs">
              <span>
                Duration {duration} • Added {row.entriesAdded.toLocaleString()}{" "}
                playback
                {row.entriesAdded === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
        </div>
      );
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active imports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeImports.length > 0 ? (
            renderImportRows(activeImports)
          ) : (
            <p className="text-muted-foreground text-sm">
              No active imports right now.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left"
            onClick={() => setIsCompletedOpen((current) => !current)}
          >
            <CardTitle>Completed imports ({completedImports.length})</CardTitle>
            <span className="text-muted-foreground text-xs hover:underline">
              {isCompletedOpen ? "Hide" : "Show"}
            </span>
          </button>
        </CardHeader>
        {isCompletedOpen ? (
          <CardContent className="space-y-4">
            {completedImports.length > 0 ? (
              renderImportRows(completedImports)
            ) : (
              <p className="text-muted-foreground text-sm">
                No completed imports yet.
              </p>
            )}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left"
            onClick={() => setIsFailedOpen((current) => !current)}
          >
            <CardTitle>Failed imports ({failedImports.length})</CardTitle>
            <span className="text-muted-foreground text-xs hover:underline">
              {isFailedOpen ? "Hide" : "Show"}
            </span>
          </button>
        </CardHeader>
        {isFailedOpen ? (
          <CardContent className="space-y-4">
            {failedImports.length > 0 ? (
              renderImportRows(failedImports)
            ) : (
              <p className="text-muted-foreground text-sm">
                No failed imports.
              </p>
            )}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const utils = api.useUtils();
  const importsQuery = api.import.list.useQuery(undefined, {
    refetchInterval: (query) => {
      const imports = (query.state.data as ImportRow[] | undefined) ?? [];
      const hasRunningImport = imports.some((row) =>
        ["pending", "processing"].includes(row.status),
      );
      return hasRunningImport ? 2000 : 10000;
    },
  });

  const imports = useMemo(() => importsQuery.data ?? [], [importsQuery.data]);

  const uploadFile = async (
    files: File[],
    onFileUpdate: (update: {
      fileId: string;
      progress?: number;
      status?: UploadFileStatus;
      error?: string | null;
    }) => void,
  ) => {
    const uploadSingleFile = async (file: File) => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/import/upload");
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          onFileUpdate({
            fileId: getFileId(file),
            progress: Math.round((event.loaded / event.total) * 100),
            status: "uploading",
          });
        };
        xhr.onerror = () => {
          reject(new Error("Network error while uploading file"));
        };
        xhr.onload = () => {
          let payload: { error?: string } = {};
          try {
            payload = JSON.parse(xhr.responseText) as { error?: string };
          } catch {
            payload = {};
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          reject(new Error(payload.error ?? "Upload failed"));
        };

        const formData = new FormData();
        formData.append("files", file);
        xhr.send(formData);
      });
    };

    setIsUploading(true);
    let queuedCount = 0;
    let failedCount = 0;

    try {
      for (const file of files) {
        const fileId = getFileId(file);
        onFileUpdate({ fileId, status: "uploading", progress: 0, error: null });
        try {
          await uploadSingleFile(file);
          queuedCount += 1;
          onFileUpdate({
            fileId,
            status: "uploaded",
            progress: 100,
            error: null,
          });
        } catch (error: any) {
          failedCount += 1;
          onFileUpdate({
            fileId,
            status: "failed",
            progress: 0,
            error: error?.message ?? "Failed to upload file",
          });
        }
      }

      if (queuedCount > 0) {
        toast.success(
          `Queued ${queuedCount} import${queuedCount === 1 ? "" : "s"}`,
        );
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} file${failedCount === 1 ? "" : "s"} failed to upload`,
        );
      }
      if (queuedCount === 0) {
        throw new Error("Failed to upload files");
      }
      await utils.import.list.invalidate();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  if (importsQuery.isLoading) {
    return <Loading className="h-full border-none" />;
  }

  return (
    <div className="space-y-4">
      <UploadCard onUpload={uploadFile} isUploading={isUploading} />
      <ImportList imports={imports} />
    </div>
  );
}
