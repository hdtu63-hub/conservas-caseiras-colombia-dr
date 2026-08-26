import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const html = await readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

test("renderiza la página de ventas completa en español LATAM", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Conservas Caseras/);
  assert.match(html, /100\+ Recetas Rentables/);
  assert.match(html, /Preguntas/);
  assert.doesNotMatch(html, /R\$|pt-BR/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
  assert.match(html, /fbq\('init',\s*'1832021307783603'\)/);
  assert.match(html, /cdn\.utmify\.com\.br\/scripts\/utms\/latest\.js/);
});
