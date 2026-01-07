/**
 * prompt_manager.ts
 *
 * Enhanced Prompt Manager for Nutrient Web SDK widget code generation.
 *
 * Design Goals:
 * - CODE-ONLY output (zero prose, zero markdown)
 * - Domain lock: Nutrient Web SDK only
 * - Widget-safe execution (CDN-based, no bundlers in HTML mode)
 * - Deterministic, executable code that loads viewer properly
 */

export interface PromptManagerInput {
  user_prompt: string;
}

export interface PromptManagerOutput {
  user_prompt: string;
  enhanced_prompt: string;
}

/**
 * CODE-ONLY OUTPUT ENFORCEMENT
 */
const CODE_ONLY_RULES = `
========================================================
CRITICAL: CODE-ONLY OUTPUT RULE
========================================================

YOU MUST OUTPUT CODE ONLY. ABSOLUTELY NO PROSE.

FORBIDDEN:
- NO markdown code fences (\`\`\`html, \`\`\`typescript, etc.)
- NO headings (# Heading, ## Subheading)
- NO bullet points or numbered lists
- NO explanations or descriptions
- NO "Here is...", "This code...", or any prose
- NO surrounding text whatsoever

ALLOWED OUTPUT FORMATS:

1) HTML WIDGET (default for most requests):
   - Start immediately with: <!DOCTYPE html>
   - Complete, self-contained HTML document
   - No markdown, no explanations
   - Example:
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <title>Viewer</title>
       <style>
         body { margin: 0; }
         #viewer { width: 100%; height: 100vh; }
       </style>
     </head>
     <body>
       <div id="viewer"></div>
       <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js"></script>
       <script>
         window.addEventListener("DOMContentLoaded", () => {
           const container = document.getElementById("viewer");
           if (window.NutrientViewer && container) {
             window.NutrientViewer.unload(container);
             window.NutrientViewer.load({
               container: container,
               document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
             });
           }
         });
       </script>
     </body>
     </html>

2) NEXT.JS / TYPESCRIPT MULTI-FILE (only if user explicitly requests):
   - Separate files with line comments ONLY
   - Format:
     // FILE: app/layout.tsx
     <code here>
     // FILE: global.d.ts
     <code here>
     // FILE: app/page.tsx
     <code here>
   - Still CODE ONLY (no prose, no markdown)

3) OUT OF SCOPE (if request is not about Nutrient Web SDK):
   - Output ONLY a comment block:
     /*
       OUT_OF_SCOPE: <reason in 5 words or less>
       RELEVANT DOCS (plain text):
       https://www.nutrient.io/sdk/web/getting-started/nextjs/
       https://www.nutrient.io/sdk/web/getting-started/typescript/
       SUGGESTED SEARCH QUERIES:
       - Nutrient Web SDK viewer CDN
       - Nutrient toolbar customization
     */

DEFAULT BEHAVIOR:
- If user asks to "load viewer" or similar: output HTML widget (format 1)
- If user explicitly asks for Next.js/TypeScript: output multi-file (format 2)
- Otherwise: output HTML widget (format 1)
`.trim();

/**
 * DOMAIN LOCK: Nutrient Web SDK ONLY
 */
const DOMAIN_LOCK = `
========================================================
DOMAIN LOCK: NUTRIENT WEB SDK ONLY
========================================================

YOU MUST ONLY GENERATE CODE FOR:
- Nutrient Web SDK (window.NutrientViewer)
- Viewer loading and configuration
- Toolbar manipulation (viewer toolbar, document editor toolbar)
- Annotations
- Document editor toolbar/footer customization

FORBIDDEN:
- Other PDF libraries (pdf.js, PDF-LIB, etc.)
- Hallucinated APIs not in Nutrient Web SDK
- Non-Nutrient functionality

CDN METHOD ONLY:
- Entry point: window.NutrientViewer
- Load: window.NutrientViewer.load({...})
- Unload: window.NutrientViewer.unload(container)
- No npm imports in HTML mode
- No bundlers in HTML widget mode
`.trim();

/**
 * VIEWER LOADING CONTRACT
 */
const VIEWER_CONTRACT = `
========================================================
VIEWER LOADING CONTRACT (CDN)
========================================================

REQUIRED PATTERN:

1) Include CDN script:
   <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js"></script>

2) Container MUST have explicit dimensions:
   <div id="viewer" style="width: 100%; height: 100vh;"></div>

3) Load pattern:
   const container = document.getElementById("viewer");
   if (window.NutrientViewer && container) {
     window.NutrientViewer.unload(container);  // Always unload first
     window.NutrientViewer.load({
       container: container,
       document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
     });
   }

4) Cleanup/reload:
   window.NutrientViewer.unload(container);

CRITICAL:
- ALWAYS call unload before load
- Container MUST have width and height
- Use window.NutrientViewer (global object from CDN)
`.trim();

/**
 * REFERENCE GUIDE (embedded for model grounding, NOT for output)
 */
const REFERENCE_GUIDE = `
========================================================
REFERENCE GUIDE (DO NOT OUTPUT THIS SECTION)
========================================================

NEXT.JS PATTERN:
Layout: Use <Script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js" strategy="beforeInteractive"/>
Types: declare global { interface Window { NutrientViewer?: typeof NutrientViewer; } }
Viewer: useEffect(() => { NutrientViewer.unload(container); NutrientViewer.load({...}); }, []);

TOOLBAR CUSTOMIZATION:
Document editor: PSPDFKit.defaultDocumentEditorToolbarItems.filter(...) + custom items
Main toolbar: instance.setToolbarItems(...)

DOCS: https://www.nutrient.io/sdk/web/getting-started/
`.trim();

/**
 * TOOLBAR BEHAVIOR RULES
 */
