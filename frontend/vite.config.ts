import { defineConfig, Plugin, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Explicitly load .env file - ensures environment variables are loaded correctly
  loadEnv(mode, process.cwd(), 'VITE_');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      outDir: "dist/spa",
    },
    plugins: [react(), expressPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
  };
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only applies in development
    configureServer(server) {
      const app = createServer();
      
      // Wrap Express to ensure next() is called for unmatched routes
      server.middlewares.use((req, res, next) => {
        // Track if Express handled the request
        let handled = false;
        const originalEnd = res.end;
        
        res.end = function(...args: any[]) {
          handled = true;
          return originalEnd.apply(this, args);
        };
        
        // Call Express app
        app(req, res, () => {
          // If Express didn't handle it, pass to Vite for SPA routing
          if (!handled && !res.headersSent) {
            next();
          }
        });
      });
    },
  };
}
