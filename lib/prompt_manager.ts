/**
 * prompt_manager.ts
 *
 * Creates enhanced prompts that force the model to return complete, runnable HTML documents
 * with Nutrient Web SDK viewer code.
 */

export interface PromptManagerInput {
  user_prompt: string;
}

export interface PromptManagerOutput {
  user_prompt: string;
  enhanced_prompt: string;
}

/**
 * BASE VIEWER TEMPLATE
 * The model MUST use this as a starting point and customize based on user request
 */
const BASE_VIEWER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nutrient Viewer</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .app { height: 100%; display: flex; flex-direction: column; background: #1a1414; color: #fff; }
    .header { padding: 10px 12px; border-bottom: 1px solid #3a3434; display: flex; align-items: center; justify-content: space-between; background: #2a2424; }
    .header strong { font-size: 16px; }
    .toolbar { padding: 8px 12px; border-bottom: 1px solid #3a3434; display: flex; gap: 8px; flex-wrap: wrap; background: #2a2424; }
    .main { flex: 1; min-height: 0; position: relative; }
    #viewer { height: 100%; width: 100%; }
    .badge { font-size: 12px; padding: 4px 8px; border: 1px solid #3a3434; border-radius: 999px; background: #1a1414; }
    .empty { padding: 24px; text-align: center; color: #888; }
    .status { font-size: 12px; color: #3b82f6; }
  </style>
</head>
<body>
  <div class="app">
    <div class="header">
      <strong>Nutrient Viewer</strong>
      <span class="status" id="status">ready</span>
    </div>
    <div class="toolbar" id="toolbar">
      <span class="badge">Default Toolbar</span>
    </div>
    <div class="main">
      <div id="viewer">
        <div class="empty">Viewer ready. No document loaded.</div>
      </div>
    </div>
  </div>

  <script type="module">
    window.__NUTRIENT_INPUT__ = window.__NUTRIENT_INPUT__ || {};
    const status = document.getElementById("status");
    const toolbar = document.getElementById("toolbar");
    const viewerDiv = document.getElementById("viewer");

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    function renderToolbarInfo(removeList) {
      if (!toolbar) return;
      toolbar.innerHTML = "";
      const pill = document.createElement("span");
      pill.className = "badge";
      pill.textContent = "toolbarRemove: " + (removeList && removeList.length ? removeList.join(", ") : "(none)");
      toolbar.appendChild(pill);
    }

    async function init() {
      try {
        setStatus("initializing");
        const input = window.__NUTRIENT_INPUT__ || {};
        renderToolbarInfo(input.toolbarRemove || []);

        // TODO: Load Nutrient Web SDK if available
        // If input.documentUrl or input.documentBase64 is provided, load it
        // Example:
        // const instance = await PSPDFKit.load({
        //   container: viewerDiv,
        //   document: input.documentUrl || input.documentBase64,
        // });
        //
        // if (input.toolbarRemove && input.toolbarRemove.length > 0) {
        //   const items = instance.toolbarItems;
        //   instance.setToolbarItems(items.filter(item => !input.toolbarRemove.includes(item.type)));
        // }

        setStatus("ready");
      } catch (e) {
        setStatus("error");
        if (viewerDiv) {
          viewerDiv.innerHTML = '<div class="empty">Error: ' + (e && e.message ? e.message : String(e)) + "</div>";
        }
      }
    }
    init();
  </script>
</body>
</html>`;

/**
 * NUTRIENT TOOLBAR REMOVAL EXAMPLES
 */
const TOOLBAR_EXAMPLES = `
NUTRIENT TOOLBAR CUSTOMIZATION (Authoritative API Pattern):

To remove toolbar items:
  const items = instance.toolbarItems;
  instance.setToolbarItems(items.filter(item => item.type !== "ink"));

To remove multiple items:
  const items = instance.toolbarItems;
  const removeTypes = ["ink", "highlighter", "text"];
  instance.setToolbarItems(items.filter(item => !removeTypes.includes(item.type)));

Common toolbar item types:
- "sidebar-thumbnails", "export-pdf", "search", "print"
- "signature", "zoom-in", "zoom-out", "zoom-mode"
- "ink", "highlighter", "text-highlighter", "note", "text"
- "line", "arrow", "rectangle", "ellipse", "polygon"
- "pager", "pan", "annotate", "document-editor", "document-crop"

CRITICAL: Use ONLY this pattern. Do NOT invent custom APIs.
`;

/**
 * NO-HALLUCINATION RULES
 */
const NO_HALLUCINATION_RULES = `
STRICT NO-HALLUCINATION RULE:
- Use ONLY the documented Nutrient Web SDK APIs shown above
- If uncertain about an API, keep the default behavior and add a comment: // TODO: Verify API
- Do NOT invent methods like instance.removeToolbarItem() or instance.hideButton()
- Do NOT invent events or properties not in the reference
- When in doubt, leave a clear TODO comment for manual implementation
`;

/**
 * prompt_manager
 *
 * Creates enhanced prompt that forces model to return complete HTML document
 */
export function prompt_manager(input: PromptManagerInput): PromptManagerOutput {
  const { user_prompt } = input;

  const enhanced_prompt = `
You are an expert code generator for Nutrient Web SDK (formerly PSPDFKit).

YOUR TASK:
Analyze this user request and generate a COMPLETE HTML DOCUMENT that implements it.

USER REQUEST:
"""
${user_prompt}
"""

CRITICAL OUTPUT REQUIREMENTS:
1. Return a COMPLETE HTML document starting with <!DOCTYPE html>
2. NO markdown fences (no \`\`\`html)
3. NO explanations or commentary
4. Code-only output
5. The HTML must be immediately runnable in a sandboxed iframe

MANDATORY STRUCTURE:
Start with the BASE VIEWER TEMPLATE below and customize it based on the user request.

${BASE_VIEWER_TEMPLATE}

CUSTOMIZATION INSTRUCTIONS:

If the user asks to "remove toolbar items" or "hide tools":
${TOOLBAR_EXAMPLES}

If the user asks to "load a document":
- Accept documentUrl or documentBase64 via window.__NUTRIENT_INPUT__
- Use PSPDFKit.load() if SDK is available
- Show empty state if no document provided

If the user asks for "custom layout" or "styling":
- Modify the CSS in <style> section
- Keep the core structure (header, toolbar, viewer container)

${NO_HALLUCINATION_RULES}

OUTPUT FORMAT:
Return ONLY the complete HTML document. No text before or after. No markdown fences.
The output must be valid HTML that can be set as iframe.srcdoc.

BEGIN YOUR RESPONSE WITH: <!DOCTYPE html>
`.trim();

  return {
    user_prompt,
    enhanced_prompt,
  };
}
