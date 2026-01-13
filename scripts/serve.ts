import { existsSync, watch } from "node:fs";
import { join } from "node:path";

import { buildOnce, OUTDIR } from "./shared";

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

      return new Response(Bun.file(join(OUTDIR, "index.html")));
    },
  });

  console.log(`Listening on http://localhost:${server.port}`);
}

function startWatcher(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, 50);
  };

  const watcher = watch("src", { recursive: true }, () => {
    schedule();
  });

  return () => {
    watcher.close();
  };
}

async function run() {
  let isBuilding = false;
  let needsRebuild = false;
  const runBuild = async () => {
    if (isBuilding) {
      needsRebuild = true;
      return;
    }
    isBuilding = true;
    const ok = await buildOnce({
      minify: false,
      sourcemap: "inline",
      exitOnError: false,
    });
    if (ok) {
      console.log("Rebuilt");
    }
    isBuilding = false;
    if (needsRebuild) {
      needsRebuild = false;
      void runBuild();
    }
  };

  await runBuild();
  startWatcher(() => {
    void runBuild();
  });
  serve();
}

await run();
