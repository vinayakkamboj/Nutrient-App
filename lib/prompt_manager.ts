/**
 * prompt_manager.ts - Smart Dynamic Nutrient Web SDK Prompt Manager
 *
 * DESIGN:
 * - SMALL PROMPTS: Only inject relevant code samples based on detected keywords
 * - CODE-FOCUSED: Real code examples, minimal documentation
 * - PRINCIPLE: Beyond Nutrient = reject; No detail = just open viewer with PDF
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
`.trim();

/**
 * BASE VIEWER - Always included
 */
const BASE_VIEWER = `
BASE VIEWER TEMPLATE:

<!DOCTYPE html>
<html>
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
    (async function() {
      const { NutrientViewer } = window;
      const container = document.getElementById("viewer");
      const instance = await NutrientViewer.load({
        container,
        document: "document.pdf"
      });
    })();
  </script>
</body>
</html>
`.trim();

/**
 * FORM FILLING CODE - Only when detected
 */
const FORM_FILLING_CODE = `
FORM FILLING EXAMPLES:

A) Direct fill with setFormFieldValues:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "form.pdf"
});

// Inspect all form fields (optional)
const formFields = await instance.getFormFields();
console.log("Form fields:", formFields.toJS?.() ?? formFields);

// Fill by field name
await instance.setFormFieldValues({
  "Client first and last name": "Nutrient Web SDK",
  "Description 1": "Loaded Nutrient Web SDK successfully",
  "Description 2": "Printed out all form fields in the JS Console",
  "Description 3": "Now filling out the form fields programmatically"
});

console.log("Form filled");

B) Prefill at load with Instant JSON:

await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "form.pdf",
  instantJSON: {
    format: "https://pspdfkit.com/instant-json/v1",
    formFieldValues: [
      {
        name: "Form Field 1",
        value: "Text for form field 1",
        type: "pspdfkit/form-field-value",
        v: 1
      }
    ]
  }
});
`.trim();

/**
 * CREATE FORM FIELDS CODE - Only when detected
 */
const CREATE_FORM_CODE = `
CREATE TEXT FIELD:

const widget = new NutrientViewer.Annotations.WidgetAnnotation({
  id: NutrientViewer.generateInstantId(),
  pageIndex: 0,
  formFieldName: "MyField",
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 100, top: 75, width: 200, height: 80 })
});

const textField = new NutrientViewer.FormFields.TextFormField({
  name: "MyField",
  annotationIds: new NutrientViewer.Immutable.List([widget.id]),
  value: "Default text"
});

await instance.create([widget, textField]);

CREATE RADIO BUTTONS:

const widget1 = new NutrientViewer.Annotations.WidgetAnnotation({
  id: NutrientViewer.generateInstantId(),
  pageIndex: 0,
  formFieldName: "Choice",
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 100, top: 100, width: 20, height: 20 })
});

const widget2 = new NutrientViewer.Annotations.WidgetAnnotation({
  id: NutrientViewer.generateInstantId(),
  pageIndex: 0,
  formFieldName: "Choice",
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 130, top: 100, width: 20, height: 20 })
});

const radioField = new NutrientViewer.FormFields.RadioButtonFormField({
  name: "Choice",
  annotationIds: new NutrientViewer.Immutable.List([widget1.id, widget2.id]),
  options: new NutrientViewer.Immutable.List([
    new NutrientViewer.FormOption({ label: "Option 1", value: "1" }),
    new NutrientViewer.FormOption({ label: "Option 2", value: "2" })
  ])
});

await instance.create([widget1, widget2, radioField]);

CREATE CHECKBOX:

const checkWidget = new NutrientViewer.Annotations.WidgetAnnotation({
  id: NutrientViewer.generateInstantId(),
  pageIndex: 0,
  formFieldName: "Agree",
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 100, top: 200, width: 20, height: 20 })
});

const checkField = new NutrientViewer.FormFields.CheckBoxFormField({
  name: "Agree",
  annotationIds: new NutrientViewer.Immutable.List([checkWidget.id]),
  options: new NutrientViewer.Immutable.List([
    new NutrientViewer.FormOption({ label: "Yes", value: "1" })
  ])
});

await instance.create([checkWidget, checkField]);
`.trim();

/**
 * DELETE PAGES CODE - Only when detected
 */
