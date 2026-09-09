import { readdir, mkdir, rm, rename, stat } from "node:fs/promises";
import { join, relative, dirname, resolve, sep } from "node:path";

const DB_ROOT = join(process.cwd(), "database");
const DB_ROOT_PREFIX = `${DB_ROOT}${sep}`;

function resolveDatabasePath(targetPath: string): string {
  const resolvedPath = resolve(DB_ROOT, targetPath);
  if (resolvedPath !== DB_ROOT && !resolvedPath.startsWith(DB_ROOT_PREFIX)) {
    throw new Error("Path escapes the database directory");
  }
  return resolvedPath;
}

export interface FileRecord {
  title: string;
  isDirectory: boolean;
}

export async function listDocuments(): Promise<FileRecord[]> {
  await mkdir(DB_ROOT, { recursive: true });
  const items: FileRecord[] = [];

  async function scan(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(DB_ROOT, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        items.push({ title: relPath, isDirectory: true });
        await scan(fullPath);
      } else if (entry.isFile() && !entry.name.startsWith(".")) {
        items.push({ title: relPath, isDirectory: false });
      }
    }
  }

  await scan(DB_ROOT);
  return items;
}

export async function getDocumentByTitle(title: string): Promise<{ title: string; content: string } | null> {
  const filePath = resolveDatabasePath(title);
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  const content = await file.text();
  return { title, content };
}

export async function saveDocument(title: string, content: string = ""): Promise<{ title: string; content: string }> {
  const filePath = resolveDatabasePath(title);
  await mkdir(dirname(filePath), { recursive: true });
  await Bun.write(filePath, content);
  return { title, content };
}

export async function createFolder(folderPath: string): Promise<boolean> {
  const target = resolveDatabasePath(folderPath);
  await mkdir(target, { recursive: true });
  return true;
}

export async function renameItem(oldPath: string, newPath: string): Promise<boolean> {
  const src = resolveDatabasePath(oldPath);
  const dest = resolveDatabasePath(newPath);
  try {
    await stat(src);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
  await mkdir(dirname(dest), { recursive: true });
  await rename(src, dest);
  return true;
}

export async function deleteDocument(title: string): Promise<boolean> {
  const target = resolveDatabasePath(title);
  try {
    await rm(target, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
