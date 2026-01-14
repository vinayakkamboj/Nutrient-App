import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prompt_manager } from "./prompt_manager";

export interface PromptOrchestratorInput {
  user_prompt: string;
  pdf_url?: string;
}

export interface PromptOrchestratorOutput {
  user_prompt: string;
  enhanced_prompt: string;
  provider: "anthropic" | "openai";
  model_requested: string;
  model_used: string;
  response_text: string;
  response_html: string;
  errors: string[];
  available_models?: string[];
  warnings?: string[];
}

async function getAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(`Models API returned ${response.status}`);
    }

    const data = await response.json();
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id).filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch Anthropic models:", error);
    return [];
  }
}

// Extract date suffix (YYYYMMDD) from model name, return as number for comparison
function extractModelDate(modelName: string): number {
  const match = modelName.match(/(\d{8})$/);
  return match ? parseInt(match[1], 10) : 0;
}

function selectBestModel(models: string[]): string | null {
  if (models.length === 0) return null;

  // Prefer Sonnet models, choosing newest by date
  const sonnets = models.filter(m => m.toLowerCase().includes("sonnet"));
  if (sonnets.length > 0) {
    return sonnets.reduce((best, current) => {
      const bestDate = extractModelDate(best);
      const currentDate = extractModelDate(current);
      return currentDate > bestDate ? current : best;
    });
  }

  // If no Sonnet, prefer Opus models, choosing newest by date
  const opuses = models.filter(m => m.toLowerCase().includes("opus"));
  if (opuses.length > 0) {
    return opuses.reduce((best, current) => {
      const bestDate = extractModelDate(best);
      const currentDate = extractModelDate(current);
      return currentDate > bestDate ? current : best;
    });
  }

  // Otherwise fall back to first entry
  return models[0];
}

