import { mkdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { Database } from "bun:sqlite";

const DB_DIRECTORY = join(process.cwd(), "database");
const DB_PATH = join(DB_DIRECTORY, "meditord.sqlite");

await mkdir(DB_DIRECTORY, { recursive: true });

const database = new Database(DB_PATH, { create: true });
database.run(`
  CREATE TABLE IF NOT EXISTS documents (
    title TEXT PRIMARY KEY,
    is_directory INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    media BLOB,
    media_name TEXT,
    media_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface FileRecord {
  title: string;
  isDirectory: boolean;
}

export interface DocumentRecord {
  title: string;
  content: string;
  url: string;
  mediaName: string | null;
  mediaType: string | null;
  hasMedia: boolean;
}

export interface MediaRecord {
  data: Uint8Array;
  name: string | null;
  type: string;
}

function normalizeTitle(title: string): string {
  const normalized = posix.normalize(title.replaceAll("\\", "/")).replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Invalid document title");
  }
  return normalized;
}

function toDocumentRecord(row: {
  title: string;
  content: string;
  url: string;
  media_name: string | null;
  media_type: string | null;
}): DocumentRecord {
  return {
    title: row.title,
    content: row.content,
    url: row.url,
    mediaName: row.media_name,
    mediaType: row.media_type,
    hasMedia: row.media_type !== null,
  };
}

export function listDocuments(): FileRecord[] {
  const rows = database
    .query<{ title: string; is_directory: number }, []>(
      "SELECT title, is_directory FROM documents ORDER BY title",
    )
    .all();

  return rows.map((row) => ({
    title: row.title,
    isDirectory: row.is_directory === 1,
  }));
}

export function getDocumentByTitle(title: string): DocumentRecord | null {
  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<
      {
        title: string;
        content: string;
        url: string;
        media_name: string | null;
        media_type: string | null;
      },
      [string]
    >(
      "SELECT title, content, url, media_name, media_type FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  return row ? toDocumentRecord(row) : null;
}

export function getDocumentMedia(title: string): MediaRecord | null {
  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<
      { media: Uint8Array | null; media_name: string | null; media_type: string | null },
      [string]
    >("SELECT media, media_name, media_type FROM documents WHERE title = ? AND is_directory = 0")
    .get(normalizedTitle);

  if (!row?.media || !row.media_type) return null;
  return {
    data: new Uint8Array(gunzipSync(row.media)),
    name: row.media_name,
    type: row.media_type,
  };
}

export async function saveDocument(
  title: string,
  content = "",
  url = "",
  media?: File,
): Promise<DocumentRecord> {
  const normalizedTitle = normalizeTitle(title);
  const mediaData = media ? gzipSync(new Uint8Array(await media.arrayBuffer())) : null;

  database
    .query(
      `INSERT INTO documents (title, is_directory, content, url, media, media_name, media_type)
       VALUES (?, 0, ?, ?, ?, ?, ?)
       ON CONFLICT(title) DO UPDATE SET
         content = excluded.content,
         url = excluded.url,
         media = excluded.media,
         media_name = excluded.media_name,
         media_type = excluded.media_type,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run(
      normalizedTitle,
      content,
      url,
      mediaData,
      media?.name ?? null,
      media?.type || null,
    );

  return getDocumentByTitle(normalizedTitle)!;
}

export function createFolder(folderPath: string): boolean {
  const normalizedPath = normalizeTitle(folderPath);
  database
    .query(
      `INSERT INTO documents (title, is_directory)
       VALUES (?, 1)
       ON CONFLICT(title) DO UPDATE SET is_directory = 1, updated_at = CURRENT_TIMESTAMP`,
    )
    .run(normalizedPath);
  return true;
}

export function renameItem(oldPath: string, newPath: string): boolean {
  const oldTitle = normalizeTitle(oldPath);
  const newTitle = normalizeTitle(newPath);
  const item = database
    .query<{ is_directory: number }, [string]>("SELECT is_directory FROM documents WHERE title = ?")
    .get(oldTitle);
  if (!item) return false;

  const transaction = database.transaction(() => {
    if (item.is_directory === 1) {
      database
        .query(
          "UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?",
        )
        .run(newTitle, oldTitle);
      database
        .query(
          "UPDATE documents SET title = replace(title, ?, ?), updated_at = CURRENT_TIMESTAMP WHERE title LIKE ?",
        )
        .run(`${oldTitle}/`, `${newTitle}/`, `${oldTitle}/%`);
    } else {
      database
        .query("UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?")
        .run(newTitle, oldTitle);
    }
  });
  transaction();
  return true;
}

export function deleteDocument(title: string): boolean {
  const normalizedTitle = normalizeTitle(title);
  const result = database
    .query("DELETE FROM documents WHERE title = ? OR title LIKE ?")
    .run(normalizedTitle, `${normalizedTitle}/%`);
  return result.changes > 0;
}
