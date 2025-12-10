"use client";

import { useEffect, useRef } from "react";

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
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header
        className="flex items-center justify-between border-b px-4"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Nutrient App</span>
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