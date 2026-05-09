"use client";

import { useMemo } from "react";
import { Studio } from "@prisma/studio-core/ui";
import "@prisma/studio-core/ui/index.css";
import { createStudioBFFClient } from "@prisma/studio-core/data/bff";
import { createPostgresAdapter } from "@prisma/studio-core/data/postgres-core";

export function AdminDatabaseStudio() {
  const adapter = useMemo(() => {
    const executor = createStudioBFFClient({
      url: "/api/admin/studio-query",
    });
    return createPostgresAdapter({ executor });
  }, []);

  return (
    <div className="h-[calc(100dvh-10rem)] min-h-[24rem] w-full overflow-hidden rounded-lg border bg-background shadow-sm">
      <Studio adapter={adapter} />
    </div>
  );
}