const DELETE_PAGES_CODE = `
DELETE PAGES EXAMPLES:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "input.pdf"
});

// Option 1: keepPages – remove everything except these pages
await instance.applyOperations([
  {
    type: "keepPages",
    pageIndexes: [0, 1, 2] // keep only pages 0–2
  }
]);

// Option 2: removePages – remove specific pages
// await instance.applyOperations([
//   {
//     type: "removePages",
//     pageIndexes: [8, 9, 11] // remove pages 8, 9, 11
//   }
// ]);

// Export the final PDF
const buffer = await instance.exportPDF();
console.log("Exported PDF buffer length:", buffer.byteLength);
`.trim();

/**
 * SPLIT PDF CODE - Only when detected
 */
const SPLIT_PDF_CODE = `
SPLIT PDF EXAMPLE:

// Split a 10-page document into two 5-page PDFs

// First half (pages 0–4)
const instanceA = await NutrientViewer.load({
  document: "input.pdf",
  headless: true
});

// Second half (pages 5–9)
const instanceB = await NutrientViewer.load({
  document: "input.pdf",
  headless: true
});

// Remove unwanted pages from each instance and export
const fileA = await instanceA.exportPDFWithOperations([
  {
    type: "removePages",
    pageIndexes: [5, 6, 7, 8, 9] // keep only 0–4
  }
]);

const fileB = await instanceB.exportPDFWithOperations([
  {
    type: "removePages",
    pageIndexes: [0, 1, 2, 3, 4] // keep only 5–9
  }
]);

console.log("Split result A length:", fileA.byteLength);
console.log("Split result B length:", fileB.byteLength);
`.trim();

/**
 * MERGE PDFs CODE - Only when detected
 */
const MERGE_PDF_CODE = `
MERGE PDFs EXAMPLE:

const instance = await NutrientViewer.load({
  container: document.getElementById("viewer"),
  document: "first.pdf"
});

const blob = await fetch("second.pdf").then(r => r.blob());
await instance.applyOperations([{
  type: "importDocument",
  document: blob,
  beforePageIndex: 0
}]);

const buffer = await instance.exportPDF();
console.log("Merged PDF buffer length:", buffer.byteLength);
`.trim();

/**
 * IMAGE TO PDF CODE - Only when detected
 */
const IMAGE_TO_PDF_CODE = `
IMAGE TO PDF EXAMPLES:

A) Simple convert (with UI):

const instance = await NutrientViewer.load({
  container: "#viewer",
  document: "source.png",
  licenseKey: "YOUR_LICENSE_KEY"
});

const buffer = await instance.exportPDF();
console.log("Exported PDF buffer length:", buffer.byteLength);

B) Headless convert + download as PDF/A:

const instance = await NutrientViewer.load({
  container: "#pspdfkit",
  document: "source.png",
  licenseKey: "YOUR_LICENSE_KEY",
  headless: true
});

const buffer = await instance.exportPDF({
  outputFormat: {
    conformance: NutrientViewer.Conformance.PDFA_4F
  }
});

const blob = new Blob([buffer], { type: "application/pdf" });
const objectUrl = window.URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = objectUrl;
a.style.display = "none";
a.download = "output.pdf";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
window.URL.revokeObjectURL(objectUrl);
`.trim();

/**
 * OFFICE TO PDF CODE - Only when detected
 */
const OFFICE_TO_PDF_CODE = `
OFFICE (DOCX) TO PDF EXAMPLE:

const instance = await NutrientViewer.load({
  container: "#viewer",
  document: "source.docx",
  licenseKey: "YOUR_LICENSE_KEY"
});

// Simple export to PDF
const buffer = await instance.exportPDF();

// Or export as PDF/A-4f
// const buffer = await instance.exportPDF({
//   outputFormat: {
//     conformance: NutrientViewer.Conformance.PDFA_4F
//   }
// });

const blob = new Blob([buffer], { type: "application/pdf" });
const objectUrl = window.URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = objectUrl;
a.style.display = "none";
a.download = "output.pdf";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
window.URL.revokeObjectURL(objectUrl);
`.trim();

/**
 * NAVBAR CODE - Only when detected
 */
const NAVBAR_CODE = `
NAVBAR (ONLY IF REQUESTED):

<style>
  body { margin: 0; display: flex; flex-direction: column; height: 100vh; }
  .navbar {
    height: 56px;
    background: #1a1414;
    color: white;
    display: flex;
    align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid #3a3434;
  }
  .navbar-title { font-size: 18px; font-weight: 500; }
  #viewer { flex: 1; }
</style>

<div class="navbar">
  <div class="navbar-title">Nutrient Viewer</div>
</div>
<div id="viewer"></div>
`.trim();

