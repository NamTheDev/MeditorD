import { readdirSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

// Check classic browser scripts without executing browser APIs in Node.
for (const file of [...readdirSync("public/js").map(name => `public/js/${name}`), "public/sw.js"]) {
  if (!file.endsWith(".js")) continue;
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  assert.equal(result.status, 0, `Invalid JavaScript: ${file}`);
}
for (const name of readdirSync("public").filter(name => name.endsWith(".html"))) {
  const html = readFileSync(`public/${name}`, "utf8");
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"?]+)(?:\?[^\"]*)?"/g)) {
    assert.ok(existsSync(`public${asset}`), `${name} references missing asset ${asset}`);
  }
  if (["archive.html", "database.html", "edit.html"].includes(name)) {
    assert.ok(html.indexOf('/js/path-utils.js') >= 0, `${name} needs path helpers`);
    assert.ok(html.indexOf('/js/path-utils.js') < html.indexOf(`/js/${name.replace('.html', '.js')}`), `${name} loads helpers too late`);
  }
}
console.log("Frontend syntax, local asset references, and helper load order passed.");
