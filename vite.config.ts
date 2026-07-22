import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

function localDbPlugin() {
  return {
    name: "local-db-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        
        if (url === "/api/db/offers") {
          const filePath = path.resolve("src/lib/offers_data.json");
          if (req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.end(fs.readFileSync(filePath, "utf8"));
            return;
          }
          if (req.method === "POST") {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
            }
            fs.writeFileSync(filePath, body, "utf8");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }
        
        if (url === "/api/db/applications") {
          const filePath = path.resolve("src/lib/applications_data.json");
          if (req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.end(fs.readFileSync(filePath, "utf8"));
            return;
          }
          if (req.method === "POST") {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
            }
            fs.writeFileSync(filePath, body, "utf8");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }
        
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    localDbPlugin(),
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
  },
});
