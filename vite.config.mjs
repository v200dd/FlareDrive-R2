import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const staticAssets = [
  ["404.html", "404.html"],
  ["robots.txt", "robots.txt"],
  ["favicon.ico", "favicon.ico"],
  ["assets/homescreen.png", "assets/homescreen.png"],
  ["assets/manifest.json", "assets/manifest.json"],
];

function copyStaticAssets() {
  const copy = async () => {
    const output = resolve(root, "dist");
    await Promise.all(staticAssets.map(async ([source, destination]) => {
      const targetPath = resolve(output, destination);
      await mkdir(resolve(targetPath, ".."), { recursive: true });
      await cp(resolve(root, source), targetPath);
    }));
  };

  return {
    name: "copy-static-assets",
    apply: "build",
    async writeBundle() {
      await copy();
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyStaticAssets()],
  publicDir: false,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8788",
      "/raw": "http://localhost:8788",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "index.html"),
    },
  },
});
