// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { join } from "node:path";

export const OUTDIR = "dist";
export const ENTRY = "src/index.tsx";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenSlots: A Trustless, Privacy-Preserving Scheduling Protocol over Nostr</title>
    <meta
      name="description"
      content="Secure scheduling without accounts. Client-side encryption with blinded relay storage over Nostr."
    />
    <meta property="og:type" content="website" />
    <meta
      property="og:title"
      content="OpenSlots: A Trustless, Privacy-Preserving Scheduling Protocol over Nostr"
    />
    <meta
      property="og:description"
      content="Secure scheduling without accounts. Client-side encryption with blinded relay storage over Nostr."
    />
    <meta property="og:image" content="/favicon.png" />
    <meta name="twitter:card" content="summary" />
    <meta
      name="twitter:title"
      content="OpenSlots: A Trustless, Privacy-Preserving Scheduling Protocol over Nostr"
    />
    <meta
      name="twitter:description"
      content="Secure scheduling without accounts. Client-side encryption with blinded relay storage over Nostr."
    />
    <meta name="twitter:image" content="/favicon.png" />
    <link rel="icon" type="image/png" sizes="256x256" href="/favicon.png" />
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

  await Bun.write(join(OUTDIR, "index.html"), html);
  await Bun.write(join(OUTDIR, "index.css"), bootswatchCss);
  await Bun.write(join(OUTDIR, "favicon.png"), Bun.file("assets/favicon.png"));
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
