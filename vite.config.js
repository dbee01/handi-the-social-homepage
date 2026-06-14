import { defineConfig } from "vite";

const API_PORT = process.env.PORT || 8080;

export default defineConfig({
  server: {
    proxy: {
      "/api": `http://localhost:${API_PORT}`,
    },
  },
});
