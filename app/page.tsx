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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const container = containerRef.current;
    const viewer = (window as any).NutrientViewer;

    if (!viewer || !container) {
      setError("Viewer not ready. Please wait and try again.");
      event.target.value = "";
      return;
    }

    setError(null);

    try {
      const fileUrl = URL.createObjectURL(file);

      // Safely unload previous document
      await viewer.unload(container);

      // Load new document
      const instance = await viewer.load({
        container: container,
        document: fileUrl,
      });

      console.log("Document loaded successfully");
      setViewerInstance(instance);
      URL.revokeObjectURL(fileUrl);
    } catch (err: any) {
      console.error("Failed to load uploaded document:", err);
      setError("Failed to load document. Please try again.");
    }

    event.target.value = "";
  };

  const HEADER_HEIGHT = 56;

  return (
    <main
      className="flex min-h-screen flex-col text-foreground"
      style={{ backgroundColor: "#1a1414" }}
    >
      <header
        className="flex items-center justify-between border-b px-4"
        style={{ height: HEADER_HEIGHT, backgroundColor: "#1a1414" }}
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.tiff"
            style={{ display: "none" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload PDF
          </button>
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