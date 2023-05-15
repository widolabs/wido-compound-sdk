import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: "./src/wido.ts",
      name: "wido",
      fileName: (format) => (format === "es" ? "wido.mjs" : "wido.js"),
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
