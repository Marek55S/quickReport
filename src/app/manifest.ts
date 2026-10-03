import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuickReport – zgłoś problem w mieście",
    short_name: "QuickReport",
    description: "Zrób zdjęcie usterki, a AI przygotuje oficjalne zgłoszenie do urzędu.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0064a7",
    lang: "pl",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
