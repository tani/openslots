import { buildOnce } from "./shared";

await buildOnce({ minify: true, sourcemap: "none", exitOnError: true });
