/**
 * prompt_manager.ts - Smart Dynamic Nutrient Web SDK Prompt Manager
 */

export interface PromptManagerInput {
  user_prompt: string;
  pdf_url?: string;
}

export interface PromptManagerOutput {
  user_prompt: string;
  enhanced_prompt: string;
}

/**
 * CORE RULES - Always included
 */
const CORE_RULES = `
CODE-ONLY OUTPUT. NO PROSE. NO MARKDOWN.

CRITICAL RULES:
1. OUTPUT COMPLETE HTML STARTING WITH: <!DOCTYPE html>
2. USE: <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js"></script>
3. USE: const { NutrientViewer } = window;
4. ONLY NUTRIENT WEB SDK APIs - NO other PDF libraries

DESIGN PHILOSOPHY - READ CAREFULLY:
⚡ GO BEYOND LIMITS - CREATE STUNNING, UNIQUE DESIGNS ⚡

- Examples below show LOGIC PATTERNS ONLY - NOT design templates
- NEVER EVER copy the same design twice
- BE WILDLY CREATIVE - experiment with layouts, colors, animations, effects
- Each implementation should look completely different from the last
- Think modern web design: gradients, shadows, smooth animations, beautiful typography
- Use your full creative potential - push boundaries
- Make it visually stunning and professional
- Choose unique color schemes, fonts, spacing, layouts every time

CRITICAL LAYOUT RULES - MUST FOLLOW:
🚨 NUTRIENT VIEWER MUST ALWAYS BE FULLY VISIBLE - NO BLOCKING UI 🚨

SIDEBAR/PANEL REQUIREMENTS (for form filling, tools, controls):
- MUST be COLLAPSIBLE/HIDEABLE - user can close it completely
- When COLLAPSED: show ONLY a small expandable button (floating, fixed position)
- Button should be small (40-50px) and positioned at edge (left/right/top corner)
- When EXPANDED: sidebar appears, viewer shrinks but stays fully visible (flex: 1)
- Use smooth CSS transitions (transform, margin, or width animations)
- Default state: can be open or closed (your choice)

Example collapse/expand pattern:
- Collapsed: Only small button visible (e.g., "☰ Open Form" or "≡ Tools")
- Expanded: Full sidebar with controls + close button
- Toggle with JavaScript classList.toggle() or state variable

NAVBAR RULES (top navigation):
- Navbars sit ON TOP - they're fine, no collapse needed
- Fixed position at top, viewer below
- Keep navbars minimal height (40-60px max)

GOLDEN RULE:
If you add form filling UI, tools, or any side controls:
→ MUST be collapsible to just a small button
→ Viewer MUST be fully visible when UI is collapsed
→ NO blocking, NO overlays on the viewer

SCOPE:
- Only Nutrient Web SDK features
- If OUT OF SCOPE: output <!-- OUT_OF_SCOPE: [reason] -->
- Simple request: just open viewer with PDF
- Docs: https://www.nutrient.io/guides/web/
`.trim();

/**
 * BASE VIEWER (DEFAULT BEHAVIOR)
 * Used when request is simple or unclear
 */
const BASE_VIEWER = `
BASE VIEWER TEMPLATE (DEFAULT):

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
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
    (async function () {
      const { NutrientViewer } = window;
      const container = document.getElementById("viewer");

      await NutrientViewer.load({
        container,
        document: "DOCUMENT_PATH"
      });
    })();
  </script>
</body>
</html>
`.trim();

/**
 * FORM FILLING - LOGIC ONLY
 */
const FORM_FILLING_CODE = `
FORM FILLING LOGIC:

CRITICAL: Field names MUST match exactly. Use getFormFields() to inspect first.

// 1. INSPECT FIELDS (show in dropdown/select)
const formFields = await instance.getFormFields();
const jsFields = formFields.toJS ? formFields.toJS() : formFields;

// Display in <select> dropdown:
jsFields.forEach(field => {
  const option = document.createElement('option');
  option.value = field.name;
  option.textContent = field.name;
  selectElement.appendChild(option);
});

// 2. FILL SPECIFIC FIELD (from dropdown selection)
const selectedFieldName = selectElement.value;
await instance.setFormFieldValues({
  [selectedFieldName]: inputValue
});

// 3. FILL MULTIPLE FIELDS (smart matching with variations)
const fieldMappings = {
  "First Name": firstName,
  "first name": firstName,
  "FirstName": firstName,
  "Last Name": lastName,
  "last name": lastName,
  "Email": email,
  "email": email,
  // Add more variations...
};
await instance.setFormFieldValues(fieldMappings);

// 4. EXPORT FILLED PDF
const pdfBuffer = await instance.exportPDF();
const blob = new Blob([pdfBuffer], { type: "application/pdf" });
// Download or display

WORKFLOW PATTERN:
1. Button: Inspect Fields → populate dropdown with field.name
2. Dropdown: Select field to fill
3. Input: Enter value for selected field
4. Button: Fill selected field or fill all fields
5. Button: Export/Download filled PDF

Doc: https://www.nutrient.io/guides/web/forms/form-filling/
`.trim();

