import { existsSync } from "node:fs";
import { join } from "node:path";
import { createGenerator } from "unocss";
import unoConfig from "./uno.config";

const OUTDIR = "dist";
const ENTRY = "src/index.tsx";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>When2Nostr</title>
    <link rel="stylesheet" href="/index.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>
`;

async function build() {
  const uno = createGenerator(unoConfig);
  const sources: string[] = [];
  for (const path of new Bun.Glob("src/**/*.{ts,tsx}").scanSync(".")) {
    sources.push(await Bun.file(path).text());
  }
  const { css } = await uno.generate(sources.join("\n"), { minify: true });

  const result = await Bun.build({
    entrypoints: [ENTRY],
    outdir: OUTDIR,
    target: "browser",
    splitting: false,
    minify: true,
  });

  if (!result.success) {
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  await Bun.write(join(OUTDIR, "index.html"), html);
  await Bun.write(join(OUTDIR, "index.css"), css);
}

function serve() {
  const server = Bun.serve({
    port: Number(Bun.env.PORT) || 3000,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const filePath = join(OUTDIR, path);

      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }

      // SPA fallback
      return new Response(Bun.file(join(OUTDIR, "index.html")));
    },
  });

  console.log(`Listening on http://localhost:${server.port}`);
}

await build();
serve();
