import { NextRequest, NextResponse } from "next/server";
import { PromptOrchestrator } from "@/lib/PromptOrchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf_url, user_prompt } = body;

    if (!pdf_url) {
      return NextResponse.json(
        { error: "PDF URL is required" },
        { status: 400 }
      );
    }

    const promptToUse = user_prompt || "Open the Nutrient viewer with this PDF";

    console.log(`[Process PDF API] Starting processing for PDF: ${pdf_url}`);
    console.log(`[Process PDF API] User prompt: ${promptToUse}`);

    // Call PromptOrchestrator with the PDF URL
    const result = await PromptOrchestrator({
      user_prompt: promptToUse,
      pdf_url: pdf_url,
    });

    console.log(`[Process PDF API] Processing complete`);

    return NextResponse.json({
      success: true,
      result: {
        user_prompt: result.user_prompt,
        enhanced_prompt: result.enhanced_prompt,
        provider: result.provider,
        model_requested: result.model_requested,
        model_used: result.model_used,
        response_text: result.response_text,
        response_html: result.response_html,
        errors: result.errors,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    console.error("[Process PDF API] Error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
