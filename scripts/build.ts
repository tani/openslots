// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { ENTRY, OUTDIR, sassPlugin } from "./shared";

const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUTDIR,
  minify: true,
  splitting: true,
  sourcemap: "none",
  plugins: [sassPlugin],
  publicPath: "/",
});

if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}
