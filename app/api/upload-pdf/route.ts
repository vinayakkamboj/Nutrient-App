import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Inline baseURL to avoid import issues
const baseURL = process.env.NODE_ENV === "development"
  ? "http://localhost:3000"
  : `https://${process.env.VERCEL_URL || "localhost:3000"}`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ALWAYS return JSON, even on catastrophic failure
  try {
    console.log("[Upload API] START");
    console.log("[Upload API] Headers:", Object.fromEntries(request.headers));

    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error("[Upload API] FormData parse failed:", e);
      return NextResponse.json(
        { success: false, error: "Failed to parse form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      console.log("[Upload API] No file");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    console.log(`[Upload API] File: ${file.name} (${file.size} bytes)`);

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.log("[Upload API] Invalid type:", file.type);
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Always ensure uploads directory exists - create if not present
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    console.log(`[Upload API] Uploads dir: ${uploadsDir}`);

    try {
      // Always try to create directory (recursive: true won't error if exists)
      await mkdir(uploadsDir, { recursive: true });
      console.log("[Upload API] Uploads directory ensured");

      // Verify directory exists and is writable
      if (!existsSync(uploadsDir)) {
        throw new Error("Directory creation failed - directory does not exist after creation");
      }
    } catch (e) {
      console.error("[Upload API] Failed to create/verify directory:", e);
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json(
        { success: false, error: `Failed to create upload directory: ${errorMsg}` },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(file.name);
    const fileName = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    try {
      console.log(`[Upload API] Writing file to: ${filePath}`);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Verify file was written
      if (!existsSync(filePath)) {
        throw new Error("File write failed - file does not exist after write");
      }

      console.log(`[Upload API] File written successfully: ${fileName}`);
    } catch (e) {
      console.error("[Upload API] Failed to write file:", e);
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json(
        { success: false, error: `Failed to save file: ${errorMsg}` },
        { status: 500 }
      );
    }

    const fileUrl = `${baseURL}/uploads/${fileName}`;
    console.log(`[Upload API] Success: ${fileUrl}`);

    return NextResponse.json(
      {
        success: true,
        url: fileUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );

  } catch (error) {
    // CATASTROPHIC ERROR - still return JSON
    console.error("[Upload API] CATASTROPHIC ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

export const runtime = 'nodejs';
export const maxDuration = 60;
