import * as db from "../database";

export interface ApiConfig {
  prefix?: string;
}

export async function handleApi(req: Request, config: ApiConfig = { prefix: "/api" }): Promise<Response | null> {
  const url = new URL(req.url);
  const prefix = config.prefix || "/api";

  if (!url.pathname.startsWith(prefix)) {
    return null;
  }

  const endpoint = url.pathname.slice(prefix.length).replace(/\/+$/, "") || "/";
  const method = req.method.toUpperCase();

  try {
    if (endpoint === "/documents" && method === "GET") {
      const items = await db.listDocuments();
      return Response.json(items);
    }

    if (endpoint.startsWith("/documents/") && method === "GET") {
      const title = decodeURIComponent(endpoint.slice("/documents/".length));
      const doc = await db.getDocumentByTitle(title);
      if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json(doc);
    }

    if (endpoint === "/documents" && method === "POST") {
      const body = (await req.json()) as { title?: string; content?: string; isFolder?: boolean };
      if (!body.title) {
        return Response.json({ error: "Title is required" }, { status: 400 });
      }

      if (body.isFolder) {
        await db.createFolder(body.title);
        return Response.json({ title: body.title, isDirectory: true }, { status: 201 });
      }

      const saved = await db.saveDocument(body.title, body.content ?? "");
      return Response.json(saved, { status: 201 });
    }

    if (endpoint.startsWith("/documents/") && method === "PUT") {
      const oldTitle = decodeURIComponent(endpoint.slice("/documents/".length));
      const body = (await req.json()) as { newTitle?: string };
      if (!body.newTitle) {
        return Response.json({ error: "New title is required" }, { status: 400 });
      }

      const success = await db.renameItem(oldTitle, body.newTitle);
      if (!success) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      return Response.json({ success: true });
    }

    if (endpoint.startsWith("/documents/") && method === "DELETE") {
      const title = decodeURIComponent(endpoint.slice("/documents/".length));
      const success = await db.deleteDocument(title);
      if (!success) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Method or route not allowed" }, { status: 405 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
