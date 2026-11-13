import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/kSTART/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/kickstart': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true
      }
    }
  },
  build: {
    assetsInclude: [
      "**/*.jpeg",
      "**/*.jpg",
      "**/*.png",
      "**/*.svg",
      "**/*.gif",
    ],
    copyPublicDir: true,
  },
});
