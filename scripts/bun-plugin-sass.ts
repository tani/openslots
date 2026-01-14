// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import type { BunPlugin } from "bun";
import { compile } from "sass";

const scssPlugin: BunPlugin = {
  name: "scss-loader",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, async (args) => {
      const result = compile(args.path, {
        loadPaths: ["node_modules"],
        quietDeps: true,
        silenceDeprecations: ["import"],
      });
      return {
        contents: result.css,
        loader: "css",
      };
    });
  },
};

export default scssPlugin;
