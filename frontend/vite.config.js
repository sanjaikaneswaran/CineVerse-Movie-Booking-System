import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost",
        changeOrigin: true,

        rewrite: (path) => {
          const [pathname, queryString] = path.split("?");

          const route = pathname.replace(/^\/api\/?/, "");

          return (
            `/cine/backend/api/index.php?route=${encodeURIComponent(route)}` +
            (queryString ? `&${queryString}` : "")
          );
        },
      },
    },
  },
});