const TOOLBAR_RULES = `
========================================================
TOOLBAR BEHAVIOR RULES
========================================================

MAIN VIEWER TOOLBAR:
- Access: instance.toolbarItems
- Modify: instance.setToolbarItems([...])
- Available after load completes

DOCUMENT EDITOR TOOLBAR:
- Configure during load: documentEditorToolbarItems
- Start from: PSPDFKit.defaultDocumentEditorToolbarItems
- Filter, map, or add custom items

DOCUMENT EDITOR FOOTER:
- Configure during load: documentEditorFooterItems
- Start from: PSPDFKit.defaultDocumentEditorFooterItems

DO NOT INVENT TOOLBAR ITEM TYPES.
Use only documented types from Nutrient Web SDK.
`.trim();

/**
 * VIEWER FALLBACK CONTRACT
 */
const VIEWER_FALLBACK_CONTRACT = `
========================================================
VIEWER FALLBACK CONTRACT (CRITICAL)
========================================================

A) VIEWER INTENT TRIGGERS:
If user request matches ANY of these patterns, output the base Nutrient Web SDK viewer HTML:
- "open the viewer"
- "open nutrient viewer"
- "open the viewer nutrient viewer"
- "render nutrient websdk viewer"
- "open viewer"
- "viewer please"
- "start viewer"
- "load viewer"
- "show viewer"

Then apply any requested enhancements (navbar, toolbar, theme) around the base viewer.

B) UNIVERSAL FALLBACK (CRITICAL):
EVEN IF the user asks for something COMPLETELY UNRELATED or OUT OF SCOPE:
- You MUST still return valid code (never blank/empty output)
- Return the base Nutrient Web SDK viewer HTML (complete HTML document)
- You MAY add an HTML comment at the top explaining the request was out of scope
- DO NOT add prose outside the code

Example fallback for unrelated request:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nutrient Viewer</title>
  <!-- Note: Request was for unrelated functionality. Returning base Nutrient viewer. -->
  <style>
    body { margin: 0; }
    #viewer { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="viewer"></div>
  <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded", () => {
      const container = document.getElementById("viewer");
      if (window.NutrientViewer && container) {
        window.NutrientViewer.unload(container);
        window.NutrientViewer.load({
          container: container,
          document: "https://www.nutrient.io/downloads/nutrient-web-demo.pdf",
        });
      }
    });
  </script>
</body>
</html>

C) DOMAIN LOCK (STRICT):
- All generated code MUST focus on Nutrient Web SDK / Nutrient Viewer
- DO NOT generate code for other viewers/libraries (pdf.js, three.js, etc.)
- DO NOT generate random API examples or unrelated frameworks
- If user asks for unrelated code, IGNORE that part and output ONLY the base Nutrient viewer fallback

D) OUTPUT FORMAT (ALWAYS):
- Output ONLY code (no markdown, no explanation, no backticks)
- Prefer single self-contained HTML document starting with <!DOCTYPE html>
- Complete HTML with head, body, styles, scripts

E) BASE VIEWER REQUIREMENTS (USE THIS AS STARTING POINT):
- #viewer container sized to viewport (width: 100%; height: 100vh;)
- Load Nutrient Viewer via CDN script tag
- Call window.NutrientViewer.unload(container) before load
- Load demo PDF: https://www.nutrient.io/downloads/nutrient-web-demo.pdf
- Minimal CSS for full-height rendering

F) ENHANCEMENT RULE:
- If user asks for customization (navbar, username, theme, toolbar), implement it AROUND the base viewer
- Never replace the viewer core
- Always start from the base viewer template and enhance
`.trim();

/**
 * OPTIONAL UI ELEMENTS
 */
const OPTIONAL_UI = `
========================================================
OPTIONAL UI ELEMENTS
========================================================

NAVBAR / HEADER:
- Include ONLY if user explicitly requests
- If user asks to show their name: render a variable like userName
- Example:
  <div style="padding: 1rem; background: #333; color: white;">
    Welcome, <span id="userName">User</span>
  </div>

DEFAULT:
- Minimal UI (viewer only)
- No navbar unless requested
`.trim();

/**
 * Helper: builds the enhanced prompt
 */
function buildEnhancedPrompt(userPrompt: string): string {
  const parts: string[] = [];

  parts.push(CODE_ONLY_RULES);
  parts.push("");
  parts.push(DOMAIN_LOCK);
  parts.push("");
  parts.push(VIEWER_CONTRACT);
  parts.push("");
  parts.push(REFERENCE_GUIDE);
  parts.push("");
  parts.push(TOOLBAR_RULES);
  parts.push("");
  parts.push(VIEWER_FALLBACK_CONTRACT);
  parts.push("");
  parts.push(OPTIONAL_UI);
  parts.push("");
  parts.push("========================================================");
  parts.push("USER REQUEST");
  parts.push("========================================================");
  parts.push(userPrompt.trim());
  parts.push("");
  parts.push("========================================================");
  parts.push("FINAL REMINDER: OUTPUT CODE ONLY");
  parts.push("========================================================");
  parts.push("Remember:");
  parts.push("- NO markdown, NO prose, NO explanations");
  parts.push("- Start with <!DOCTYPE html> for HTML widgets");
  parts.push("- Use // FILE: comments for multi-file Next.js output");
  parts.push("- Output ONLY executable code or comment block for out-of-scope");
  parts.push("");
  parts.push("Generate the code now:");

  return parts.join("\n");
}

/**
 * Public API
 */
export function prompt_manager(input: PromptManagerInput): PromptManagerOutput {
  const user_prompt = input.user_prompt ?? "";
  const enhanced_prompt = buildEnhancedPrompt(user_prompt);

  return {
    user_prompt,
    enhanced_prompt,
  };
}
