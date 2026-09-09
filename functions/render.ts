import { ROOT } from "../config";
import { join } from "path";

async function renderPage(
  file: string,
  title: string,
  status = 200,
): Promise<Response> {
  const [layout, content] = await Promise.all([
    Bun.file(join(process.cwd(), ROOT, "global.html")).text(),
    Bun.file(join(process.cwd(), ROOT, `${file}.html`)).text(),
  ]);

  const html = layout
    .replaceAll("{{title}}", () => title)
    .replace("{{body}}", () => content);

  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export { renderPage };
