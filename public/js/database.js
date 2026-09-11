async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
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

async function saveDocument(title, content) {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify({ title, content }),
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
