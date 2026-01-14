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

RULES:
1. OUTPUT COMPLETE HTML STARTING WITH: <!DOCTYPE html>
2. MAIN UI = NUTRIENT WEB SDK VIEWER ONLY
3. NO OTHER PDF LIBRARIES (no pdf.js, jsPDF, pdf-lib, etc.)
4. CDN: <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.10.0/nutrient-viewer.js"></script>
5. USE: const { NutrientViewer } = window;
6. ONLY NUTRIENT WEB SDK APIs - No inventing APIs

SCOPE RULES:
- ONLY generate code for Nutrient Web SDK features
- If request is OUT OF SCOPE (not supported by Nutrient), output: <!-- OUT_OF_SCOPE: [reason] -->
- Link to docs when uncertain: https://www.nutrient.io/guides/web/
- User creativity is WELCOME if it uses Nutrient SDK (e.g., custom navbar + viewer below)
- If user request is vague or simple, just open the viewer with the PDF

UNSUPPORTED FEATURES (MUST REJECT):
- PDF compression / reduce size / optimize
- Text extraction (not viewer feature)
- OCR
- Any non-Nutrient libraries
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
 * FORM FILLING (AUTOMATED + BUTTON-BASED)
 */
const FORM_FILLING_CODE = `
FORM FILLING EXAMPLES:

A) Direct fill with setFormFieldValues:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "form.pdf"
});

// Inspect all form fields (optional)
const fields = await instance.getFormFields();
console.log("Form fields:", fields.toJS?.() ?? fields);

// Fill by field name (MUST match exactly)
await instance.setFormFieldValues({
  "Client first and last name": "John Doe",
  "Email": "john@example.com",
  "Description": "Filled programmatically"
});

B) Prefill at load with instantJSON:

await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "form.pdf",
  instantJSON: {
    format: "https://pspdfkit.com/instant-json/v1",
    formFieldValues: [
      {
        name: "Field Name",
        value: "Field Value",
        type: "pspdfkit/form-field-value",
        v: 1
      }
    ]
  }
});

C) Custom Button Fill:

<button id="fill-form-button">Fill Form</button>

<script>
let instance;

(async () => {
  instance = await NutrientViewer.load({
    container: document.getElementById("viewer"),
    document: "form.pdf"
  });
})();

document.getElementById("fill-form-button")?.addEventListener("click", async () => {
  if (!instance) return;

  await instance.setFormFieldValues({
    "Name": "John Doe",
    "Email": "john@example.com"
  });
});
</script>

DOC: https://www.nutrient.io/guides/web/forms/form-filling/
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

  // Final instructions
  parts.push("INSTRUCTIONS:");
  parts.push("1. If user request is VAGUE or SIMPLE: use BASE VIEWER with the provided DOCUMENT PATH");
  parts.push("2. If user wants CUSTOM UI (navbar, buttons, etc.) + Nutrient viewer: ACCEPT and implement");
  parts.push("3. Use ONLY the code examples provided above - DO NOT invent Nutrient APIs");
  parts.push("4. If request is OUT OF SCOPE: output <!-- OUT_OF_SCOPE: [reason] --> and link to docs");
  parts.push("5. Prefer citing documentation when uncertain");

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
