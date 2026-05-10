import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
      },
      includeAssets: ["favicon.svg", "pwa-192.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        id: "compracerta-zero",
        name: "CompraCerta Zero",
        short_name: "CompraCerta",
        description: "Lista de compras colaborativa gratuita",
        lang: "pt-BR",
        theme_color: "#22c55e",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
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
