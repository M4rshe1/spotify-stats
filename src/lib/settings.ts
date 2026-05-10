import { db } from "@/server/db";
import { tryCatch } from "./try-catch";
import type { Settings } from "generated/prisma";
import { settings as settingDefs } from "./consts/settings";
function toRecord(settings: Settings[]) {
  const record: Record<
    string,
    string | boolean | number | string[] | Record<string, unknown>
  > = {};
  settings.forEach((setting) => {
    const settingDef = settingDefs[setting.key as keyof typeof settingDefs];
    if (!settingDef) {
      record[setting.key] = setting.value;
      return;
    }
    switch (settingDef.type) {
      case "boolean":
        record[setting.key] = setting.value === "true";
        break;
      case "string":
        record[setting.key] = setting.value;
        break;
      case "number":
        record[setting.key] = parseInt(setting.value);
        break;
      case "json":
        record[setting.key] = JSON.parse(setting.value);
        break;
      default:
        record[setting.key] = setting.value;
    }
  });
  return record;
}

export async function getSettings() {
  const result = await tryCatch(
    db.settings.findMany({
      where: {
        userId: null,
      },
    }),
  );
  return toRecord(result.data ?? []);
}

export async function getSetting(key: string) {
  const result = await tryCatch(
    db.settings.findFirst({
      where: {
        userId: null,
        key,
      },
    }),
  );
  return result.data;
}

export async function getSettingsForUser(userId: string) {
  const result = await tryCatch(
    db.settings.findMany({
      where: {
        userId,
      },
    }),
  );
  return toRecord(result.data ?? []);
}

export async function setSettingForUser(
  userId: string,
  key: string,
  value: string,
) {
  const result = await tryCatch(
    db.settings.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      create: {
        key,
        value,
        userId,
      },
      update: {
        value,
      },
    }),
  );
  return result.data;
}

export async function setSetting(key: string, value: string) {
  const result = await tryCatch(
    db.settings.upsert({
      where: {
        userId_key: {
          userId: null as unknown as string,
          key,
        },
      },
      create: {
        key,
        value,
        userId: null,
      },
      update: {
        value,
        userId: null,
      },
    }),
  );
  return result.data;
}

export async function setSettings(settings: Record<string, string>) {
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key, value);
  }
}
export async function deleteSetting(key: string) {
  const result = await tryCatch(
    db.settings.delete({
      where: {
        userId_key: {
          userId: null as unknown as string,
          key,
        },
      },
    }),
  );
  return result.data;
}

export async function deleteSettingForUser(userId: string, key: string) {
  const result = await tryCatch(
    db.settings.delete({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    }),
  );
  return result.data;
}
