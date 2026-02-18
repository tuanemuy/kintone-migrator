import { resolve } from "node:path";
import { defineConfig } from "vite";

// NOTE: The "vite" package is aliased to "rolldown-vite" in package.json
// (`"vite": "npm:rolldown-vite@^7.3.1"`). rolldown-vite is an experimental
// Rust-based Vite replacement. This alias allows vitest and other vite-based
// tooling to transparently use rolldown-vite without code changes.
// See: https://github.com/nicolo-ribaudo/vite-rolldown-compat

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.direnv/**"],
    reporters: ["tree"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
});
