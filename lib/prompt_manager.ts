/**
 * prompt_manager.ts
 *
 * Responsible for:
 * 1. Receiving raw user_prompt verbatim
 * 2. Creating enhanced_prompt with guardrails and Nutrient baseline
 * 3. Returning both prompts for orchestration
 */

export interface PromptManagerInput {
  user_prompt: string;
}

export interface PromptManagerOutput {
  user_prompt: string;
  enhanced_prompt: string;
}

/**
 * Nutrient Viewer baseline template that MUST be included in all responses
 */
const NUTRIENT_BASELINE_TEMPLATE = `
<div id="app" style="height: 100vh; width: 100vw;"></div>

<script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.9.1/nutrient-viewer.js"></script>

<script type="module">
  const container = document.getElementById("app");
  const { NutrientViewer } = window;

  NutrientViewer.unload(container);

  NutrientViewer.load({
    container,
    document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
  }).then(() => {
    console.log("Nutrient loaded");
  });
</script>
`;

/**
 * prompt_manager
 *
 * Takes the raw user prompt and creates an enhanced version with:
 * - Guardrails (security, safety)
 * - Code-only output enforcement
 * - TypeScript enforcement
 * - Mandatory Nutrient viewer baseline template
 */
export function prompt_manager(input: PromptManagerInput): PromptManagerOutput {
  const { user_prompt } = input;

  // Store the original prompt verbatim
  const original = user_prompt;

  // Create enhanced prompt with guardrails
  const enhanced_prompt = `
You are a code generator for the Nutrient Web SDK (formerly PSPDFKit).

CRITICAL RULES:
1. Output ONLY valid TypeScript code
2. NO explanations, NO markdown, NO comments outside code
3. ALWAYS include the Nutrient Viewer baseline template
4. Use only documented Nutrient Web SDK APIs
5. Code must be safe and non-destructive

USER REQUEST:
${original}

MANDATORY BASELINE (must be included):
${NUTRIENT_BASELINE_TEMPLATE}

INSTRUCTIONS:
- If the user asks for "hello world", return TypeScript code that logs "Hello World" and includes the baseline
- If the user asks for viewer features, generate code using Nutrient SDK APIs
- Always wrap code in proper HTML structure
- Ensure the viewer container has explicit size before calling NutrientViewer.load()

OUTPUT FORMAT:
Return complete, runnable TypeScript code with the Nutrient baseline template.
`.trim();

  return {
    user_prompt: original,
    enhanced_prompt,
  };
}
