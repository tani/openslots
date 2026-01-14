import { join } from "node:path";

export const OUTDIR = "dist";
export const ENTRY = "src/index.tsx";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenSlots: A Trustless, Privacy-Preserving Scheduling Protocol over Nostr</title>
    <link rel="stylesheet" href="/index.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>
`;

async function writeStaticAssets() {
  const bootswatchCss = await Bun.file(
    "node_modules/bootswatch/dist/brite/bootstrap.min.css",
  ).text();

  const customCss = `
    /* Custom styles for OpenSlots */
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

export async function buildOnce({
  minify,
  sourcemap,
  exitOnError,
}: {
  minify: boolean;
  sourcemap: Bun.BuildConfig["sourcemap"];
  exitOnError: boolean;
}): Promise<boolean> {
  await writeStaticAssets();

  const result = await Bun.build({
    entrypoints: [ENTRY],
    outdir: OUTDIR,
    target: "browser",
    splitting: false,
    minify,
    sourcemap,
  });

  if (!result.success) {
    for (const message of result.logs) {
      console.error(message);
    }
    if (exitOnError) {
      process.exit(1);
    }
    return false;
  }

  return true;
}
