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
 * FORM FILLING - AUTOMATIC + MANUAL HYBRID
 */
const FORM_FILLING_CODE = `
FORM FILLING LOGIC - AUTOMATIC FIELD DETECTION + MANUAL SIDEBAR:

🚨 CRITICAL REQUIREMENTS FOR FORM FILLING:
1. AUTOMATICALLY detect and fill common form fields on page load
2. Show a COLLAPSIBLE SIDEBAR for field inspection and manual filling
3. Sidebar MUST be hideable to just a small button (40-50px)
4. Use smart field name matching (case-insensitive, fuzzy matching)

STEP-BY-STEP IMPLEMENTATION:

// ========== STEP 1: AUTOMATIC FIELD DETECTION & FILLING ==========
// Run this automatically when viewer loads

async function autoFillForm() {
  // Get all form fields
  const formFields = await instance.getFormFields();
  const jsFields = formFields.toJS ? formFields.toJS() : formFields;

  // Smart field matching - detects common fields automatically
  const fieldMap = {};

  jsFields.forEach(field => {
    const fieldNameLower = field.name.toLowerCase().replace(/[_-\s]/g, '');

    // First Name detection
    if (fieldNameLower.includes('firstname') || fieldNameLower.includes('fname') || fieldNameLower === 'first') {
      fieldMap[field.name] = 'John'; // Auto-fill with sample or user-provided data
    }
    // Last Name detection
    else if (fieldNameLower.includes('lastname') || fieldNameLower.includes('lname') || fieldNameLower === 'last') {
      fieldMap[field.name] = 'Doe';
    }
    // Email detection
    else if (fieldNameLower.includes('email') || fieldNameLower.includes('mail')) {
      fieldMap[field.name] = 'john.doe@example.com';
    }
    // Phone detection
    else if (fieldNameLower.includes('phone') || fieldNameLower.includes('tel') || fieldNameLower.includes('mobile')) {
      fieldMap[field.name] = '+1 (555) 123-4567';
    }
    // Address detection
    else if (fieldNameLower.includes('address') || fieldNameLower.includes('street')) {
      fieldMap[field.name] = '123 Main Street';
    }
    // City detection
    else if (fieldNameLower.includes('city')) {
      fieldMap[field.name] = 'New York';
    }
    // State detection
    else if (fieldNameLower.includes('state') || fieldNameLower.includes('province')) {
      fieldMap[field.name] = 'NY';
    }
    // ZIP code detection
    else if (fieldNameLower.includes('zip') || fieldNameLower.includes('postal')) {
      fieldMap[field.name] = '10001';
    }
    // Date detection
    else if (fieldNameLower.includes('date')) {
      fieldMap[field.name] = new Date().toLocaleDateString();
    }
  });

  // Auto-fill detected fields
  if (Object.keys(fieldMap).length > 0) {
    await instance.setFormFieldValues(fieldMap);
    console.log('Auto-filled fields:', Object.keys(fieldMap));
    showNotification(\`Auto-filled \${Object.keys(fieldMap).length} fields\`);
  }

  return jsFields; // Return all fields for sidebar display
}

// ========== STEP 2: COLLAPSIBLE SIDEBAR UI ==========
// HTML Structure (add to body):

<button id="toggle-sidebar-btn" class="sidebar-toggle-btn">
  ☰ Form Fields
</button>

<div id="form-sidebar" class="form-sidebar">
  <div class="sidebar-header">
    <h3>Form Fields</h3>
    <button id="close-sidebar-btn" class="close-btn">×</button>
  </div>

  <div class="sidebar-content">
    <!-- Auto-filled fields summary -->
    <div class="section">
      <h4>Auto-Filled Fields</h4>
      <div id="auto-filled-list"></div>
    </div>

    <!-- Manual field filling -->
    <div class="section">
      <h4>Manual Fill</h4>
      <select id="field-select" class="form-select">
        <option value="">Select a field...</option>
      </select>
      <input type="text" id="field-value" class="form-input" placeholder="Enter value...">
      <button id="fill-btn" class="btn-primary">Fill Field</button>
    </div>

    <!-- All fields inspector -->
    <div class="section">
      <h4>All Fields</h4>
      <button id="inspect-btn" class="btn-secondary">Inspect All Fields</button>
      <div id="fields-list"></div>
    </div>

    <!-- Export -->
    <div class="section">
      <button id="export-btn" class="btn-success">Export Filled PDF</button>
    </div>
  </div>
</div>

// ========== STEP 3: SIDEBAR STYLING (USE DESIGN SYSTEM) ==========

.sidebar-toggle-btn {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 45px;
  height: 45px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.sidebar-toggle-btn:hover {
  background: #2563eb;
  transform: translateX(-2px);
}
.sidebar-toggle-btn.hidden {
  display: none;
}

.form-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: #2a2424;
  border-left: 1px solid #3a3434;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1001;
  overflow-y: auto;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.5);
}
.form-sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  position: sticky;
  top: 0;
  background: #1a1414;
  padding: 16px 20px;
  border-bottom: 1px solid #3a3434;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}
.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
.close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}
.close-btn:hover {
  color: #fff;
}

.sidebar-content {
  padding: 20px;
}
.section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #3a3434;
}
.section:last-child {
  border-bottom: none;
}
.section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-select, .form-input {
  width: 100%;
  background: #252020;
  border: 1px solid #3a3434;
  border-radius: 8px;
  color: #fff;
  padding: 10px 14px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  margin-bottom: 10px;
}
.form-select:focus, .form-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-primary, .btn-secondary, .btn-success {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'DM Sans', sans-serif;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
}
.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}
.btn-secondary {
  background: #252020;
  color: #fff;
  border: 1px solid #3a3434;
}
.btn-secondary:hover {
  background: #3a3434;
}
.btn-success {
  background: #10b981;
  color: #fff;
}
.btn-success:hover {
  background: #059669;
  transform: translateY(-1px);
}

#fields-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 12px;
}
.field-item {
  padding: 8px 12px;
  background: #252020;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #999;
  border: 1px solid #3a3434;
}
.field-item strong {
  color: #fff;
  display: block;
  margin-bottom: 4px;
}

// ========== STEP 4: SIDEBAR JAVASCRIPT ==========

const toggleBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('form-sidebar');
const closeBtn = document.getElementById('close-sidebar-btn');
const fieldSelect = document.getElementById('field-select');
const fieldValue = document.getElementById('field-value');
const fillBtn = document.getElementById('fill-btn');
const inspectBtn = document.getElementById('inspect-btn');
const exportBtn = document.getElementById('export-btn');
const fieldsList = document.getElementById('fields-list');
const autoFilledList = document.getElementById('auto-filled-list');

let allFields = [];

// Toggle sidebar
toggleBtn.addEventListener('click', () => {
  sidebar.classList.add('open');
  toggleBtn.classList.add('hidden');
});

closeBtn.addEventListener('click', () => {
  sidebar.classList.remove('open');
  toggleBtn.classList.remove('hidden');
});

// Initialize: Auto-fill and populate sidebar
(async function init() {
  allFields = await autoFillForm();

  // Populate field dropdown
  allFields.forEach(field => {
    const option = document.createElement('option');
    option.value = field.name;
    option.textContent = field.name;
    fieldSelect.appendChild(option);
  });

  // Show auto-filled summary
  const autoFilledFields = await instance.getFormFieldValues();
  if (autoFilledFields.size > 0) {
    autoFilledList.innerHTML = '<div class="field-item"><strong>Successfully filled ' + autoFilledFields.size + ' fields</strong></div>';
  }
})();

// Manual fill selected field
fillBtn.addEventListener('click', async () => {
  const fieldName = fieldSelect.value;
  const value = fieldValue.value;

  if (!fieldName || !value) {
    alert('Please select a field and enter a value');
    return;
  }

  await instance.setFormFieldValues({ [fieldName]: value });
  showNotification(\`Filled: \${fieldName}\`);
  fieldValue.value = '';
});

// Inspect all fields
inspectBtn.addEventListener('click', () => {
  fieldsList.innerHTML = '';
  allFields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = \`<strong>\${field.name}</strong>Type: \${field.type || 'unknown'}\`;
    fieldsList.appendChild(div);
  });
});

// Export filled PDF
exportBtn.addEventListener('click', async () => {
  const pdfBuffer = await instance.exportPDF();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filled-form.pdf';
  a.click();
  URL.revokeObjectURL(url);
  showNotification('PDF exported successfully!');
});

// Notification helper
function showNotification(message) {
  // Add a toast notification (implement as needed)
  console.log('Notification:', message);
}

// ========== COMPLETE WORKFLOW ==========
// 1. Auto-fill runs on load, detects and fills common fields
// 2. Sidebar opens with toggle button (collapsible)
// 3. User can inspect fields, manually fill missing ones
// 4. Export filled PDF with one click

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
  parts.push("🎨 REQUIRED DESIGN SYSTEM - USE THIS EXACT DESIGN:");
  parts.push("");
  parts.push("COLORS (MUST USE THESE EXACT VALUES):");
  parts.push("- Background (body): #1a1414");
  parts.push("- Secondary background (panels, cards): #2a2424");
  parts.push("- Tertiary background (hover states): #252020");
  parts.push("- Border color: #3a3434");
  parts.push("- Primary action color (buttons): #3b82f6");
  parts.push("- Primary hover: #2563eb");
  parts.push("- Text (primary): #fff");
  parts.push("- Text (secondary): #ccc");
  parts.push("- Text (muted): #999");
  parts.push("- Text (disabled): #888");
  parts.push("- Text (very muted): #666");
  parts.push("- Success color: #10b981");
  parts.push("- Error color: #ef4444");
  parts.push("");
  parts.push("TYPOGRAPHY (MUST USE DM Sans):");
  parts.push("- Include this in <head>:");
  parts.push('  <link rel="preconnect" href="https://fonts.googleapis.com">');
  parts.push('  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  parts.push('  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=block">');
  parts.push("");
  parts.push("- Apply to ALL elements:");
  parts.push('  font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial !important;');
  parts.push("");
  parts.push("- Font weights:");
  parts.push("  * 300 = Light (for subtle text)");
  parts.push("  * 400 = Regular (body text)");
  parts.push("  * 500 = Medium (buttons, labels)");
  parts.push("  * 600 = Semibold (headings)");
  parts.push("");
  parts.push("BUTTON STYLING:");
  parts.push("- Primary buttons: background #3b82f6, color #fff, border-radius 8px, padding 10px 24px");
  parts.push("- Hover: background #2563eb, transform translateY(-1px)");
  parts.push("- Disabled: opacity 0.5, cursor not-allowed");
  parts.push("- Font: 14px, weight 500");
  parts.push("- Transition: all 0.2s ease");
  parts.push("");
  parts.push("INPUT/SELECT STYLING:");
  parts.push("- Background: #252020");
  parts.push("- Border: 1px solid #3a3434");
  parts.push("- Border-radius: 8px");
  parts.push("- Color: #fff");
  parts.push("- Padding: 10px 14px");
  parts.push("- Font: 14px DM Sans");
  parts.push("");
  parts.push("CRITICAL LAYOUT REQUIREMENTS:");
  parts.push("🚨 VIEWER MUST BE FULLY VISIBLE AT ALL TIMES 🚨");
  parts.push("");
  parts.push("SIDEBAR/PANEL RULES (form filling, tools, controls):");
  parts.push("✓ MUST be COLLAPSIBLE - can hide completely");
  parts.push("✓ When COLLAPSED: show ONLY small button (40-50px, floating at edge)");
  parts.push("✓ Button text examples: '☰ Open Form', '≡ Tools', '+ Controls'");
  parts.push("✓ When EXPANDED: sidebar shows, viewer stays visible (flex: 1)");
  parts.push("✓ Smooth CSS transitions (transform/margin/width animations)");
  parts.push("✓ Add close button inside expanded sidebar");
  parts.push("✓ Sidebar background: #2a2424, border: 1px solid #3a3434");
  parts.push("");
  parts.push("LAYOUT PATTERNS:");
  parts.push("- Simple viewer = full screen, no sidebar");
  parts.push("- With features = collapsible sidebar (hideable to just a button)");
  parts.push("- Navbar (top) = background #1a1414, border-bottom 1px solid #3a3434, height 40-60px");
  parts.push("- Dropdown/select elements for field selection");
  parts.push("- Responsive and mobile-friendly");
  parts.push("");
  parts.push("GOLDEN RULE: Form/tool UI = collapsible to small button. Viewer = always fully visible.");
  parts.push("");
  parts.push("SPECIAL INSTRUCTIONS FOR FORM FILLING:");
  parts.push("⚡ When user mentions 'fill form' or 'form filling':");
  parts.push("  1. AUTOMATICALLY detect and fill ALL common form fields on page load");
  parts.push("  2. Create a COLLAPSIBLE SIDEBAR (right side, 380px width)");
  parts.push("  3. Sidebar shows: Auto-filled summary + Manual fill UI + Field inspector + Export button");
  parts.push("  4. Sidebar MUST be hideable to a small toggle button (45x45px)");
  parts.push("  5. Use smart field name matching (case-insensitive, fuzzy)");
  parts.push("  6. Toggle button positioned: fixed, top: 80px, right: 20px");
  parts.push("  7. Auto-fill common fields: firstname, lastname, email, phone, address, city, state, zip, date");
  parts.push("");
  parts.push("YOUR TASK:");
  parts.push("1. Understand the LOGIC from examples");
  parts.push("2. Apply the EXACT DESIGN SYSTEM specified above (colors, fonts, styling)");
  parts.push("3. Use ONLY Nutrient APIs (don't invent)");
  parts.push("4. If out of scope: <!-- OUT_OF_SCOPE: reason -->");
  parts.push("5. NEVER deviate from the color scheme or typography - consistency is critical");
  parts.push("6. For form filling: Follow the AUTOMATIC + MANUAL HYBRID pattern exactly");
  parts.push("");
  parts.push("🎯 USE THE EXACT DESIGN SYSTEM ABOVE - NO CREATIVE FREEDOM ON COLORS/FONTS!");

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