/**
 * Detect keywords in user prompt
 */
function detectIntent(prompt: string): {
  fillForm: boolean;
  createForm: boolean;
  deletePages: boolean;
  splitPdf: boolean;
  mergePdf: boolean;
  imageToPdf: boolean;
  officeToPdf: boolean;
  navbar: boolean;
  simple: boolean;
} {
  const lower = prompt.toLowerCase();

  return {
    fillForm: /fill.*form|populate.*form|prefill|set.*field|form.*data|instant.*json|fill.*field/i.test(lower),
    createForm: /create.*field|add.*field|design.*form|form.*design|widget.*annotation/i.test(lower),
    deletePages: /delete.*page|remove.*page|keep.*page/i.test(lower),
    splitPdf: /split.*pdf|divide.*pdf|split.*document/i.test(lower),
    mergePdf: /merge.*pdf|combine.*pdf|join.*pdf|import.*document/i.test(lower),
    imageToPdf: /image.*to.*pdf|convert.*image|png.*to.*pdf|jpg.*to.*pdf|picture.*to.*pdf/i.test(lower),
    officeToPdf: /docx.*to.*pdf|word.*to.*pdf|office.*to.*pdf|convert.*docx|convert.*word/i.test(lower),
    navbar: /navbar|nav.*bar|header|top.*bar|navigation/i.test(lower),
    simple: lower.length < 50 && !(/fill|create|merge|split|delete|remove|convert|navbar/i.test(lower))
  };
}

/**
 * Build smart dynamic prompt
 */
function buildEnhancedPrompt(userPrompt: string, pdfUrl?: string): string {
  const intent = detectIntent(userPrompt);
  const parts: string[] = [];

  // ALWAYS: Core rules
  parts.push(CORE_RULES);
  parts.push("");

  // ALWAYS: Base viewer
  parts.push(BASE_VIEWER);
  parts.push("");

  // CONDITIONAL: Only add relevant code samples based on detected keywords
  if (intent.fillForm) {
    parts.push("FORM FILLING:");
    parts.push(FORM_FILLING_CODE);
    parts.push("");
  }

  if (intent.createForm) {
    parts.push("CREATE FORM FIELDS:");
    parts.push(CREATE_FORM_CODE);
    parts.push("");
  }

  if (intent.deletePages) {
    parts.push("DELETE PAGES:");
    parts.push(DELETE_PAGES_CODE);
    parts.push("");
  }

  if (intent.splitPdf) {
    parts.push("SPLIT PDF:");
    parts.push(SPLIT_PDF_CODE);
    parts.push("");
  }

  if (intent.mergePdf) {
    parts.push("MERGE PDFs:");
    parts.push(MERGE_PDF_CODE);
    parts.push("");
  }

  if (intent.imageToPdf) {
    parts.push("IMAGE TO PDF:");
    parts.push(IMAGE_TO_PDF_CODE);
    parts.push("");
  }

  if (intent.officeToPdf) {
    parts.push("OFFICE TO PDF:");
    parts.push(OFFICE_TO_PDF_CODE);
    parts.push("");
  }

  if (intent.navbar) {
    parts.push("NAVBAR (ONLY IF REQUESTED):");
    parts.push(NAVBAR_CODE);
    parts.push("");
  }

  // CRITICAL: PDF URL injection
  if (pdfUrl) {
    parts.push("UPLOADED PDF:");
    parts.push(`USER UPLOADED: ${pdfUrl}`);
    parts.push(`YOU MUST USE: document: "${pdfUrl}"`);
    parts.push("");
  }

  // PRINCIPLE CHECK
  parts.push("PRINCIPLE:");
  parts.push("- If request is BEYOND Nutrient Web SDK, output HTML comment: <!-- OUT_OF_SCOPE: reason -->");
  parts.push("- If request is SIMPLE/NO DETAIL, just open viewer with uploaded PDF");
  parts.push("- DEFAULT: Viewer with uploaded PDF, NO navbar unless requested");
  parts.push("");

  // User request
  parts.push("USER REQUEST:");
  parts.push(userPrompt);

  return parts.join("\n");
}

/**
 * Public API
 */
export function prompt_manager(input: PromptManagerInput): PromptManagerOutput {
  const { user_prompt, pdf_url } = input;
  const enhanced_prompt = buildEnhancedPrompt(user_prompt, pdf_url);

  return {
    user_prompt,
    enhanced_prompt,
  };
}
