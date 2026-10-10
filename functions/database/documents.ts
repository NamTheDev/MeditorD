import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { gunzipSync } from "node:zlib";
import { Database } from "bun:sqlite";

const DB_DIRECTORY = join(process.cwd(), "database");
const DB_PATH = join(DB_DIRECTORY, "meditord.sqlite");

export const POST_SCHEMA_VERSION = 4;

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
    media_size INTEGER,
    media_storage TEXT NOT NULL DEFAULT 'identity',
    media_thumbnail BLOB,
    media_thumbnail_type TEXT,
    media_thumbnail_hash TEXT,
    media_thumbnail_size INTEGER,
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

const documentColumns = new Set(
  database
    .query<{ name: string }, []>("PRAGMA table_info(documents)")
    .all()
    .map((column) => column.name),
);

for (const [column, definition] of [
  ["media_size", "INTEGER"],
  ["media_thumbnail", "BLOB"],
  ["media_thumbnail_type", "TEXT"],
  ["media_thumbnail_hash", "TEXT"],
  ["media_thumbnail_size", "INTEGER"],
] as const) {
  if (!documentColumns.has(column)) {
    database.run(`ALTER TABLE documents ADD COLUMN ${column} ${definition}`);
  }
}

database.run(
  `UPDATE documents
   SET media_size = length(media)
   WHERE media IS NOT NULL
     AND (media_size IS NULL OR media_size < 0)`,
);

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
     SET media = ?, media_hash = ?, media_size = ?, media_storage = 'identity'
     WHERE title = ?`,
  );
  const normalizeMediaStorage = database.transaction(() => {
    for (const row of mediaRowsToNormalize) {
      const rawMedia =
        row.media_storage === "identity"
          ? row.media
          : new Uint8Array(gunzipSync(row.media));
      const mediaHash = createHash("sha256").update(rawMedia).digest("hex");
      updateMediaStorage.run(rawMedia, mediaHash, rawMedia.byteLength, row.title);
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
      OR OLD.media_thumbnail_hash IS NOT NEW.media_thumbnail_hash
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

export interface DatabaseDocumentSummary {
  username: string;
  url: string;
  hasMedia: boolean;
  created_at: string;
}

export interface DatabaseItemRecord extends FileRecord {
  document: DatabaseDocumentSummary | null;
}

export interface DocumentRecord {
  title: string;
  username: string;
  content: string;
  url: string;
  mediaName: string | null;
  mediaType: string | null;
  mediaHash: string | null;
  thumbnailType: string | null;
  thumbnailHash: string | null;
  hasMedia: boolean;
  hasThumbnail: boolean;
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
  size: number;
}

export interface ThumbnailMetadataRecord {
  type: string;
  hash: string;
  size: number;
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
  media_thumbnail_type: string | null;
  media_thumbnail_hash: string | null;
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
    thumbnailType: row.media_thumbnail_type,
    thumbnailHash: row.media_thumbnail_hash,
    hasMedia: row.media_type !== null,
    hasThumbnail: row.media_thumbnail_hash !== null,
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
      "SELECT title, username, content, url, media_name, media_type, media_hash, media_thumbnail_type, media_thumbnail_hash, created_at FROM documents WHERE is_directory = 0 ORDER BY datetime(created_at) DESC, title ASC",
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

export function getDatabaseItems(): DatabaseItemRecord[] {
  const rows = database
    .query<
      {
        title: string;
        is_directory: number;
        username: string;
        url: string;
        media_type: string | null;
        created_at: string;
      },
      []
    >(
      `SELECT title, is_directory, username, url, media_type, created_at
       FROM documents
       ORDER BY title`,
    )
    .all();

  return rows.map((row) => {
    const isDirectory = row.is_directory === 1;
    return {
      title: row.title,
      isDirectory,
      document: isDirectory
        ? null
        : {
            username: row.username,
            url: row.url,
            hasMedia: row.media_type !== null,
            created_at: row.created_at,
          },
    };
  });
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
        media_thumbnail_type: string | null;
        media_thumbnail_hash: string | null;
        created_at: string;
      },
      [string]
    >(
      "SELECT title, username, content, url, media_name, media_type, media_hash, media_thumbnail_type, media_thumbnail_hash, created_at FROM documents WHERE title = ? AND is_directory = 0",
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
        media_size: number | null;
      },
      [string]
    >(
      "SELECT media_name, media_type, media_hash, COALESCE(media_size, length(media)) AS media_size FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  if (
    !row?.media_type ||
    !row.media_hash ||
    row.media_size === null ||
    row.media_size < 0
  ) {
    return null;
  }

  return {
    name: row.media_name,
    type: row.media_type,
    hash: row.media_hash,
    size: Number(row.media_size),
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

export function getDocumentMediaRange(
  title: string,
  metadata: MediaMetadataRecord,
  start: number,
  end: number,
): Uint8Array | null {
  if (
    start < 0 ||
    end < start ||
    end >= metadata.size
  ) {
    return null;
  }

  const cached = getCachedMedia(metadata.hash);
  if (cached) {
    return cached.subarray(start, end + 1);
  }

  const normalizedTitle = normalizeTitle(title);
  const byteLength = end - start + 1;
  const row = database
    .query<
      {
        media: Uint8Array | null;
      },
      [number, number, string]
    >(
      `SELECT substr(media, ?, ?) AS media
       FROM documents
       WHERE title = ?
         AND is_directory = 0
         AND media_storage = 'identity'`,
    )
    .get(start + 1, byteLength, normalizedTitle);

  if (row?.media) return row.media;

  const media = getDocumentMedia(title, metadata);
  return media?.data.subarray(start, end + 1) ?? null;
}

export function getDocumentThumbnailMetadata(
  title: string,
): ThumbnailMetadataRecord | null {
  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<
      {
        media_thumbnail_type: string | null;
        media_thumbnail_hash: string | null;
        media_thumbnail_size: number | null;
      },
      [string]
    >(
      `SELECT media_thumbnail_type, media_thumbnail_hash,
              COALESCE(media_thumbnail_size, length(media_thumbnail)) AS media_thumbnail_size
       FROM documents
       WHERE title = ? AND is_directory = 0`,
    )
    .get(normalizedTitle);

  if (!row?.media_thumbnail_type || !row.media_thumbnail_hash ||
      row.media_thumbnail_size === null || row.media_thumbnail_size < 0) return null;

  return {
    type: row.media_thumbnail_type,
    hash: row.media_thumbnail_hash,
    size: Number(row.media_thumbnail_size),
  };
}

export function getDocumentThumbnail(
  title: string,
  metadata?: ThumbnailMetadataRecord,
): Uint8Array | null {
  if (metadata) {
    const cached = getCachedMedia(metadata.hash);
    if (cached) return cached;
  }

  const normalizedTitle = normalizeTitle(title);
  const row = database
    .query<{ media_thumbnail: Uint8Array | null; media_thumbnail_hash: string | null }, [string]>(
      "SELECT media_thumbnail, media_thumbnail_hash FROM documents WHERE title = ? AND is_directory = 0",
    )
    .get(normalizedTitle);

  if (!row?.media_thumbnail) return null;
  if (row.media_thumbnail_hash) cacheMedia(row.media_thumbnail_hash, row.media_thumbnail);
  return row.media_thumbnail;
}

export async function saveDocumentThumbnail(
  title: string,
  thumbnail: File,
  expectedMediaHash: string,
): Promise<boolean> {
  if (!thumbnail.type.startsWith("image/")) return false;
  const normalizedTitle = normalizeTitle(title);
  const bytes = new Uint8Array(await thumbnail.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const result = database
    .query(
      `UPDATE documents SET
         media_thumbnail = ?, media_thumbnail_type = ?,
         media_thumbnail_hash = ?, media_thumbnail_size = ?
       WHERE title = ? AND is_directory = 0
         AND media_type LIKE 'image/%' AND media_hash = ?`,
    )
    .run(bytes, thumbnail.type || "image/webp", hash, bytes.byteLength, normalizedTitle, expectedMediaHash);
  if (result.changes) cacheMedia(hash, bytes);
  return result.changes > 0;
}

export async function saveDocument(
  title: string,
  username = "",
  content = "",
  url = "",
  media?: File,
  thumbnail?: File,
): Promise<DocumentRecord> {
  const normalizedTitle = normalizeTitle(title);
  const mediaBytes = media ? new Uint8Array(await media.arrayBuffer()) : null;
  const mediaHash = mediaBytes ? createHash("sha256").update(mediaBytes).digest("hex") : null;
  const thumbnailBytes =
    thumbnail && thumbnail.type.startsWith("image/")
      ? new Uint8Array(await thumbnail.arrayBuffer())
      : null;
  const thumbnailHash = thumbnailBytes
    ? createHash("sha256").update(thumbnailBytes).digest("hex")
    : null;

  database
    .query(
      `INSERT INTO documents (
         title, is_directory, username, content, url,
         media, media_name, media_type, media_hash, media_size, media_storage,
         media_thumbnail, media_thumbnail_type, media_thumbnail_hash, media_thumbnail_size
       )
       VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 'identity', ?, ?, ?, ?)
       ON CONFLICT(title) DO UPDATE SET
         username = excluded.username, content = excluded.content, url = excluded.url,
         media = excluded.media, media_name = excluded.media_name,
         media_type = excluded.media_type, media_hash = excluded.media_hash,
         media_size = excluded.media_size, media_storage = excluded.media_storage,
         media_thumbnail = excluded.media_thumbnail,
         media_thumbnail_type = excluded.media_thumbnail_type,
         media_thumbnail_hash = excluded.media_thumbnail_hash,
         media_thumbnail_size = excluded.media_thumbnail_size,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run(
      normalizedTitle, username, content, url,
      mediaBytes, media?.name ?? null, media?.type || null, mediaHash,
      mediaBytes?.byteLength ?? null,
      thumbnailBytes, thumbnailBytes ? thumbnail?.type || "image/webp" : null,
      thumbnailHash, thumbnailBytes?.byteLength ?? null,
    );

  if (mediaBytes && mediaHash) cacheMedia(mediaHash, mediaBytes);
  if (thumbnailBytes && thumbnailHash) cacheMedia(thumbnailHash, thumbnailBytes);
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
  thumbnail?: File,
  removeMedia = false,
): Promise<DocumentRecord | null> {
  const normalizedOldTitle = normalizeTitle(oldTitle);
  const normalizedTitle = normalizeTitle(title);
  const mediaBytes = media ? new Uint8Array(await media.arrayBuffer()) : null;
  const mediaHash = mediaBytes ? createHash("sha256").update(mediaBytes).digest("hex") : null;
  const thumbnailBytes =
    thumbnail && thumbnail.type.startsWith("image/")
      ? new Uint8Array(await thumbnail.arrayBuffer())
      : null;
  const thumbnailHash = thumbnailBytes
    ? createHash("sha256").update(thumbnailBytes).digest("hex")
    : null;

  const transaction = database.transaction(() => {
    const result = database
      .query(
        `UPDATE documents SET
          title = ?, username = ?, content = ?, url = ?, created_at = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE title = ? AND is_directory = 0`,
      )
      .run(normalizedTitle, username, content, url, createdAt || new Date().toISOString(), normalizedOldTitle);
    if (!result.changes) return 0;

    if (removeMedia) {
      database.query(
        `UPDATE documents SET
           media = NULL, media_name = NULL, media_type = NULL, media_hash = NULL,
           media_size = NULL, media_storage = 'identity',
           media_thumbnail = NULL, media_thumbnail_type = NULL,
           media_thumbnail_hash = NULL, media_thumbnail_size = NULL
         WHERE title = ? AND is_directory = 0`,
      ).run(normalizedTitle);
    } else if (media && mediaBytes && mediaHash) {
      database.query(
        `UPDATE documents SET
           media = ?, media_name = ?, media_type = ?, media_hash = ?, media_size = ?,
           media_storage = 'identity',
           media_thumbnail = ?, media_thumbnail_type = ?,
           media_thumbnail_hash = ?, media_thumbnail_size = ?
         WHERE title = ? AND is_directory = 0`,
      ).run(
        mediaBytes, media.name, media.type || null, mediaHash, mediaBytes.byteLength,
        thumbnailBytes, thumbnailBytes ? thumbnail?.type || "image/webp" : null,
        thumbnailHash, thumbnailBytes?.byteLength ?? null, normalizedTitle,
      );
    }
    return result.changes;
  });

  const changes = transaction();
  if (!changes) return null;
  if (mediaBytes && mediaHash) cacheMedia(mediaHash, mediaBytes);
  if (thumbnailBytes && thumbnailHash) cacheMedia(thumbnailHash, thumbnailBytes);
  return getDocumentByTitle(normalizedTitle);
}

