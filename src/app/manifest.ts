import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Markoum — Visualisasi Silsilah & Pembuat Pohon Keluarga",
    short_name: "Markoum",
    description: "Aplikasi studio pohon keluarga interaktif untuk membuat, mengelola, dan memvisualisasikan silsilah keluarga secara modern dan privat.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#862d33",
    icons: [
      {
        src: "/favicon.ico?v=4",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png?v=4",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png?v=4",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
