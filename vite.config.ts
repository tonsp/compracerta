import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "CompraCerta Zero",
        short_name: "CompraCerta",
        description: "Lista de compras colaborativa gratuita",
        theme_color: "#22c55e",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
