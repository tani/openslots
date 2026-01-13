import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      ink: "#11120f",
      paper: "#f5f1ea",
      moss: "#2b5f3f",
      sand: "#d7c9a8",
    },
  },
});
