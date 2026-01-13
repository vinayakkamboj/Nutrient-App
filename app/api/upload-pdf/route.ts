import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { baseURL } from "@/baseUrl";

export async function POST(request: NextRequest) {
  console.log("[Upload API] Received upload request");

  try {
    console.log("[Upload API] Parsing form data...");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    console.log("[Upload API] File received:", file ? `${file.name} (${file.size} bytes, ${file.type})` : "null");

    if (!file) {
      console.log("[Upload API] No file provided");
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
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
      console.log("[Upload API] Invalid file type:", file.type);
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Only PDF, Office docs, and images allowed.` },
        { status: 400 }
      );
    }

    console.log("[Upload API] File type valid, proceeding with upload...");

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      console.log("[Upload API] Creating uploads directory:", uploadsDir);
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(file.name);
    const fileName = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    console.log("[Upload API] Saving file to:", filePath);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const fileUrl = `${baseURL}/uploads/${fileName}`;

    console.log("[Upload API] File uploaded successfully:", fileUrl);
    console.log("[Upload API] Returning success response");

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error("[Upload API] ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// App Router config for file uploads (10MB max)
export const runtime = 'nodejs';
export const maxDuration = 60;
