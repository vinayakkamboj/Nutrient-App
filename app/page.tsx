"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewerInstance, setViewerInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial document
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;

    const viewer = (window as any).NutrientViewer;
    if (!viewer) {
      console.warn("NutrientViewer is not available yet.");
      return;
    }

    viewer
      .load({
        container,
        document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
      })
      .then((instance: any) => {
        console.log("Nutrient loaded successfully");
        setViewerInstance(instance);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Failed to load document:", err);
        setError("Failed to load initial document");
      });

    return () => {
      if ((window as any).NutrientViewer && container) {
        (window as any).NutrientViewer.unload(container);
      }
    };
  }, []);

  const HEADER_HEIGHT = 56;

  return (
    <main
      className="flex min-h-screen flex-col text-foreground"
      style={{ backgroundColor: "#1a1414" }}
    >
      <header
        className="flex items-center justify-between border-b px-4"
        style={{ 
          height: HEADER_HEIGHT, 
          backgroundColor: "#1a1414",
          borderColor: "#3a3434"
        }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Nutrient Logo"
            width={48}
            height={48}
            className="object-contain"
          />
          <span className={`${spaceGrotesk.className} text-2xl tracking-tight`}>
            Nutrient
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Demo Viewer</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm">
          {error}
        </div>
      )}

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