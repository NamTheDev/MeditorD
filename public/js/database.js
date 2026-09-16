async function request(path, options = {}) {
  const headers = options.body instanceof FormData
    ? {}
    : { "Content-Type": "application/json" };
  const response = await fetch(`/api${path}`, {
    headers,
    ...options,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return body;
}

async function listDocuments() {
  return request("/documents");
}

async function getDocument(title) {
  return request(`/documents/${encodeURIComponent(title)}`);
}

async function saveDocument(title, username, content, url, media) {
  const form = new FormData();
  form.set("title", title);
  form.set("username", username);
  form.set("content", content);
  form.set("url", url);
  if (media) form.set("media", media);

  return request("/documents", {
    method: "POST",
    body: form,
  });
}

async function deleteDocument(title) {
  return request(`/documents/${encodeURIComponent(title)}`, {
    method: "DELETE",
  });
}

window.database = {
  listDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
};
