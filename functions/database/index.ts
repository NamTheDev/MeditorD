import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import * as docs from "./documents";

const DB_ROOT = join(process.cwd(), "database");
await mkdir(DB_ROOT, { recursive: true });

export * from "./documents";
export const listDocuments = docs.listDocuments;
export const getDocumentByTitle = docs.getDocumentByTitle;
export const saveDocument = docs.saveDocument;
export const createFolder = docs.createFolder;
export const renameItem = docs.renameItem;
export const deleteDocument = docs.deleteDocument;
