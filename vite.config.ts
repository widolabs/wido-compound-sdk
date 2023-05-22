import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: "./src/index.ts",
      name: "wido-compound-sdk",
      fileName: (format) => (format === "es" ? "wido.mjs" : "wido.js"),
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
