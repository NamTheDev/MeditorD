import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { gunzipSync } from "node:zlib";
import { Database } from "bun:sqlite";

const DB_DIRECTORY = join(process.cwd(), "database");
const DB_PATH = join(DB_DIRECTORY, "meditord.sqlite");

export const POST_SCHEMA_VERSION = 3;

await mkdir(DB_DIRECTORY, { recursive: true });

const database = new Database(DB_PATH, { create: true });

database.run("PRAGMA journal_mode = WAL");
database.run("PRAGMA synchronous = NORMAL");
database.run("PRAGMA temp_store = MEMORY");
database.run("PRAGMA cache_size = -32768");
database.run("PRAGMA mmap_size = 268435456");
database.run("PRAGMA busy_timeout = 5000");

database.run(`
  CREATE TABLE IF NOT EXISTS documents (
    title TEXT PRIMARY KEY,
    is_directory INTEGER NOT NULL DEFAULT 0,
    username TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    media BLOB,
    media_name TEXT,
    media_type TEXT,
    media_hash TEXT,
    media_storage TEXT NOT NULL DEFAULT 'identity',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
if (
  !database
    .query<{ name: string }, []>("PRAGMA table_info(documents)")
    .all()
    .some((column) => column.name === "username")
) {
  database.run(
    "ALTER TABLE documents ADD COLUMN username TEXT NOT NULL DEFAULT ''",
  );
}

if (
  !database
    .query<{ name: string }, []>("PRAGMA table_info(documents)")
    .all()
    .some((column) => column.name === "media_hash")
) {
  database.run("ALTER TABLE documents ADD COLUMN media_hash TEXT");
}

if (
  !database
    .query<{ name: string }, []>("PRAGMA table_info(documents)")
    .all()
    .some((column) => column.name === "media_storage")
) {
  database.run(
    "ALTER TABLE documents ADD COLUMN media_storage TEXT NOT NULL DEFAULT 'gzip'",
  );
}

const mediaRowsToNormalize = database
  .query<
    {
      title: string;
      media: Uint8Array;
      media_hash: string | null;
      media_storage: string;
    },
    []
  >(
    `SELECT title, media, media_hash, media_storage
     FROM documents
     WHERE media IS NOT NULL
       AND (media_hash IS NULL OR media_storage != 'identity')`,
  )
  .all();

if (mediaRowsToNormalize.length) {
  const updateMediaStorage = database.query(
    `UPDATE documents
     SET media = ?, media_hash = ?, media_storage = 'identity'
     WHERE title = ?`,
  );
  const normalizeMediaStorage = database.transaction(() => {
    for (const row of mediaRowsToNormalize) {
      const rawMedia =
        row.media_storage === "identity"
          ? row.media
          : new Uint8Array(gunzipSync(row.media));
      const mediaHash = createHash("sha256").update(rawMedia).digest("hex");
      updateMediaStorage.run(rawMedia, mediaHash, row.title);
    }
  });
  normalizeMediaStorage();
}

database.run(`
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )
`);
database.run(
  "INSERT OR IGNORE INTO metadata (key, value) VALUES ('archive_revision', 1)",
);

database.run(`
  CREATE TRIGGER IF NOT EXISTS trg_documents_archive_rev_insert
  AFTER INSERT ON documents
  WHEN NEW.is_directory = 0
  BEGIN
    UPDATE metadata
    SET value = value + 1
    WHERE key = 'archive_revision';
  END
`);

database.run("DROP TRIGGER IF EXISTS trg_documents_archive_rev_update");

database.run(`
  CREATE TRIGGER trg_documents_archive_rev_update
  AFTER UPDATE ON documents
  WHEN
    (OLD.is_directory = 0 OR NEW.is_directory = 0)
    AND (
      OLD.is_directory IS NOT NEW.is_directory
      OR OLD.title IS NOT NEW.title
      OR OLD.username IS NOT NEW.username
      OR OLD.content IS NOT NEW.content
      OR OLD.url IS NOT NEW.url
      OR OLD.media_name IS NOT NEW.media_name
      OR OLD.media_type IS NOT NEW.media_type
      OR OLD.media_hash IS NOT NEW.media_hash
      OR OLD.created_at IS NOT NEW.created_at
    )
  BEGIN
    UPDATE metadata
    SET value = value + 1
    WHERE key = 'archive_revision';
  END
