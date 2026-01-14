// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import * as sass from "sass";

export default {
  name: "Scss",
  setup(build: Bun.PluginBuilder) {
    build.onLoad({ filter: /\.scss$/, namespace: "file" }, async (args) => {
      let res: sass.CompileResult;
      try {
        res = await sass.compileAsync(args.path, {
          loadPaths: ["src", "node_modules"],
          quietDeps: true,
          silenceDeprecations: ["import"],
        });
      } catch (error) {
        res = { css: `${error}` } as sass.CompileResult;
      }

      return {
        contents: res.css,
        loader: "css",
      };
    });
  },
};
