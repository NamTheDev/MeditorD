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
