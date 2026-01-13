import { existsSync } from "node:fs";
import { join } from "node:path";

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

  // Copy Bootswatch Brite theme
  const bootswatchCss = await Bun.file(
    "node_modules/bootswatch/dist/brite/bootstrap.min.css"
  ).text();

  // Add custom CSS for the app
  const customCss = `
    /* Custom styles for When2Nostr */
    :root {
      --ink: #11120f;
      --paper: #f5f1ea;
      --moss: #2b5f3f;
      --sand: #d7c9a8;
    }

    .slot-button {
      width: 100%;
      height: 1.5rem;
      border: 1px solid rgba(17, 18, 15, 0.1);
      cursor: pointer;
      transition: all 0.2s;
    }

    .slot-button:hover {
      border-color: rgba(17, 18, 15, 0.3);
    }
  `;

  await Bun.write(join(OUTDIR, "index.html"), html);
  await Bun.write(join(OUTDIR, "index.css"), bootswatchCss + customCss);
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