`);

database.run(`
  CREATE TRIGGER IF NOT EXISTS trg_documents_archive_rev_delete
  AFTER DELETE ON documents
  WHEN OLD.is_directory = 0
  BEGIN
    UPDATE metadata
    SET value = value + 1
    WHERE key = 'archive_revision';
  END
`);

database.run(`
  CREATE INDEX IF NOT EXISTS idx_documents_archive_order
  ON documents (is_directory, created_at DESC, title ASC)
`);
database.run("PRAGMA optimize=0x10002");

export interface FileRecord {
  title: string;
  isDirectory: boolean;
}

export interface DocumentRecord {
  title: string;
  username: string;
  content: string;
  url: string;
  mediaName: string | null;
  mediaType: string | null;
  mediaHash: string | null;
  hasMedia: boolean;
  created_at: string;
}

export interface MediaRecord {
  data: Uint8Array;
  name: string | null;
  type: string;
}

export interface MediaMetadataRecord {
  name: string | null;
  type: string;
  hash: string;
}

const MEDIA_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const mediaCache = new Map<string, Uint8Array>();
let mediaCacheBytes = 0;

function getCachedMedia(hash: string): Uint8Array | null {
  const cached = mediaCache.get(hash);
  if (!cached) return null;

  mediaCache.delete(hash);
  mediaCache.set(hash, cached);
  return cached;
}

function cacheMedia(hash: string, data: Uint8Array): void {
  if (!hash || data.byteLength > MEDIA_CACHE_MAX_BYTES) return;

  const existing = mediaCache.get(hash);
  if (existing) {
    mediaCacheBytes -= existing.byteLength;
    mediaCache.delete(hash);
  }

  while (
    mediaCacheBytes + data.byteLength > MEDIA_CACHE_MAX_BYTES &&
    mediaCache.size > 0
  ) {
    const oldestKey = mediaCache.keys().next().value;
    if (!oldestKey) break;
    const oldest = mediaCache.get(oldestKey);
    if (oldest) mediaCacheBytes -= oldest.byteLength;
    mediaCache.delete(oldestKey);
  }

  mediaCache.set(hash, data);
  mediaCacheBytes += data.byteLength;
}

function normalizeTitle(title: string): string {
  const normalized = posix
    .normalize(title.replaceAll("\\", "/"))
    .replace(/^\/+/, "");
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error("Invalid document title");
  }
  return normalized;
}

function toDocumentRecord(row: {
  title: string;
  username: string;
  content: string;
  url: string;
  media_name: string | null;
  media_type: string | null;
  media_hash: string | null;
  created_at: string;
}): DocumentRecord {
  return {
    title: row.title,
    username: row.username,
    content: row.content,
    url: row.url,
    mediaName: row.media_name,
    mediaType: row.media_type,
    mediaHash: row.media_hash,
    hasMedia: row.media_type !== null,
    created_at: row.created_at,
  };
}

type DocumentRow = Parameters<typeof toDocumentRecord>[0];

export function getArchiveRevision(): number {
  const row = database
    .query<{ value: number }, [string]>(
      "SELECT value FROM metadata WHERE key = ?",
    )
    .get("archive_revision");

  if (!row) {
    throw new Error("archive_revision metadata is missing");
  }

  return Number(row.value);
}

export function getArchiveValidator(): string {
  return `W/"s${POST_SCHEMA_VERSION}-r${getArchiveRevision()}"`;
}

export function getAllDocuments(): DocumentRecord[] {
  const rows = database
    .query<DocumentRow, []>(
      "SELECT title, username, content, url, media_name, media_type, media_hash, created_at FROM documents WHERE is_directory = 0 ORDER BY created_at DESC, title ASC",
    )
    .all();
  return rows.map(toDocumentRecord);
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
        username: string;
        content: string;
        url: string;
        media_name: string | null;
        media_type: string | null;
        media_hash: string | null;
        created_at: string;
      },
      [string]
    >(
      "SELECT title, username, content, url, media_name, media_type, media_hash, created_at FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  return row ? toDocumentRecord(row) : null;
}

export function getDocumentMediaMetadata(
  title: string,
): MediaMetadataRecord | null {
  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<
      {
        media_name: string | null;
        media_type: string | null;
        media_hash: string | null;
      },
      [string]
    >(
      "SELECT media_name, media_type, media_hash FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  if (!row?.media_type || !row.media_hash) return null;
  return {
    name: row.media_name,
    type: row.media_type,
    hash: row.media_hash,
  };
}

export function getDocumentMedia(
  title: string,
  metadata?: MediaMetadataRecord,
): MediaRecord | null {
  if (metadata) {
    const cached = getCachedMedia(metadata.hash);
    if (cached) {
      return {
        data: cached,
        name: metadata.name,
        type: metadata.type,
      };
    }
  }

  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<
      {
        media: Uint8Array | null;
        media_name: string | null;
        media_type: string | null;
        media_hash: string | null;
        media_storage: string;
      },
      [string]
    >(
      "SELECT media, media_name, media_type, media_hash, media_storage FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  if (!row?.media || !row.media_type) return null;

  const data =
    row.media_storage === "identity"
      ? row.media
      : new Uint8Array(gunzipSync(row.media));
  if (row.media_hash) cacheMedia(row.media_hash, data);

  return {
    data,
    name: row.media_name,
    type: row.media_type,
  };
}

export async function saveDocument(
  title: string,
  username = "",
  content = "",
  url = "",
  media?: File,
): Promise<DocumentRecord> {
  const normalizedTitle = normalizeTitle(title);
  const mediaBytes = media
    ? new Uint8Array(await media.arrayBuffer())
    : null;
  const mediaData = mediaBytes;
  const mediaHash = mediaBytes
    ? createHash("sha256").update(mediaBytes).digest("hex")
    : null;

  database
    .query(
      `INSERT INTO documents (
         title, is_directory, username, content, url,
         media, media_name, media_type, media_hash, media_storage
       )
       VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, 'identity')
       ON CONFLICT(title) DO UPDATE SET
         username = excluded.username,
         content = excluded.content,
         url = excluded.url,
         media = excluded.media,
         media_name = excluded.media_name,
         media_type = excluded.media_type,
         media_hash = excluded.media_hash,
         media_storage = excluded.media_storage,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run(
      normalizedTitle,
      username,
      content,
      url,
      mediaData,
      media?.name ?? null,
      media?.type || null,
      mediaHash,
    );

  if (mediaBytes && mediaHash) cacheMedia(mediaHash, mediaBytes);

  return getDocumentByTitle(normalizedTitle)!;
}