export async function PromptOrchestrator(
  input: PromptOrchestratorInput
): Promise<PromptOrchestratorOutput> {
  const { user_prompt, pdf_url } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const provider = (process.env.LLM_PROVIDER?.toLowerCase() === "openai" ? "openai" : "anthropic") as "anthropic" | "openai";

  try {
    const { enhanced_prompt } = prompt_manager({ user_prompt, pdf_url });
    let response_text = "";
    let response_html = "";
    let modelRequested = "";
    let modelUsed = "";
    let availableModels: string[] = [];

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        errors.push("ANTHROPIC_API_KEY not found in environment variables");
        return buildErrorResponse(user_prompt, enhanced_prompt, provider, "", "", errors, [], warnings);
      }

      const anthropic = new Anthropic({
        apiKey,
        timeout: 120000, // 120 second (2 minute) timeout
        maxRetries: 3, // Retry up to 3 times on network errors
      });
      modelRequested = process.env.LLM_MODEL || "claude-sonnet-4-5-20250929";
      modelUsed = modelRequested;

      try {
        const completion = await anthropic.messages.create({
          model: modelRequested,
          max_tokens: 8192, // Increased for complex outputs
          temperature: 0.3,
          messages: [{ role: "user", content: enhanced_prompt }],
        });

        const content = completion.content[0];
        if (content.type === "text") {
          response_text = content.text;
          response_html = extractAndValidateHTML(content.text);
        } else {
          errors.push("Unexpected response format from Claude");
          response_text = "Error: Unexpected response format";
          response_html = createErrorHTML("Unexpected response format", provider, modelRequested, modelUsed, [], "");
        }
      } catch (firstError: any) {
        // Check for timeout errors
        const isTimeout = firstError?.message?.toLowerCase()?.includes("timeout") ||
                         firstError?.code === "ETIMEDOUT" ||
                         firstError?.name === "TimeoutError";

        if (isTimeout) {
          errors.push("Request timed out. The model took too long to respond.");
          errors.push("This usually means the prompt is complex. Try simplifying your request or try again.");
          response_text = "Error: Request timed out";
          response_html = createErrorHTML(
            "Request timed out. The prompt may be too complex or the API is slow. Please try again with a simpler request.",
            provider,
            modelRequested,
            modelUsed,
            [],
            firstError?.requestID || ""
          );

          return {
            user_prompt,
            enhanced_prompt,
            provider,
            model_requested: modelRequested,
            model_used: modelUsed,
            response_text,
            response_html,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }

        const isModelNotFound = firstError?.status === 404 &&
          (firstError?.error?.type === "not_found_error" || firstError?.message?.includes("model"));
        const requestId = firstError?.requestID || "";

        if (isModelNotFound) {
          availableModels = await getAnthropicModels(apiKey);

          if (availableModels.length > 0) {
            const fallbackModel = selectBestModel(availableModels);
            if (fallbackModel) {
              modelUsed = fallbackModel;

              try {
                const completion = await anthropic.messages.create({
                  model: fallbackModel,
                  max_tokens: 8192, // Increased for complex outputs
                  temperature: 0.3,
                  messages: [{ role: "user", content: enhanced_prompt }],
                });

                const content = completion.content[0];
                if (content.type === "text") {
                  response_text = content.text;
                  response_html = extractAndValidateHTML(content.text);
                  warnings.push(`Model "${modelRequested}" not found; used fallback "${fallbackModel}"`);
                }
              } catch (retryError: any) {
                const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
                const retryRequestId = retryError?.requestID || "";
                errors.push(`Model "${modelRequested}" not found (request_id: ${requestId})`);
                errors.push(`Fallback "${fallbackModel}" failed: ${retryMsg} (request_id: ${retryRequestId})`);
                response_text = `Error: ${retryMsg}`;
                response_html = createErrorHTML(retryMsg, provider, modelRequested, modelUsed, availableModels, retryRequestId);
              }
            } else {
              errors.push(`Model "${modelRequested}" not found (request_id: ${requestId})`);
              errors.push("No suitable fallback model found");
              response_text = "Error: No suitable fallback";
              response_html = createErrorHTML("No suitable fallback", provider, modelRequested, modelUsed, availableModels, requestId);
            }
          } else {
            errors.push(`Model "${modelRequested}" not found (request_id: ${requestId})`);
            errors.push("Failed to fetch available models");
            response_text = `Error: ${firstError.message}`;
            response_html = createErrorHTML(firstError.message, provider, modelRequested, modelUsed, [], requestId);
          }
        } else {
          const errorMsg = firstError instanceof Error ? firstError.message : String(firstError);
          errors.push(`${errorMsg} (request_id: ${requestId})`);
          response_text = `Error: ${errorMsg}`;
          response_html = createErrorHTML(errorMsg, provider, modelRequested, modelUsed, [], requestId);
        }
      }

      return {
        user_prompt,
        enhanced_prompt,
        provider,
        model_requested: modelRequested,
        model_used: modelUsed,
        response_text,
        response_html,
        errors,
        available_models: availableModels.length > 0 ? availableModels.slice(0, 10) : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        errors.push("OPENAI_API_KEY not found in environment variables");
        return buildErrorResponse(user_prompt, enhanced_prompt, provider, "", "", errors, [], warnings);
      }

      const openai = new OpenAI({
        apiKey,
        timeout: 120000, // 120 second (2 minute) timeout
        maxRetries: 3, // Retry up to 3 times on network errors
      });
      modelRequested = process.env.LLM_MODEL || "gpt-4o-mini";
      modelUsed = modelRequested;

      const completion = await openai.chat.completions.create({
        model: modelRequested,
        messages: [
          {
            role: "system",
            content: "You are a code generator for Nutrient Web SDK. Output ONLY a complete HTML document, no markdown fences, no explanations.",
          },
          { role: "user", content: enhanced_prompt },
        ],
        max_tokens: 8192, // Increased for complex outputs
        temperature: 0.3,
      });

      response_text = completion.choices[0]?.message?.content || "";
      response_html = extractAndValidateHTML(response_text);

      return {
        user_prompt,
        enhanced_prompt,
        provider,
        model_requested: modelRequested,
        model_used: modelUsed,
        response_text,
        response_html,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  } catch (error) {
    console.error("PromptOrchestrator error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMsg);
    const { enhanced_prompt } = prompt_manager({ user_prompt, pdf_url });
    return buildErrorResponse(user_prompt, enhanced_prompt, provider, "", "", errors, [], warnings);
  }
}

function extractAndValidateHTML(text: string): string {
  if (!text || text.trim().length === 0) {
    return createErrorHTML("Empty response from model", "anthropic", "", "", [], "");
  }

  let html = text.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  const hasDoctype = html.toLowerCase().includes("<!doctype html");
  const hasHtmlTag = html.toLowerCase().includes("<html");

  if (!hasDoctype && !hasHtmlTag) {
    return wrapInSafeHTML(html);
  }

  return html;
}

function wrapInSafeHTML(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nutrient Viewer</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    .container { height: 100%; padding: 16px; }
  </style>
</head>
<body>
  <div class="container">${content}</div>
</body>
</html>`;
}

function createErrorHTML(
  message: string,
  provider: string,
  modelRequested: string,
  modelUsed: string,
  availableModels: string[],
  requestId: string
): string {
  const modelsHtml = availableModels.length > 0
    ? `<div class="section">
      <h3>Available Models (first 10)</h3>
      <ul class="model-list">
        ${availableModels.slice(0, 10).map(m => `<li><code>${escapeHtml(m)}</code></li>`).join('')}
      </ul>
      <p class="hint"> Set <code>LLM_MODEL</code> in .env to one of these model IDs</p>
    </div>`
    : '<p class="warning">Could not fetch available models from API</p>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LLM Error</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: system-ui, sans-serif; background: #1a1414; color: #fff; }
    .container { max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { color: #ef4444; font-size: 24px; margin-bottom: 8px; }
    h3 { color: #3b82f6; font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
    .section { background: #2a2424; border: 1px solid #3a3434; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .meta { font-size: 14px; color: #888; margin-bottom: 4px; }
    .meta strong { color: #ccc; }
    .error-msg { background: #3a1a1a; border-left: 3px solid #ef4444; padding: 12px; margin: 12px 0; font-family: monospace; font-size: 13px; color: #fca5a5; }
    .model-list { list-style: none; padding: 0; margin: 8px 0; }
    .model-list li { padding: 6px 8px; background: #1a1414; border: 1px solid #3a3434; border-radius: 4px; margin-bottom: 4px; font-family: monospace; font-size: 13px; }
    .hint { background: #1a2a3a; border-left: 3px solid #3b82f6; padding: 12px; margin-top: 12px; font-size: 13px; color: #93c5fd; }
    code { background: #1a1414; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #60a5fa; }
    .warning { color: #fbbf24; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1> LLM Error</h1>
    <div class="section">
      <h3>Configuration</h3>
      <div class="meta"><strong>Provider:</strong> ${escapeHtml(provider)}</div>
      <div class="meta"><strong>Requested Model:</strong> ${escapeHtml(modelRequested || 'N/A')}</div>
      <div class="meta"><strong>Model Used:</strong> ${escapeHtml(modelUsed || 'N/A')}</div>
      ${requestId ? `<div class="meta"><strong>Request ID:</strong> ${escapeHtml(requestId)}</div>` : ''}
    </div>
    <div class="section">
      <h3>Error Message</h3>
      <div class="error-msg">${escapeHtml(message)}</div>
    </div>
    ${modelsHtml}
  </div>
</body>
</html>`;
}

function buildErrorResponse(
  user_prompt: string,
  enhanced_prompt: string,
  provider: "anthropic" | "openai",
  modelRequested: string,
  modelUsed: string,
  errors: string[],
  availableModels: string[],
  warnings: string[]
): PromptOrchestratorOutput {
  return {
    user_prompt,
    enhanced_prompt,
    provider,
    model_requested: modelRequested || "N/A",
    model_used: modelUsed || "N/A",
    response_text: `Error: ${errors.join("; ")}`,
    response_html: createErrorHTML(errors.join("; "), provider, modelRequested, modelUsed, availableModels, ""),
    errors,
    available_models: availableModels.length > 0 ? availableModels.slice(0, 10) : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
