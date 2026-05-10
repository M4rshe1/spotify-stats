import { db } from "@/server/db";
import { tryCatch, tryCatchSync } from "./try-catch";
import type { Settings } from "generated/prisma";
import {
  settings as settingDefs,
  type Setting,
  userSettings,
  type SettingsRecord,
} from "./consts/settings";

function toRecord(settings: Settings[], defs: Record<string, Setting>) {
  const record: Record<string, Setting["defaultValue"]> = {};
  settings.forEach((setting) => {
    const settingDef = defs[setting.key as keyof typeof settingDefs];
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
        const result = tryCatchSync(() => JSON.parse(setting.value));
        if (result.error) {
          record[setting.key] = setting.value;
        } else {
          record[setting.key] = result.data;
        }
        break;
      default:
        record[setting.key] = setting.value;
    }
  });
  for (const [key, value] of Object.entries(settingDefs)) {
    if (!record[key]) {
      record[key] = value.defaultValue;
    }
  }
  return record as Record<Setting["key"], Setting["defaultValue"]>;
}

export async function getSettings() {
  const result = await tryCatch(
    db.settings.findMany({
      where: {
        userId: {
          equals: null,
        },
      },
    }),
  );
  return toRecord(result.data ?? [], settingDefs as SettingsRecord);
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
  return toRecord(result.data ?? [], userSettings as SettingsRecord);
}

export async function getSettingForUser(userId: string, key: string) {
  const result = await tryCatch(
    db.settings.findFirst({
      where: { userId, key },
    }),
  );
  return result.data;
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
  const setting = await tryCatch(
    db.settings.findFirst({
      where: {
        userId: null,
        key,
      },
    }),
  );
  if (setting.data) {
    await tryCatch(
      db.settings.update({
        where: { id: setting.data.id },
        data: { value },
      }),
    );
  } else {
    await tryCatch(
      db.settings.create({
        data: { key, value, userId: null },
      }),
    );
  }
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
