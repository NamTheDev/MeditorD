import * as db from "../database";
import { isSupportedPostUrl } from "../url";

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

    if (endpoint.startsWith("/media/") && method === "GET") {
      const title = decodeURIComponent(endpoint.slice("/media/".length));
      const media = await db.getDocumentMedia(title);
      if (!media) return Response.json({ error: "Media not found" }, { status: 404 });
      return new Response(media.data, {
        headers: {
          "Content-Type": media.type,
          "Content-Disposition": media.name ? `inline; filename="${encodeURIComponent(media.name)}"` : "inline",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (endpoint === "/documents" && method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";
      let title: string | undefined;
      let username = "";
      let content = "";
      let url = "";
      let media: File | undefined;
      let isFolder = false;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        title = form.get("title")?.toString();
        username = form.get("username")?.toString() ?? "";
        content = form.get("content")?.toString() ?? "";
        url = form.get("url")?.toString() ?? "";
        isFolder = form.get("isFolder") === "true";
        const uploadedMedia = form.get("media");
        if (uploadedMedia instanceof File && uploadedMedia.size > 0) {
          if (!uploadedMedia.type.startsWith("image/") && !uploadedMedia.type.startsWith("video/")) {
            return Response.json({ error: "Only image and video files are supported" }, { status: 415 });
          }
          media = uploadedMedia;
        }
      } else {
        const body = (await req.json()) as {
          title?: string;
          username?: string;
          content?: string;
          url?: string;
          isFolder?: boolean;
        };
        title = body.title;
        username = body.username ?? "";
        content = body.content ?? "";
        url = body.url ?? "";
        isFolder = body.isFolder ?? false;
      }

      if (!title) {
        return Response.json({ error: "Title is required" }, { status: 400 });
      }

      if (isFolder) {
        await db.createFolder(title);
        return Response.json({ title, isDirectory: true }, { status: 201 });
      }

      if (!url.trim() && !media) {
        return Response.json(
          { error: "A URL or media file is required" },
          { status: 400 },
        );
      }
      if (url.trim() && !isSupportedPostUrl(url.trim())) {
        return Response.json(
          { error: "Supported URL types are HTTP(S) websites and YouTube URLs." },
          { status: 415 },
        );
      }

      const saved = await db.saveDocument(title, username, content, url, media);
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