/**
 * SPLIT PDF (MANDATORY MULTI-INSTANCE PATTERN)
 */
const SPLIT_PDF_CODE = `
SPLIT PDF (MULTI-INSTANCE REQUIRED):

RULES:
- ALWAYS use multiple headless instances
- NEVER use exportPDF() for split
- Use exportPDFWithOperations with removePages

EXAMPLE (Split 10-page PDF into two 5-page PDFs):

// First half (pages 0-4)
const instanceA = await NutrientViewer.load({
  document: "input.pdf",
  headless: true
});

// Second half (pages 5-9)
const instanceB = await NutrientViewer.load({
  document: "input.pdf",
  headless: true
});

// Remove unwanted pages and export
const fileA = await instanceA.exportPDFWithOperations([
  { type: "removePages", pageIndexes: [5, 6, 7, 8, 9] }
]);

const fileB = await instanceB.exportPDFWithOperations([
  { type: "removePages", pageIndexes: [0, 1, 2, 3, 4] }
]);

console.log("Split result A:", fileA.byteLength);
console.log("Split result B:", fileB.byteLength);

FOR EXAMPLE THINK THIS

DOC: https://www.nutrient.io/guides/web/editor/split/
`.trim();

/**
 * DELETE PAGES
 */
const DELETE_PAGES_CODE = `
DELETE PAGES:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "input.pdf"
});

// Option 1: keepPages (keep only these pages)
await instance.applyOperations([
  { type: "keepPages", pageIndexes: [0, 1, 2] }
]);

// Option 2: removePages (remove specific pages)
await instance.applyOperations([
  { type: "removePages", pageIndexes: [3, 4, 5] }
]);

// Export the result
const buffer = await instance.exportPDF();
console.log("Exported PDF size:", buffer.byteLength);

DOC: https://www.nutrient.io/guides/web/editor/page-manipulation/remove/
`.trim();

/**
 * MERGE PDFs
 */
const MERGE_PDF_CODE = `
MERGE PDFs:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "first.pdf"
});

// Fetch second PDF
const blob = await fetch("second.pdf").then(r => r.blob());

// Import at beginning (beforePageIndex: 0)
await instance.applyOperations([{
  type: "importDocument",
  document: blob,
  beforePageIndex: 0
}]);

const buffer = await instance.exportPDF();
console.log("Merged PDF size:", buffer.byteLength);

DOC: https://www.nutrient.io/guides/web/editor/page-manipulation/
`.trim();

/**
 * IMAGE TO PDF
 */
const IMAGE_TO_PDF_CODE = `
IMAGE TO PDF:

const instance = await NutrientViewer.load({
  container: "#viewer",
  document: "source.png"
});

// Export as PDF
const buffer = await instance.exportPDF();

// Optional: Export as PDF/A
const bufferPDFA = await instance.exportPDF({
  outputFormat: {
    conformance: NutrientViewer.Conformance.PDFA_4F
  }
});

DOC: https://www.nutrient.io/guides/web/conversion/image-to-pdf/
`.trim();

/**
 * OFFICE TO PDF
 */
const OFFICE_TO_PDF_CODE = `
OFFICE (DOCX) TO PDF:

const instance = await NutrientViewer.load({
  container: "#viewer",
  document: "source.docx"
});

// Export as PDF
const buffer = await instance.exportPDF();

// Optional: Export as PDF/A
const bufferPDFA = await instance.exportPDF({
  outputFormat: {
    conformance: NutrientViewer.Conformance.PDFA_4F
  }
});

DOC: https://www.nutrient.io/guides/web/conversion/office-to-pdf/
`.trim();

/**
 * Keyword detection helpers
 */
function includesAny(text: string, keywords: string[]) {
  return keywords.some(k => text.includes(k));
}

/**
 * Build enhanced prompt (DYNAMIC, NO DUPLICATION)
 */
