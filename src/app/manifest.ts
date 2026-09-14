import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money",
    short_name: "Money",
    description: "Personal money tracker: income, spending, budgets and a monthly review.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#1f3a63",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