export function createFolder(folderPath: string): boolean {
  const title = normalizeTitle(folderPath);
  const existing = database
    .query<{ is_directory: number }, [string]>(
      "SELECT is_directory FROM documents WHERE title = ?",
    )
    .get(title);
  if (existing) throw new Error("An item with that name already exists");
  database
    .query("INSERT INTO documents (title, is_directory) VALUES (?, 1)")
    .run(title);
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
  if (newTitle === oldTitle) return true;
  if (database.query("SELECT 1 FROM documents WHERE title = ?").get(newTitle)) {
    throw new Error("An item already exists at the destination");
  }
  if (item.is_directory === 1 && newTitle.startsWith(oldTitle + "/")) {
    throw new Error("Cannot move a folder into itself");
  }

  const transaction = database.transaction(() => {
    if (item.is_directory === 1) {
      database
        .query(
          "UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?",
        )
        .run(newTitle, oldTitle);
      const prefix = oldTitle + "/";
      database
        .query(
          `UPDATE documents
           SET title = ? || substr(title, length(?) + 1),
               updated_at = CURRENT_TIMESTAMP
           WHERE substr(title, 1, length(?)) = ?`,
        )
        .run(newTitle, oldTitle, prefix, prefix);
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
  const item = database
    .query<{ is_directory: number }, [string]>(
      "SELECT is_directory FROM documents WHERE title = ?",
    )
    .get(normalizedTitle);
  if (item?.is_directory === 0) {
    return database
      .query("DELETE FROM documents WHERE title = ?")
      .run(normalizedTitle).changes > 0;
  }
  const prefix = normalizedTitle + "/";
  const result = database
    .query(
      "DELETE FROM documents WHERE title = ? OR substr(title, 1, length(?)) = ?",
    )
    .run(normalizedTitle, prefix, prefix);
  return result.changes > 0;
}
