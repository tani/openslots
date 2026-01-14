// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { join } from "node:path";
import { ENTRY, OUTDIR, sassPlugin } from "./shared";

const PORT = Number(process.env.PORT ?? 3000);

const buildPromise = Bun.build({
  entrypoints: [ENTRY],
  outdir: OUTDIR,
  minify: false,
  splitting: true,
  sourcemap: "linked",
  plugins: [sassPlugin],
  publicPath: "/",
});

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    await buildPromise;
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(join(OUTDIR, pathname));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response(Bun.file(join(OUTDIR, "index.html")));
  },
});

console.log(`→ http://localhost:${server.port}/`);