export async function updateDocument(
  oldTitle: string,
  title: string,
  username: string,
  content: string,
  url: string,
  createdAt: string,
  media?: File,
  removeMedia = false,
): Promise<DocumentRecord | null> {
  const normalizedOldTitle = normalizeTitle(oldTitle);
  const normalizedTitle = normalizeTitle(title);
  const mediaBytes = media
    ? new Uint8Array(await media.arrayBuffer())
    : null;
  const mediaData = mediaBytes;
  const mediaName = media?.name ?? null;
  const mediaType = media?.type || null;
  const mediaHash = mediaBytes
    ? createHash("sha256").update(mediaBytes).digest("hex")
    : null;

  const result = database
    .query(
      `UPDATE documents SET
        title = ?, username = ?, content = ?, url = ?, created_at = ?,
        media = CASE WHEN ? THEN NULL WHEN ? THEN ? ELSE media END,
        media_name = CASE WHEN ? THEN NULL WHEN ? THEN ? ELSE media_name END,
        media_type = CASE WHEN ? THEN NULL WHEN ? THEN ? ELSE media_type END,
        media_hash = CASE WHEN ? THEN NULL WHEN ? THEN ? ELSE media_hash END,
        media_storage = CASE
          WHEN ? THEN 'identity'
          WHEN ? THEN 'identity'
          ELSE media_storage
        END,
        updated_at = CURRENT_TIMESTAMP
       WHERE title = ? AND is_directory = 0`,
    )
    .run(
      normalizedTitle,
      username,
      content,
      url,
      createdAt || new Date().toISOString(),
      removeMedia ? 1 : 0,
      media ? 1 : 0,
      mediaData,
      removeMedia ? 1 : 0,
      media ? 1 : 0,
      mediaName,
      removeMedia ? 1 : 0,
      media ? 1 : 0,
      mediaType,
      removeMedia ? 1 : 0,
      media ? 1 : 0,
      mediaHash,
      removeMedia ? 1 : 0,
      media ? 1 : 0,
      normalizedOldTitle,
    );

  if (result.changes && mediaBytes && mediaHash) {
    cacheMedia(mediaHash, mediaBytes);
  }

  return result.changes ? getDocumentByTitle(normalizedTitle) : null;
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
    .query<{ is_directory: number }, [string]>(
      "SELECT is_directory FROM documents WHERE title = ?",
    )
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
        .query(
          "UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?",
        )
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
