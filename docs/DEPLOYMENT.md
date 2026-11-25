# Deployment and security

A direct Bun run binds to `127.0.0.1:3000` by default, so the editor is reachable only from this computer. Set `HOST` explicitly if another interface is required.

The Docker image listens on `0.0.0.0` **inside the container** so Docker port forwarding works. Keep the host-side published port local:

```bash
docker run --rm -p 127.0.0.1:3000:3000 -v meditord-data:/app/database meditord
```

Avoid `-p 3000:3000` on untrusted networks because it may expose the document API. MeditorD does not currently authenticate API requests; use an authenticated reverse proxy or other access controls before sharing it.
