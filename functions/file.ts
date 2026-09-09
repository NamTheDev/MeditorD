import { join } from "path";
import { ROOT } from "../config";

async function getFile(filename: string): Promise<Bun.BunFile | null> {
  const filePath = join(process.cwd(), ROOT, `${filename}.html`);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return file;
  } else return null;
}

export { getFile };