function buildEnhancedPrompt(userPrompt: string, pdfUrl?: string): string {
  const parts: string[] = [];
  const lower = userPrompt.toLowerCase();

  // Core rules
  parts.push(CORE_RULES);
  parts.push("");

  // Document path
  const documentPath = pdfUrl || "document.pdf";
  parts.push(`DOCUMENT PATH: "${documentPath}"`);
  parts.push("Replace DOCUMENT_PATH in examples with this value.");
  parts.push("");

  // Default behavior
  parts.push("DEFAULT BEHAVIOR:");
  parts.push(BASE_VIEWER);
  parts.push("");

  // Conditional code injection based on keywords
  if (includesAny(lower, ["fill", "form", "populate", "prefill"])) {
    parts.push("=== FORM FILLING ===");
    parts.push(FORM_FILLING_CODE);
    parts.push("");
  }

  if (includesAny(lower, ["split"])) {
    parts.push("=== SPLIT PDF ===");
    parts.push(SPLIT_PDF_CODE);
    parts.push("");
  }

  if (includesAny(lower, ["delete", "remove page", "trim", "keep page"])) {
    parts.push("=== DELETE PAGES ===");
    parts.push(DELETE_PAGES_CODE);
    parts.push("");
  }

  if (includesAny(lower, ["merge", "combine", "join"])) {
    parts.push("=== MERGE PDFs ===");
    parts.push(MERGE_PDF_CODE);
    parts.push("");
  }

  if (includesAny(lower, ["image", "png", "jpg", "jpeg", "picture"])) {
    parts.push("=== IMAGE TO PDF ===");
    parts.push(IMAGE_TO_PDF_CODE);
    parts.push("");
  }

  if (includesAny(lower, ["docx", "office", "word", "excel", "powerpoint"])) {
    parts.push("=== OFFICE TO PDF ===");
    parts.push(OFFICE_TO_PDF_CODE);
    parts.push("");
  }

  // User request
  parts.push("======================");
  parts.push("USER REQUEST:");
  parts.push(userPrompt);
  parts.push("======================");
  parts.push("");

  // Design creativity emphasis
  parts.push("======================");
  parts.push("🎨 DESIGN GUIDELINES - CRITICAL 🎨");
  parts.push("======================");
  parts.push("");
  parts.push("⚠️ ATTENTION: Examples above are LOGIC PATTERNS ONLY - NOT design templates!");
  parts.push("");
  parts.push("YOUR MISSION:");
  parts.push("Create a UNIQUE, BEAUTIFUL, STUNNING design every single time");
  parts.push("NEVER copy the same layout, colors, or structure");
  parts.push("Push creative boundaries - use gradients, shadows, animations");
  parts.push(" Think modern UI/UX: smooth transitions, beautiful typography, professional polish");
  parts.push("Experiment with different layouts each time (sidebar left/right/bottom, tabs, cards, etc.)");
  parts.push("Choose unique color palettes: try black, white,dark and light themes something but this cud be anything");
  parts.push("Make it look like a professional SaaS product, please make sure if you dont find enough about nutrient sdk from here go at nutrient.io for full documentation fetch");
  parts.push("");
  parts.push("CRITICAL REQUIREMENTS:");
  parts.push("🚨 VIEWER MUST BE FULLY VISIBLE AT ALL TIMES 🚨");
  parts.push("");
  parts.push("SIDEBAR/PANEL RULES (form filling, tools, controls):");
  parts.push("✓ MUST be COLLAPSIBLE - can hide completely and keep that collapsible thing little lower to toolbarkit items");
  parts.push("✓ When COLLAPSED: show ONLY small button (40-50px, floating at edge)");
  parts.push("✓ Button text examples: '☰ Open Form', '≡ Tools', '+ Controls'");
  parts.push("✓ When EXPANDED: sidebar shows, viewer stays visible (flex: 1)");
  parts.push("✓ Smooth CSS transitions (transform/margin/width animations)");
  parts.push("✓ Add close button inside expanded sidebar");
  parts.push("");
  parts.push("LAYOUT PATTERNS:");
  parts.push("- Simple viewer = full screen, no sidebar");
  parts.push("- With features = collapsible sidebar (hideable to just a button)");
  parts.push("- Navbar (top) = fine as-is, keep minimal (40-60px height)");
  parts.push("- Dropdown/select elements for field selection");
  parts.push("- Responsive and mobile-friendly");
  parts.push("");
  parts.push("GOLDEN RULE: Form/tool UI = collapsible to small button. Viewer = always fully visible.");
  parts.push("");
  parts.push("CREATIVE FREEDOM:");
  parts.push("- Choose ANY color scheme you want");
  parts.push("- Choose ANY font family you prefer");
  parts.push("- Choose ANY layout structure that makes sense");
  parts.push("- Add subtle animations and hover effects");
  parts.push("- Make buttons/inputs/dropdowns beautiful");
  parts.push("- Add icons, emojis, or visual elements");
  parts.push("");
  parts.push("YOUR TASK:");
  parts.push("1. Understand the LOGIC from examples");
  parts.push("2. Design a COMPLETELY UNIQUE, BEAUTIFUL UI");
  parts.push("3. Use ONLY Nutrient APIs (don't invent)");
  parts.push("4. If out of scope: <!-- OUT_OF_SCOPE: reason -->");
  parts.push("");
  parts.push("GO BEYOND LIMITS. BE CREATIVE. MAKE IT STUNNING. 🚀");

  return parts.join("\n");
}

/**
 * Public API
 */
export function prompt_manager(input: PromptManagerInput): PromptManagerOutput {
  const { user_prompt, pdf_url } = input;

  return {
    user_prompt,
    enhanced_prompt: buildEnhancedPrompt(user_prompt, pdf_url),
  };
}
