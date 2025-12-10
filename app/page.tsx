"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";

// Load Space Grotesk font from Google Fonts
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600"], // semibold weight similar to Monument Grotesk
  display: "swap",
});

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof window === "undefined") return;

    const viewer = (window as any).NutrientViewer;

    if (!viewer) {
      console.warn("NutrientViewer is not available on window yet.");
      return;
    }

    viewer.load({
      container,
      document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
      // add more config here later if needed
    });

    return () => {
      if ((window as any).NutrientViewer && container) {
        (window as any).NutrientViewer.unload(container);
      }
    };
  }, []);

  // Header height in pixels (for the calc() below)
  const HEADER_HEIGHT = 56;

  return (
    <main className="flex min-h-screen flex-col text-foreground" style={{ backgroundColor: "#1a1414" }}>
      <header
        className="flex items-center justify-between border-b px-4"
        style={{ height: HEADER_HEIGHT, backgroundColor: "#1a1414" }}
      >
        <div className="flex items-center gap-3">
          {/* Logo - increased from 32x32 to 48x48 */}
          <Image
            src="/logo.png"
            alt="Nutrient Logo"
            width={48}
            height={48}
            className="object-contain"
          />
          {/* Space Grotesk font applied */}
          <span 
            className={`${spaceGrotesk.className} text-2xl tracking-tight`}
          >
            Nutrient
          </span>
        </div>
      </header>

      {/* The viewer container MUST have width and height */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      />
    </main>
  );
}