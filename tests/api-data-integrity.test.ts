import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalDirectory = process.cwd();
const temporaryDirectory = mkdtempSync(join(tmpdir(), "meditord-api-test-"));
process.chdir(temporaryDirectory);

// Initialize the API only after switching to an isolated SQLite database.
const { handleApi } = await import("../functions/api");

afterAll(() => {
  process.chdir(originalDirectory);
  try {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  } catch {
    // Some platforms keep the SQLite file open until the process exits.
  }
});

async function request(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: Record<string, string | boolean>,
): Promise<{ status: number; data: any }> {
  const response = await handleApi(
    new Request(`http://localhost/api${path}`, {
      method,
      ...(body ? {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      } : {}),
    }),
  );

  if (!response) throw new Error("API did not handle the request");
  return { status: response.status, data: await response.json() };
}

test("post creation cannot overwrite existing posts or folders", async () => {
  expect((await request("POST", "/documents", { title: "Collection", isFolder: true })).status).toBe(201);
  expect((await request("POST", "/documents", { title: "Collection", isFolder: true })).status).toBe(409);
  expect((await request("POST", "/documents", { title: "Collection", content: "Invalid" })).status).toBe(409);

  expect((await request("POST", "/documents", { title: "Original", content: "Preserve me" })).status).toBe(201);
  expect((await request("POST", "/documents", { title: "Original", content: "Overwrite attempt" })).status).toBe(409);

  const original = await request("GET", "/documents/Original");
  expect(original.status).toBe(200);
  expect(original.data.content).toBe("Preserve me");

  expect((await request("POST", "/documents", { title: "Second", content: "Keep me too" })).status).toBe(201);
  expect((await request("PUT", "/documents/Second", { newTitle: "Original" })).status).toBe(409);
  expect((await request("PUT", "/documents/Second", { newTitle: "Collection" })).status).toBe(409);

  expect((await request("PUT", "/documents/Second", { newTitle: "Collection/Second" })).status).toBe(200);
  const moved = await request("GET", "/documents/Collection%2FSecond");
  expect(moved.status).toBe(200);
  expect(moved.data.content).toBe("Keep me too");

  // Editing an existing post still uses the distinct multipart PUT workflow.
  const edit = new FormData();
  edit.set("title", "Original");
  edit.set("content", "Edited intentionally");
  const updated = await handleApi(
    new Request("http://localhost/api/documents/Original", {
      method: "PUT",
      body: edit,
    }),
  );
  expect(updated?.status).toBe(200);
  const afterEdit = await request("GET", "/documents/Original");
  expect(afterEdit.data.content).toBe("Edited intentionally");

  // A conflicting edit title must fail without losing the source post.
  edit.set("title", "Collection/Second");
  const conflict = await handleApi(
    new Request("http://localhost/api/documents/Original", {
      method: "PUT",
      body: edit,
    }),
  );
  expect(conflict?.status).toBe(409);
  const afterConflict = await request("GET", "/documents/Original");
  expect(afterConflict.data.content).toBe("Edited intentionally");
});

test("a foldered post moves to Archive root without data loss and rejects collisions", async () => {
  const folder = "Unfiled regression folder";
  const nestedTitle = `${folder}/Unique nested post`;
  const conflictingTitle = `${folder}/Root collision`;

  expect((await request("POST", "/documents", { title: folder, isFolder: true })).status).toBe(201);
  expect((await request("POST", "/documents", {
    title: nestedTitle,
    content: "Keep this description when unfiling",
  })).status).toBe(201);

  // The Remove from folder menu uses the existing rename endpoint, with no folder prefix.
  expect((await request("PUT", `/documents/${encodeURIComponent(nestedTitle)}`, {
    newTitle: "Unique nested post",
  })).status).toBe(200);

  const unfiled = await request("GET", "/documents/Unique%20nested%20post");
  expect(unfiled.status).toBe(200);
  expect(unfiled.data.content).toBe("Keep this description when unfiling");
  expect((await request("GET", `/documents/${encodeURIComponent(nestedTitle)}`)).status).toBe(404);

  expect((await request("POST", "/documents", {
    title: "Root collision",
    content: "Existing root post",
  })).status).toBe(201);
  expect((await request("POST", "/documents", {
    title: conflictingTitle,
    content: "Foldered post survives failed move",
  })).status).toBe(201);

  expect((await request("PUT", `/documents/${encodeURIComponent(conflictingTitle)}`, {
    newTitle: "Root collision",
  })).status).toBe(409);
  expect((await request("GET", "/documents/Root%20collision")).data.content).toBe("Existing root post");
  expect((await request("GET", `/documents/${encodeURIComponent(conflictingTitle)}`)).data.content)
    .toBe("Foldered post survives failed move");
});
