import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { PromptOrchestrator } from "@/lib/PromptOrchestrator";

// Configure Next.js route to allow longer execution time (max 60 seconds for ChatGPT compatibility)
export const maxDuration = 50; // 50 seconds max (leaves 10s buffer for ChatGPT's 60s timeout)

/**
 * Timing logger for performance debugging
 * Tracks how long each phase of MCP request takes
 */
function logTiming(label: string, startTime: number) {
  const elapsed = Date.now() - startTime;
  console.log(`[MCP Timing] ${label}: ${elapsed}ms`);
  return Date.now();
}

/**
 * REMOVED: getAppsSdkCompatibleHtml
 * Reason: Dynamic fetch during MCP init caused 60s+ hangs, breaking ChatGPT's "Reload actions"
 * Solution: Use static HTML embedded directly in widget definitions
 * Apps SDK Requirement: Widget HTML must be served via server.registerResource with
 * mimeType "text/html+skybridge" and referenced via _meta["openai/outputTemplate"]
 */

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

// Tool name mappings for natural language
const TOOL_ALIASES: Record<string, string> = {
  "thumbnail": "sidebar-thumbnails",
  "thumbnails": "sidebar-thumbnails",
  "download": "export-pdf",
  "export": "export-pdf",
  "save": "export-pdf",
  "search": "search",
  "find": "search",
  "crop": "document-crop",
  "print": "print",
  "signature": "signature",
  "sign": "signature",
  "highlight": "text-highlighter",
  "highlighter": "highlighter",
  "pen": "ink",
  "draw": "ink",
  "ink": "ink",
  "eraser": "ink-eraser",
  "zoom": "zoom-mode",
  "zoom-in": "zoom-in",
  "zoom-out": "zoom-out",
  "pan": "pan",
  "hand": "pan",
  "pager": "pager",
  "pages": "pager",
  "annotate": "annotate",
  "annotations": "sidebar-annotations",
  "outline": "sidebar-document-outline",
  "bookmarks": "sidebar-bookmarks",
  "note": "note",
  "text": "text",
  "image": "image",
  "stamp": "stamp",
  "line": "line",
  "arrow": "arrow",
  "rectangle": "rectangle",
  "ellipse": "ellipse",
  "circle": "ellipse",
  "polygon": "polygon",
  "editor": "document-editor",
};

function normalizeToolName(name: string): string {
  const n = name.toLowerCase().trim();
  return TOOL_ALIASES[n] || n;
}

// Note: Some versions of the MCP server typings don't include `registerTool` / `registerResource`.
// Runtime supports them (as used elsewhere in this file), so we type `server` as `any` to avoid TS errors.
const handler = createMcpHandler(async (server: any) => {
  const startTime = Date.now();
  let timing = startTime;

  // Static demo viewer HTML (embedded to avoid blocking fetch during MCP init)
  // Apps SDK Requirement: Fast /mcp response (<1s) for action reload to work
  const staticDemoViewerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nutrient Demo Viewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; }
    #viewer { flex: 1; width: 100%; }
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
</html>`;

  timing = logTiming("Static HTML prepared", timing);

  // Demo Viewer Widget - RENAMED from open_sdk, lower priority
  const demoViewerWidget: ContentWidget = {
    id: "demo_viewer",
    title: "Demo Viewer (Basic)",
    templateUri: "ui://widget/demo-viewer.html",
    invoking: "Opening demo viewer...",
    invoked: "Demo viewer opened",
    html: staticDemoViewerHTML,
    description: "Basic demo viewer - only use when user explicitly asks for demo. Use upload_pdf_viewer for full features.",
    widgetDomain: baseURL,
  };

  // Global Tool widget - UPDATED with iframe viewer
  const globalToolWidget: ContentWidget = {
    id: "global_tool",
    title: "Global Tool Output",
    templateUri: "ui://widget/global-tool-widget.html",
    invoking: "Processing your request...",
    invoked: "Result ready",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nutrient Viewer - Global Tool</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #1a1414;
              color: #fff;
              height: 100vh;
              overflow: hidden;
              position: relative;
            }

            /* Viewer Panel - Full Screen */
            .viewer-panel {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .viewer-container {
              flex: 1;
              position: relative;
              background: #fff;
            }
            #viewer-iframe {
              width: 100%;
              height: 100%;
              border: none;
              background: #fff;
            }
            .viewer-empty {
              padding: 24px;
              text-align: center;
              color: #888;
              background: #1a1414;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            }

            /* Loading Overlay */
            .loading-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(26, 20, 20, 0.97);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              transition: opacity 0.3s ease;
            }
            .loading-overlay.hidden {
              opacity: 0;
              pointer-events: none;
            }
            .loading-content {
              text-align: center;
              max-width: 320px;
            }

            /* Spinner */
            .spinner {
              width: 40px;
              height: 40px;
              margin: 0 auto 24px;
              border: 3px solid rgba(59, 130, 246, 0.2);
              border-top-color: #3b82f6;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            /* Status Text */
            .status-text {
              text-align: center;
              font-size: 14px;
              color: #ccc;
              transition: opacity 0.3s ease;
              min-height: 20px;
            }

            /* Details Button */
            .details-button {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: rgba(42, 36, 36, 0.95);
              border: 1px solid #3a3434;
              border-radius: 8px;
              padding: 10px 18px;
              color: #fff;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
              z-index: 900;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            .details-button:hover {
              background: rgba(58, 52, 52, 0.95);
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            }
            .details-button.hidden {
              display: none;
            }

            /* Details Drawer */
            .details-drawer {
              position: fixed;
              top: 0;
              right: 0;
              width: 420px;
              max-width: 90vw;
              height: 100vh;
              background: #2a2424;
              border-left: 1px solid #3a3434;
              transform: translateX(100%);
              transition: transform 0.3s ease;
              z-index: 950;
              overflow-y: auto;
              box-shadow: -4px 0 16px rgba(0, 0, 0, 0.5);
            }
            .details-drawer.open {
              transform: translateX(0);
            }

            /* Drawer Header */
            .drawer-header {
              position: sticky;
              top: 0;
              background: #1a1414;
              padding: 16px 20px;
              border-bottom: 1px solid #3a3434;
              display: flex;
              align-items: center;
              justify-content: space-between;
              z-index: 10;
            }
            .drawer-title {
              font-size: 15px;
              font-weight: 600;
              color: #3b82f6;
            }
            .drawer-close {
              background: transparent;
              border: none;
              color: #888;
              font-size: 20px;
              cursor: pointer;
              padding: 4px 8px;
              line-height: 1;
              transition: color 0.2s ease;
            }
            .drawer-close:hover {
              color: #fff;
            }

            /* Drawer Section */
            .drawer-section {
              border-bottom: 1px solid #3a3434;
            }
            .drawer-section-header {
              padding: 14px 20px;
              background: #252020;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: space-between;
              transition: background 0.2s;
            }
            .drawer-section-header:hover {
              background: #2d2727;
            }
            .drawer-section-title {
              font-size: 13px;
              font-weight: 600;
              color: #ccc;
            }
            .drawer-section-toggle {
              font-size: 11px;
              color: #666;
            }
            .drawer-section-content {
              padding: 14px 20px;
              font-size: 12px;
              line-height: 1.6;
              white-space: pre-wrap;
              word-wrap: break-word;
              color: #999;
              max-height: 200px;
              overflow-y: auto;
              display: none;
              background: #1a1414;
            }
            .drawer-section-content.expanded {
              display: block;
            }

            /* Error/Warning Displays */
            .error-display {
              padding: 12px 20px;
              background: #7f1d1d;
              color: #fca5a5;
              font-size: 12px;
              border-bottom: 1px solid #991b1b;
            }
            .warning-display {
              padding: 12px 20px;
              background: #78350f;
              color: #fcd34d;
              font-size: 12px;
              border-bottom: 1px solid #92400e;
            }

            /* Custom Scrollbar */
            .drawer-section-content::-webkit-scrollbar,
            .details-drawer::-webkit-scrollbar {
              width: 6px;
            }
            .drawer-section-content::-webkit-scrollbar-track,
            .details-drawer::-webkit-scrollbar-track {
              background: #1a1414;
            }
            .drawer-section-content::-webkit-scrollbar-thumb,
            .details-drawer::-webkit-scrollbar-thumb {
              background: #3a3434;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <!-- Viewer Panel (Full Screen) -->
          <div class="viewer-panel">
            <div class="viewer-container" id="viewer-container">
              <div class="viewer-empty">Initializing viewer...</div>
            </div>
          </div>

          <!-- Loading Overlay -->
          <div class="loading-overlay" id="loading-overlay">
            <div class="loading-content">
              <div class="spinner"></div>
              <div class="status-text" id="status-text">Initializing...</div>
            </div>
          </div>

          <!-- Details Button -->
          <button class="details-button hidden" id="details-button">
            Details
          </button>

          <!-- Details Drawer -->
          <div class="details-drawer" id="details-drawer">
            <div class="drawer-header">
              <span class="drawer-title">Debug Details</span>
              <button class="drawer-close" id="drawer-close">×</button>
            </div>

            <div id="error-container"></div>
            <div id="warning-container"></div>

            <div class="drawer-section">
              <div class="drawer-section-header" onclick="toggleDrawerSection('user')">
                <span class="drawer-section-title">User Prompt</span>
                <span class="drawer-section-toggle" id="toggle-user">▶</span>
              </div>
              <div class="drawer-section-content" id="content-user">Loading...</div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-header" onclick="toggleDrawerSection('enhanced')">
                <span class="drawer-section-title">Enhanced Prompt</span>
                <span class="drawer-section-toggle" id="toggle-enhanced">▶</span>
              </div>
              <div class="drawer-section-content" id="content-enhanced">Loading...</div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-header" onclick="toggleDrawerSection('response')">
                <span class="drawer-section-title">LLM Response</span>
                <span class="drawer-section-toggle" id="toggle-response">▶</span>
              </div>
              <div class="drawer-section-content" id="content-response">Loading...</div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-header" onclick="toggleDrawerSection('meta')">
                <span class="drawer-section-title">Metadata</span>
                <span class="drawer-section-toggle" id="toggle-meta">▶</span>
              </div>
              <div class="drawer-section-content" id="content-meta">Loading...</div>
            </div>
          </div>

          <script>
            // Toggle drawer section expansion
            function toggleDrawerSection(name) {
              const content = document.getElementById('content-' + name);
              const toggle = document.getElementById('toggle-' + name);

              if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                toggle.textContent = '▶';
              } else {
                content.classList.add('expanded');
                toggle.textContent = '▼';
              }
            }

            (function() {
              // Element references
              const userContent = document.getElementById('content-user');
              const enhancedContent = document.getElementById('content-enhanced');
              const responseContent = document.getElementById('content-response');
              const metaContent = document.getElementById('content-meta');
              const viewerContainer = document.getElementById('viewer-container');
              const errorContainer = document.getElementById('error-container');
              const warningContainer = document.getElementById('warning-container');
              const loadingOverlay = document.getElementById('loading-overlay');
              const detailsButton = document.getElementById('details-button');
              const detailsDrawer = document.getElementById('details-drawer');
              const drawerClose = document.getElementById('drawer-close');
              const statusText = document.getElementById('status-text');

              // Status tracking
              let lastOutput = null;
              let viewerInitialized = false;
              let currentStatusText = '';
              let statusCycleIndex = 0;
              let statusCycleInterval = null;
              let statusSteps = {
                captured: false,
                enhanced: false,
                calling: false,
                preparing: false,
                rendering: false,
                ready: false
              };

              // Loading messages to cycle through
              const loadingMessages = [
                'Initializing...',
                'Enhancing prompt...',
                'Waiting for LLM response...',
                'Processing...'
              ];

              // Details drawer toggle
              detailsButton.addEventListener('click', function() {
                detailsDrawer.classList.add('open');
              });

              drawerClose.addEventListener('click', function() {
                detailsDrawer.classList.remove('open');
              });

              // Update status text with fade effect
              function updateStatusText(newText) {
                if (currentStatusText === newText) return;

                currentStatusText = newText;
                statusText.style.opacity = '0';

                setTimeout(function() {
                  statusText.textContent = newText;
                  statusText.style.opacity = '1';
                }, 150);
              }

              // Cycle through loading messages
              function cycleStatusMessages() {
                updateStatusText(loadingMessages[statusCycleIndex]);
                statusCycleIndex = (statusCycleIndex + 1) % loadingMessages.length;
              }

              // Start status cycling (every 2 seconds)
              statusCycleInterval = setInterval(cycleStatusMessages, 2000);
              cycleStatusMessages(); // Show first message immediately

              // Update status steps
              function updateStatusSteps(toolOutput) {
                // Check if viewer is ready
                if (viewerInitialized && !statusSteps.ready) {
                  statusSteps.ready = true;

                  // Stop cycling messages
                  if (statusCycleInterval) {
                    clearInterval(statusCycleInterval);
                    statusCycleInterval = null;
                  }

                  // Show final message
                  updateStatusText('Ready');

                  // Hide loading overlay
                  setTimeout(function() {
                    loadingOverlay.classList.add('hidden');
                    detailsButton.classList.remove('hidden');
                  }, 600);
                }
              }

              // Poll for tool output
              function updateDisplay() {
                const toolOutput = window.openai?.toolOutput?.global_tool;
                const outputKey = JSON.stringify(toolOutput ?? null);

                if (outputKey !== lastOutput) {
                  lastOutput = outputKey;

                  if (toolOutput) {
                    // Update info panels
                    userContent.textContent = toolOutput.user_prompt || 'N/A';
                    enhancedContent.textContent = toolOutput.enhanced_prompt || 'N/A';
                    responseContent.textContent = toolOutput.response_text || 'N/A';

                    // Update metadata
                    const provider = toolOutput.provider || 'unknown';
                    const modelRequested = toolOutput.model_requested || 'N/A';
                    const modelUsed = toolOutput.model_used || 'N/A';
                    const errors = toolOutput.errors || [];
                    const warnings = toolOutput.warnings || [];
                    const availableModels = toolOutput.available_models || [];

                    let metaText = 'Provider: ' + provider + '\\n' +
                                   'Model Requested: ' + modelRequested + '\\n' +
                                   'Model Used: ' + modelUsed + '\\n' +
                                   'Errors: ' + (errors.length > 0 ? errors.join(', ') : 'none') + '\\n' +
                                   'Warnings: ' + (warnings.length > 0 ? warnings.join(', ') : 'none');

                    if (availableModels.length > 0) {
                      metaText += '\\n\\nAvailable Models:\\n' + availableModels.join('\\n');
                    }

                    metaContent.textContent = metaText;

                    // Display errors if any
                    if (errors.length > 0) {
                      errorContainer.innerHTML = '<div class="error-display">⚠️ Errors: ' + errors.join('; ') + '</div>';
                    } else {
                      errorContainer.innerHTML = '';
                    }

                    // Display warnings if any
                    if (warnings.length > 0) {
                      warningContainer.innerHTML = '<div class="warning-display">⚠️ Warnings: ' + warnings.join('; ') + '</div>';
                    } else {
                      warningContainer.innerHTML = '';
                    }

                    // Update status steps
                    updateStatusSteps(toolOutput);

                    // Initialize viewer with response_html
                    if (!viewerInitialized && toolOutput.response_html) {
                      initializeViewer(toolOutput.response_html);
                      viewerInitialized = true;
                      updateStatusSteps(toolOutput);
                    }
                  }
                }
              }

              // Initialize viewer with sandboxed iframe
              function initializeViewer(responseHtml) {
                try {
                  if (!responseHtml || responseHtml.trim().length === 0) {
                    viewerContainer.innerHTML = '<div class="viewer-empty">No viewer output available.</div>';
                    return;
                  }

                  // Validate HTML
                  const isValidHTML = responseHtml.includes('<!DOCTYPE html') || responseHtml.includes('<html');

                  if (!isValidHTML) {
                    viewerContainer.innerHTML = '<div class="viewer-empty">Invalid HTML format. Expected complete HTML document.</div>';
                    return;
                  }

                  // Create sandboxed iframe
                  const iframe = document.createElement('iframe');
                  iframe.id = 'viewer-iframe';
                  iframe.sandbox = 'allow-scripts allow-same-origin';
                  iframe.srcdoc = responseHtml;

                  viewerContainer.innerHTML = '';
                  viewerContainer.appendChild(iframe);

                  console.log('Viewer iframe initialized successfully');
                } catch (error) {
                  console.error('Failed to initialize viewer:', error);
                  viewerContainer.innerHTML = '<div class="viewer-empty">Error initializing viewer: ' + (error && error.message ? error.message : 'Unknown error') + '</div>';
                }
              }

              // Initial update
              updateDisplay();

              // Poll every 250ms for updates
              setInterval(updateDisplay, 250);
            })();
          </script>
        </body>
      </html>
    `,
    description: "Displays user prompt, enhanced prompt, LLM response, and live generated viewer",
    widgetDomain: "https://cdn.cloud.pspdfkit.com",
  };

  // PDF Upload widget - PRIMARY with theme button added to navbar
  const pdfUploadWidget: ContentWidget = {
    id: "upload_pdf_viewer",
    title: "PDF Upload & Viewer",
    templateUri: "ui://widget/pdf-upload-viewer.html",
    invoking: "Opening PDF viewer...",
    invoked: "PDF viewer ready",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Nutrient PDF Viewer</title>
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #1a1414;
              color: #fff;
              height: 100vh;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .navbar {
              height: 56px;
              background: #1a1414;
              border-bottom: 1px solid #3a3434;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
              flex-shrink: 0;
            }
            .navbar-left { display: flex; align-items: center; gap: 12px; }
            .navbar-logo { width: 48px; height: 48px; object-fit: contain; }
            .navbar-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.02em;
            }
            .navbar-right { display: flex; align-items: center; gap: 12px; }
            .upload-btn, .theme-btn {
              padding: 8px 16px;
              background: #fff;
              color: #000;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .upload-btn:hover, .theme-btn:hover { background: #e5e5e5; }
            .upload-btn:disabled, .theme-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            
            /* Theme Dropdown */
            .theme-dropdown { position: relative; display: inline-block; }
            .theme-menu {
              display: none;
              position: absolute;
              top: 100%;
              right: 0;
              margin-top: 8px;
              background: #2a2424;
              border: 1px solid #3a3434;
              border-radius: 8px;
              min-width: 200px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              z-index: 1000;
              overflow: hidden;
            }
            .theme-menu.show { display: block; }
            .theme-option {
              padding: 12px 16px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 12px;
              color: #fff;
              transition: background 0.15s;
              border: none;
              background: none;
              width: 100%;
              text-align: left;
              font-size: 14px;
            }
            .theme-option:hover { background: #3a3434; }
            .theme-option.active { background: #3b82f6; }
            .theme-option-icon {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            }
            .theme-option-icon.light { background: #f5f5f5; color: #333; }
            .theme-option-icon.dark { background: #1a1a1a; color: #fff; }
            .theme-option-icon.auto { background: linear-gradient(135deg, #f5f5f5 50%, #1a1a1a 50%); }
            .theme-option-icon.hc-light { background: #fff; border: 2px solid #000; color: #000; }
            .theme-option-icon.hc-dark { background: #000; border: 2px solid #fff; color: #fff; }
            .theme-option-text { flex: 1; }
            .theme-option-check { color: #3b82f6; font-weight: bold; }
            
            .upload-section {
              padding: 24px;
              background: #2a2424;
              border-bottom: 1px solid #3a3434;
            }
            .upload-area {
              border: 2px dashed #4a4444;
              border-radius: 12px;
              padding: 48px 24px;
              text-align: center;
              cursor: pointer;
              background: #1a1414;
              transition: all 0.2s;
            }
            .upload-area:hover { border-color: #3b82f6; background: #252020; }
            .upload-area.drag-over { border-color: #3b82f6; background: #252020; }
            .upload-icon { font-size: 48px; margin-bottom: 16px; }
            .upload-text { font-size: 18px; font-weight: 500; margin-bottom: 8px; }
            .upload-hint { font-size: 14px; color: #888; }
            .file-types { font-size: 12px; color: #666; margin-top: 4px; }
            input[type="file"] { display: none; }
            .instructions {
              margin-top: 16px;
              padding: 16px;
              background: #252020;
              border-radius: 8px;
              font-size: 13px;
            }
            .instructions-title { font-weight: 600; margin-bottom: 8px; color: #3b82f6; }
            .instructions ul { padding-left: 20px; margin-top: 8px; }
            .instructions li { margin-bottom: 4px; color: #aaa; }
            .viewer-container { 
              flex: 1; 
              position: relative; 
              overflow: hidden; 
              background: #1a1414;
              display: none;
            }
            .viewer-container.active { display: block; }
            .error, .info { 
              padding: 12px 24px; 
              font-size: 14px; 
              text-align: center; 
            }
            .error { background: #ef4444; color: white; }
            .info { background: #3b82f6; color: white; }
            .hidden { display: none !important; }
            .loading {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 12px 24px;
              background: #2a2424;
              color: #fff;
            }
            .spinner {
              width: 16px;
              height: 16px;
              border: 2px solid #fff;
              border-top-color: transparent;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <header class="navbar">
            <div class="navbar-left">
              <img src="/logo.png" alt="Nutrient" class="navbar-logo" onerror="this.style.display='none'">
              <span class="navbar-title">Nutrient</span>
            </div>
            <div class="navbar-right">
              <!-- Theme Dropdown -->
              <div class="theme-dropdown">
                <button class="theme-btn" id="theme-toggle-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  Theme
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div class="theme-menu" id="theme-menu">
                  <button class="theme-option active" data-theme="LIGHT">
                    <span class="theme-option-icon light">☀️</span>
                    <span class="theme-option-text">Light</span>
                    <span class="theme-option-check">✓</span>
                  </button>
                  <button class="theme-option" data-theme="DARK">
                    <span class="theme-option-icon dark">🌙</span>
                    <span class="theme-option-text">Dark</span>
                    <span class="theme-option-check"></span>
                  </button>
                  <button class="theme-option" data-theme="AUTO">
                    <span class="theme-option-icon auto">⚙️</span>
                    <span class="theme-option-text">Auto (System)</span>
                    <span class="theme-option-check"></span>
                  </button>
                  <button class="theme-option" data-theme="HIGH_CONTRAST_LIGHT">
                    <span class="theme-option-icon hc-light">A</span>
                    <span class="theme-option-text">High Contrast Light</span>
                    <span class="theme-option-check"></span>
                  </button>
                  <button class="theme-option" data-theme="HIGH_CONTRAST_DARK">
                    <span class="theme-option-icon hc-dark">A</span>
                    <span class="theme-option-text">High Contrast Dark</span>
                    <span class="theme-option-check"></span>
                  </button>
                </div>
              </div>
              
              <button class="upload-btn" id="navbar-upload-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Document
              </button>
            </div>
          </header>

          <div id="loading" class="loading hidden">
            <div class="spinner"></div>
            <span>Loading viewer...</span>
          </div>

          <div class="upload-section" id="upload-section">
            <div class="upload-area" id="upload-area">
              <div class="upload-icon">📄</div>
              <div class="upload-text">Click to upload or drag and drop</div>
              <div class="upload-hint">Supports multiple file formats</div>
              <div class="file-types">PDF • Word • Excel • PowerPoint • Images</div>
            </div>
            <input type="file" id="file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.tiff">
            
            <div class="instructions">
              <div class="instructions-title">Features:</div>
              <ul>
                <li>View and annotate PDF documents</li>
                <li>Highlight, comment, and draw on documents</li>
                <li>Office documents auto-convert to PDF</li>
                <li>Switch themes: Light, Dark, Auto, High Contrast</li>
              </ul>
            </div>
          </div>

          <div id="error" class="error hidden"></div>
          <div id="info" class="info hidden"></div>
          <div id="viewer" class="viewer-container"></div>

          <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@2024.7.0/pspdfkit.js"></script>
          
          <script>
            (function() {
              let viewerInstance = null;
              let viewerReady = false;
              let currentTheme = 'LIGHT';
              let lastLoadedFile = null;
              
              const uploadArea = document.getElementById('upload-area');
              const fileInput = document.getElementById('file-input');
              const navbarBtn = document.getElementById('navbar-upload-btn');
              const errorDiv = document.getElementById('error');
              const infoDiv = document.getElementById('info');
              const loadingDiv = document.getElementById('loading');
              const viewerDiv = document.getElementById('viewer');
              const uploadSection = document.getElementById('upload-section');
              const themeToggleBtn = document.getElementById('theme-toggle-btn');
              const themeMenu = document.getElementById('theme-menu');

              function showError(msg) {
                console.error('Error:', msg);
                errorDiv.textContent = msg;
                errorDiv.classList.remove('hidden');
                infoDiv.classList.add('hidden');
                loadingDiv.classList.add('hidden');
                setTimeout(() => errorDiv.classList.add('hidden'), 5000);
              }

              function showInfo(msg) {
                console.log('Info:', msg);
                infoDiv.textContent = msg;
                infoDiv.classList.remove('hidden');
                errorDiv.classList.add('hidden');
                setTimeout(() => infoDiv.classList.add('hidden'), 3000);
              }

              function showLoading(show) {
                if (show) {
                  loadingDiv.classList.remove('hidden');
                } else {
                  loadingDiv.classList.add('hidden');
                }
              }

              function clearMessages() {
                errorDiv.classList.add('hidden');
                infoDiv.classList.add('hidden');
              }

              function waitForPSPDFKit() {
                return new Promise((resolve, reject) => {
                  let attempts = 0;
                  const maxAttempts = 50;
                  
                  const checkPSPDFKit = setInterval(() => {
                    attempts++;
                    if (typeof window.PSPDFKit !== 'undefined') {
                      clearInterval(checkPSPDFKit);
                      console.log('PSPDFKit loaded successfully');
                      resolve(window.PSPDFKit);
                    } else if (attempts >= maxAttempts) {
                      clearInterval(checkPSPDFKit);
                      reject(new Error('PSPDFKit failed to load'));
                    }
                  }, 100);
                });
              }

              async function initializeViewer() {
                try {
                  showLoading(true);
                  const PSPDFKit = await waitForPSPDFKit();
                  viewerReady = true;
                  showLoading(false);
                  showInfo('Viewer ready! Upload a document to get started.');
                } catch (error) {
                  showError('Failed to initialize viewer. Please refresh the page.');
                  console.error('Initialization error:', error);
                }
              }

              // ========== THEME FUNCTIONS ==========
              function updateThemeMenuUI(selectedTheme) {
                const options = themeMenu.querySelectorAll('.theme-option');
                options.forEach(opt => {
                  const isActive = opt.dataset.theme === selectedTheme;
                  opt.classList.toggle('active', isActive);
                  opt.querySelector('.theme-option-check').textContent = isActive ? '✓' : '';
                });
              }

              async function applyTheme(themeName) {
                if (!lastLoadedFile) {
                  currentTheme = themeName;
                  updateThemeMenuUI(themeName);
                  showInfo('Theme set to ' + themeName.replace(/_/g, ' ') + '. Load a document to see it.');
                  themeMenu.classList.remove('show');
                  return;
                }

                showLoading(true);
                themeMenu.classList.remove('show');

                try {
                  const PSPDFKit = window.PSPDFKit;
                  
                  if (viewerInstance) {
                    await PSPDFKit.unload(viewerDiv);
                    viewerInstance = null;
                  }

                  let themeEnum = PSPDFKit.Theme.LIGHT;
                  switch (themeName) {
                    case 'LIGHT': themeEnum = PSPDFKit.Theme.LIGHT; break;
                    case 'DARK': themeEnum = PSPDFKit.Theme.DARK; break;
                    case 'AUTO': themeEnum = PSPDFKit.Theme.AUTO; break;
                    case 'HIGH_CONTRAST_LIGHT': 
                      themeEnum = PSPDFKit.Theme.HIGH_CONTRAST_LIGHT || PSPDFKit.Theme.LIGHT;
                      break;
                    case 'HIGH_CONTRAST_DARK': 
                      themeEnum = PSPDFKit.Theme.HIGH_CONTRAST_DARK || PSPDFKit.Theme.DARK;
                      break;
                  }

                  const fileUrl = URL.createObjectURL(lastLoadedFile);
                  
                  viewerInstance = await PSPDFKit.load({
                    container: viewerDiv,
                    document: fileUrl,
                    baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@2024.7.0/",
                    theme: themeEnum,
                  });

                  window.nutrientViewerInstance = viewerInstance;
                  currentTheme = themeName;
                  updateThemeMenuUI(themeName);
                  
                  __startWatchingToolOutput();
                  __startWatchingSelectToolOutput();

                  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
                  showInfo('Theme: ' + themeName.replace(/_/g, ' '));
                  
                } catch (error) {
                  console.error('Theme error:', error);
                  showError('Failed to apply theme: ' + error.message);
                } finally {
                  showLoading(false);
                }
              }

              // Theme dropdown toggle
              themeToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeMenu.classList.toggle('show');
              });

              document.addEventListener('click', (e) => {
                if (!themeMenu.contains(e.target) && e.target !== themeToggleBtn) {
                  themeMenu.classList.remove('show');
                }
              });

              themeMenu.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', () => {
                  const theme = option.dataset.theme;
                  applyTheme(theme);
                });
              });

              async function loadDocument(file) {
                if (!viewerReady) {
                  showError('Viewer not ready. Please wait a moment and try again.');
                  return;
                }

                if (!file) {
                  showError('No file selected.');
                  return;
                }

                clearMessages();
                showLoading(true);
                navbarBtn.disabled = true;
                lastLoadedFile = file;

                try {
                  console.log('Loading file:', file.name, 'Type:', file.type, 'Size:', file.size);

                  if (viewerInstance) {
                    await window.PSPDFKit.unload(viewerDiv);
                    viewerInstance = null;
                  }

                  const fileUrl = URL.createObjectURL(file);
                  console.log('Created blob URL:', fileUrl);

                  // Get theme enum for current theme
                  const PSPDFKit = window.PSPDFKit;
                  let themeEnum = PSPDFKit.Theme.LIGHT;
                  switch (currentTheme) {
                    case 'DARK': themeEnum = PSPDFKit.Theme.DARK; break;
                    case 'AUTO': themeEnum = PSPDFKit.Theme.AUTO; break;
                    case 'HIGH_CONTRAST_LIGHT': 
                      themeEnum = PSPDFKit.Theme.HIGH_CONTRAST_LIGHT || PSPDFKit.Theme.LIGHT; 
                      break;
                    case 'HIGH_CONTRAST_DARK': 
                      themeEnum = PSPDFKit.Theme.HIGH_CONTRAST_DARK || PSPDFKit.Theme.DARK; 
                      break;
                  }

                  viewerInstance = await window.PSPDFKit.load({
                    container: viewerDiv,
                    document: fileUrl,
                    baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@2024.7.0/",
                    theme: themeEnum,
                  });

                  // Start polling for tool output updates (toolbar + tool selection)
                  __startWatchingToolOutput();
                  __startWatchingSelectToolOutput();

                  console.log('Document loaded successfully');
                  
                  // Expose instance globally for toolbar manipulation
                  window.nutrientViewerInstance = viewerInstance;
                  
                  uploadSection.style.display = 'none';
                  viewerDiv.classList.add('active');
                  showInfo('Loaded: ' + file.name);
                  
                  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
                } catch (error) {
                  console.error('Load error:', error);
                  showError('Failed to load ' + file.name + '. Error: ' + error.message);
                  
                  uploadSection.style.display = 'block';
                  viewerDiv.classList.remove('active');
                } finally {
                  showLoading(false);
                  navbarBtn.disabled = false;
                }
              }

              // ========== TOOLBAR MANIPULATION HELPERS ==========
              // ========== TOOL OUTPUT -> LIVE TOOLBAR UPDATES ==========
              // ChatGPT injects the latest tool output into window.openai.toolOutput.
              // We poll for changes and apply them to the live PSPDFKit instance.
              let __lastToolbarPayload = null;

              function __applyToolbarUpdate(payload) {
                if (!viewerInstance) return;
                if (!payload) return;

                const action = payload.action;
                const tools = Array.isArray(payload.tools) ? payload.tools : [];

                if (action === "reset") {
                  viewerInstance.setToolbarItems(window.PSPDFKit.defaultToolbarItems);
                  showInfo('Toolbar reset');
                  return;
                }

                if (action === "keep_only") {
                  viewerInstance.setToolbarItems(items =>
                    items.filter(item => tools.includes(item.type))
                  );
                  showInfo('Toolbar updated');
                  return;
                }

                if (action === "remove") {
                  viewerInstance.setToolbarItems(items =>
                    items.filter(item => !tools.includes(item.type))
                  );
                  showInfo('Toolbar updated');
                  return;
                }

                if (action === "add") {
                  viewerInstance.setToolbarItems(items => {
                    const existing = new Set(items.map(i => i.type));
                    const toAdd = tools.filter(t => !existing.has(t)).map(t => ({ type: t }));
                    return items.concat(toAdd);
                  });
                  showInfo('Toolbar updated');
                  return;
                }

                if (action === "get") {
                  // no-op: widget already shows current toolbar via console helpers.
                  return;
                }
              }

              function __startWatchingToolOutput() {
                // Apply once if toolOutput already exists
                const initial = window.openai?.toolOutput?.toolbar;
                __lastToolbarPayload = JSON.stringify(initial ?? null);
                __applyToolbarUpdate(initial);

                // Poll for changes (simple + reliable for vanilla widgets)
                setInterval(() => {
                  const next = window.openai?.toolOutput?.toolbar;
                  const key = JSON.stringify(next ?? null);
                  if (key !== __lastToolbarPayload) {
                    __lastToolbarPayload = key;
                    __applyToolbarUpdate(next);
                  }
                }, 250);
              }

              // ========== TOOL SELECTION HELPERS ==========
              // Select a tool by setting ViewState.interactionMode.
              // This is the documented way to programmatically activate tools.
              // When successful, Nutrient/PSPDFKit automatically highlights the
              // corresponding built-in toolbar button and the tool is ready to use.
              let __lastSelectToolPayload = null;

              // Map normalized tool keys -> InteractionMode enum member name + toolbar types to highlight.
              // Notes:
              // - Some items (export/print/etc.) are actions, not interaction modes.
              // - Some modes require specific license components. We keep them here for future use;
              //   if the enum member isn't present, we safely no-op.
              const __MODE_MAP = {
                // Navigation
                pan: { modeName: "PAN", toolbarTypes: ["pan"] },
                marqueeZoom: { modeName: "MARQUEE_ZOOM", toolbarTypes: ["marquee-zoom", "marqueeZoom"] },
                search: { modeName: "SEARCH", toolbarTypes: ["search"] },

                // Annotations
                text: { modeName: "TEXT", toolbarTypes: ["text"] },
                note: { modeName: "NOTE", toolbarTypes: ["note"] },
                ink: { modeName: "INK", toolbarTypes: ["ink"] },
                inkEraser: { modeName: "INK_ERASER", toolbarTypes: ["ink-eraser", "inkEraser"] },
                line: { modeName: "SHAPE_LINE", toolbarTypes: ["line"] },
                rectangle: { modeName: "SHAPE_RECTANGLE", toolbarTypes: ["rectangle"] },
                ellipse: { modeName: "SHAPE_ELLIPSE", toolbarTypes: ["ellipse"] },
                polygon: { modeName: "SHAPE_POLYGON", toolbarTypes: ["polygon"] },
                polyline: { modeName: "SHAPE_POLYLINE", toolbarTypes: ["polyline"] },

                // Redaction (license component)
                redactText: { modeName: "REDACT_TEXT_HIGHLIGHTER", toolbarTypes: ["redact-text-highlighter", "redactText"] },
                redactRectangle: { modeName: "REDACT_SHAPE_RECTANGLE", toolbarTypes: ["redact-rectangle", "redactRectangle"] },

                // Document editor / crop (license component)
                documentEditor: { modeName: "DOCUMENT_EDITOR", toolbarTypes: ["document-editor", "documentEditor"] },
                documentCrop: { modeName: "DOCUMENT_CROP", toolbarTypes: ["document-crop", "documentCrop"] },

                // Forms (license component)
                formCreator: { modeName: "FORM_CREATOR", toolbarTypes: ["form-creator", "formCreator"] },

                // Measurement (license component)
                measurement: { modeName: "MEASUREMENT", toolbarTypes: ["measure", "measurement"] },
              };

              function __getInteractionMode(modeName) {
                try {
                  const SDK = window.PSPDFKit;
                  if (!SDK || !SDK.InteractionMode) return null;
                  return SDK.InteractionMode[modeName] ?? null;
                } catch (_) {
                  return null;
                }
              }

              function __applySelectTool(payload) {
                if (!viewerInstance) return;
                if (!payload) return;

                const toolKey = payload.toolKey;
                const keepSelectedTool = payload.keepSelectedTool !== false;

                // Always apply keepSelectedTool first.
                viewerInstance.setViewState(vs => vs.set("keepSelectedTool", !!keepSelectedTool));

                if (!toolKey || toolKey === "none") {
                  viewerInstance.setViewState(vs => vs.set("interactionMode", null));
                  // best-effort deselect custom toolbar items
                  viewerInstance.setToolbarItems(items => items.map(i => ({ ...i, selected: false })));
                  return;
                }

                const cfg = __MODE_MAP[toolKey];
                if (!cfg) {
                  console.warn("[select_tool] Unknown toolKey:", toolKey);
                  return;
                }

                const mode = __getInteractionMode(cfg.modeName);
                if (!mode) {
                  console.warn("[select_tool] InteractionMode not available:", cfg.modeName, "for toolKey:", toolKey);
                  return;
                }

                // Activate the tool (this is what makes it selected & ready to draw)
                viewerInstance.setViewState(vs => vs.set("interactionMode", mode));

                // For built-in toolbar items, the SDK auto-selects the button.
                // For custom items, we do a best-effort highlight.
                const types = cfg.toolbarTypes || [];
                if (types.length) {
                  viewerInstance.setToolbarItems(items =>
                    items.map(item => ({
                      ...item,
                      selected: types.includes(item.type),
                    }))
                  );
                }
              }

              function __startWatchingSelectToolOutput() {
                const initial = window.openai?.toolOutput?.selectTool;
                __lastSelectToolPayload = JSON.stringify(initial ?? null);
                __applySelectTool(initial);

                setInterval(() => {
                  const next = window.openai?.toolOutput?.selectTool;
                  const key = JSON.stringify(next ?? null);
                  if (key !== __lastSelectToolPayload) {
                    __lastSelectToolPayload = key;
                    __applySelectTool(next);
                  }
                }, 250);
              }

              
              window.removeToolbarItemsByType = function(removeTypes) {
                if (!viewerInstance) {
                  console.warn('Viewer instance not ready yet.');
                  return { success: false, error: 'No document loaded' };
                }
                const typesToRemove = Array.isArray(removeTypes) ? removeTypes : [removeTypes];
                viewerInstance.setToolbarItems((items) =>
                  items.filter((item) => !typesToRemove.includes(item.type))
                );
                const remaining = viewerInstance.toolbarItems.map(i => i.type);
                console.log('Removed:', typesToRemove, 'Remaining:', remaining);
                showInfo('Toolbar updated');
                return { success: true, currentItems: remaining };
              };

              window.setToolbarToOnlyTypes = function(allowedTypes) {
                if (!viewerInstance) {
                  console.warn('Viewer instance not ready yet.');
                  return { success: false, error: 'No document loaded' };
                }
                const typesToKeep = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
                viewerInstance.setToolbarItems((items) =>
                  items.filter((item) => typesToKeep.includes(item.type))
                );
                const remaining = viewerInstance.toolbarItems.map(i => i.type);
                console.log('Set toolbar to only:', typesToKeep, 'Result:', remaining);
                showInfo('Toolbar updated');
                return { success: true, currentItems: remaining };
              };

              window.addToolbarItemsByType = function(addTypes, insertIndex = null) {
                if (!viewerInstance) {
                  console.warn('Viewer instance not ready yet.');
                  return { success: false, error: 'No document loaded' };
                }
                const typesToAdd = Array.isArray(addTypes) ? addTypes : [addTypes];
                viewerInstance.setToolbarItems((items) => {
                  const existingTypes = items.map(i => i.type);
                  const newItems = typesToAdd
                    .filter(type => !existingTypes.includes(type))
                    .map(type => ({ type }));
                  
                  if (insertIndex !== null && insertIndex >= 0 && insertIndex <= items.length) {
                    return [...items.slice(0, insertIndex), ...newItems, ...items.slice(insertIndex)];
                  }
                  return [...items, ...newItems];
                });
                const current = viewerInstance.toolbarItems.map(i => i.type);
                console.log('Added:', typesToAdd, 'Current:', current);
                showInfo('Toolbar updated');
                return { success: true, currentItems: current };
              };

              window.resetToolbarToDefaults = function() {
                if (!viewerInstance || !window.PSPDFKit) {
                  console.warn('Viewer or SDK not ready yet.');
                  return { success: false, error: 'Viewer not ready' };
                }
                const defaultItems = window.PSPDFKit.defaultToolbarItems;
                viewerInstance.setToolbarItems(defaultItems);
                const current = viewerInstance.toolbarItems.map(i => i.type);
                console.log('Reset toolbar to defaults:', current);
                showInfo('Toolbar reset to defaults');
                return { success: true, currentItems: current };
              };

              window.getToolbarItems = function() {
                if (!viewerInstance) {
                  return [];
                }
                return viewerInstance.toolbarItems.map(item => item.type);
              };

              // ========== END TOOLBAR HELPERS ==========

              // Event listeners - YOUR ORIGINAL
              navbarBtn.addEventListener('click', () => {
                if (viewerReady) {
                  fileInput.click();
                } else {
                  showError('Please wait for the viewer to finish loading.');
                }
              });

              uploadArea.addEventListener('click', () => {
                if (viewerReady) {
                  fileInput.click();
                } else {
                  showError('Please wait for the viewer to finish loading.');
                }
              });
              
              fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                  loadDocument(file);
                  e.target.value = '';
                }
              });

              uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.add('drag-over');
              });

              uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('drag-over');
              });

              uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) loadDocument(file);
              });

              document.addEventListener('dragover', (e) => e.preventDefault());
              document.addEventListener('drop', (e) => e.preventDefault());

              initializeViewer();
            })();
          </script>
        </body>
      </html>
    `,
    description: "Upload and view PDF documents with full annotation support",
    widgetDomain: "https://cdn.cloud.pspdfkit.com",
  };

  // Register resources
  // Apps SDK Requirement: Widget HTML served via registerResource with "text/html+skybridge"
  // and referenced via _meta["openai/outputTemplate"] from tool responses
  server.registerResource(
    "demo-viewer-widget",
    demoViewerWidget.templateUri,
    {
      title: demoViewerWidget.title,
      description: demoViewerWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": demoViewerWidget.description,
        "openai/widgetPrefersBorder": false,
      },
    },
    async (uri: any) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${demoViewerWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": demoViewerWidget.description,
            "openai/widgetPrefersBorder": false,
            "openai/widgetDomain": demoViewerWidget.widgetDomain,
          },
        },
      ],
    })
  );

  timing = logTiming("Registered demo-viewer-widget resource", timing);

  server.registerResource(
    "pdf-upload-widget",
    pdfUploadWidget.templateUri,
    {
      title: pdfUploadWidget.title,
      description: pdfUploadWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": pdfUploadWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": "https://cdn.cloud.pspdfkit.com",
        "openai/widgetCSP": {
          connect_domains: [
            "https://cdn.cloud.pspdfkit.com",
            "https://*.pspdfkit.com",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
            baseURL,
            "blob:",
          ],
          resource_domains: [
            "https://cdn.cloud.pspdfkit.com",
            "https://*.pspdfkit.com",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
            baseURL,
            "blob:",
          ],
        },
      },
    },
    async (uri: any) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: pdfUploadWidget.html,
          _meta: {
            "openai/widgetDescription": pdfUploadWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": "https://cdn.cloud.pspdfkit.com",
            "openai/widgetCSP": {
              connect_domains: [
                "https://cdn.cloud.pspdfkit.com",
                "https://*.pspdfkit.com",
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com",
                baseURL,
                "blob:",
              ],
              resource_domains: [
                "https://cdn.cloud.pspdfkit.com",
                "https://*.pspdfkit.com",
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com",
                baseURL,
                "blob:",
              ],
            },
          },
        },
      ],
    })
  );

  timing = logTiming("Registered pdf-upload-widget resource", timing);

  // Register global tool widget resource
  server.registerResource(
    "global-tool-widget",
    globalToolWidget.templateUri,
    {
      title: globalToolWidget.title,
      description: globalToolWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": globalToolWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": "https://cdn.cloud.pspdfkit.com",
      },
    },
    async (uri: any) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: globalToolWidget.html,
          _meta: {
            "openai/widgetDescription": globalToolWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": "https://cdn.cloud.pspdfkit.com",
          },
        },
      ],
    })
  );

  timing = logTiming("Registered global-tool-widget resource", timing);

  // PRIMARY TOOL: PDF Upload & Viewer (registered first)
  server.registerTool(
    pdfUploadWidget.id,
    {
      title: pdfUploadWidget.title,
      description: "PRIMARY - Opens PDF viewer with upload capability. Use this by default for opening the app, viewing PDFs, or any document tasks. Supports PDF, Office documents (Word, Excel, PowerPoint), and images (PNG, JPG, TIFF).",
      inputSchema: {
        message: z.string().optional().describe("Optional message to display"),
      },
      _meta: widgetMeta(pdfUploadWidget),
    },
    async (args: { message?: string }) => {
      const toolStart = Date.now();
      const { message } = args;
      const result = {
        content: [{
          type: "text",
          text: message || "PDF viewer is ready! You can now upload and view documents. Click the upload button or drag and drop files.",
        }],
        structuredContent: {
          viewerReady: true,
          supportedFormats: ["PDF", "Word", "Excel", "PowerPoint", "Images"],
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(pdfUploadWidget),
      };
      console.log(`[MCP Tool] upload_pdf_viewer executed in ${Date.now() - toolStart}ms`);
      return result;
    }
  );

  timing = logTiming("Registered upload_pdf_viewer tool", timing);

  // SECONDARY TOOL: Demo Viewer (only when explicitly asked)
  server.registerTool(
    demoViewerWidget.id,
    {
      title: demoViewerWidget.title,
      description: "Basic demo viewer - ONLY use when user explicitly asks for 'demo viewer' or 'demo view'. For all other requests use upload_pdf_viewer.",
      inputSchema: {},
      _meta: widgetMeta(demoViewerWidget),
    },
    async () => {
      const toolStart = Date.now();
      const result = {
        content: [{
          type: "text",
          text: "Opening demo viewer. Note: For full features including theme switching, use the PDF Upload Viewer instead.",
        }],
        structuredContent: {
          action: "demo_viewer",
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(demoViewerWidget),
      };
      console.log(`[MCP Tool] demo_viewer executed in ${Date.now() - toolStart}ms`);
      return result;
    }
  );

  timing = logTiming("Registered demo_viewer tool", timing);

  // ========== TOOLBAR CUSTOMIZATION TOOL (UNCHANGED) ==========
  server.registerTool(
    "customize_toolbar",
    {
      title: "Customize PDF Viewer Toolbar",
      description: `Customize the toolbar in the PDF viewer. 

Actions:
- remove: Remove specific tools from toolbar
- keep_only: Keep ONLY specified tools, remove everything else  
- add: Add tools to toolbar
- reset: Reset toolbar to defaults
- get: Get current toolbar items

Tool names (use exact names or aliases):
- sidebar-thumbnails (or: thumbnail, thumbnails)
- export-pdf (or: download, export, save)
- search (or: find)
- document-crop (or: crop)
- print
- signature (or: sign)
- zoom-in, zoom-out, zoom-mode
- annotate, ink, highlighter, text-highlighter
- note, text, line, arrow, rectangle, ellipse
- pager, pan, document-editor

Example: To keep only thumbnails and download, use action "keep_only" with tools ["sidebar-thumbnails", "export-pdf"]`,
      inputSchema: {
        action: z.enum(["remove", "keep_only", "add", "reset", "get"]).describe("The action to perform"),
        tools: z.array(z.string()).optional().describe("Tool types to modify. Not needed for reset/get."),
      },
      _meta: widgetMeta(pdfUploadWidget),
    },
    async (args: { action: "remove" | "keep_only" | "add" | "reset" | "get"; tools?: string[] }) => {
      const toolStart = Date.now();
      const { action, tools } = args;

      // Normalize tool names/aliases to actual PSPDFKit toolbar item `type` values.
      const normalizedTools = (tools || []).map(normalizeToolName);

      // In the ChatGPT App SDK template, tools cannot execute JS inside the widget iframe.
      // Instead, we return a structured payload that the widget reads from `window.openai.toolOutput`
      // and applies to the live PSPDFKit instance.
      const result = {
        content: [{
          type: "text",
          text: `Toolbar update: ${action}${normalizedTools.length ? ` [${normalizedTools.join(", ")}]` : ""}`,
        }],
        structuredContent: {
          toolbar: {
            action,
            tools: normalizedTools,
          },
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(pdfUploadWidget),
      };

      console.log(`[MCP Tool] customize_toolbar executed in ${Date.now() - toolStart}ms`);
      return result;
    }
  );

  timing = logTiming("Registered customize_toolbar tool", timing);

  // ========== SELECT TOOL (UNCHANGED) ==========
  // Returns an intent payload that the widget applies by setting ViewState.interactionMode.
  server.registerTool(
    "select_tool",
    {
      title: "Select tool in Nutrient viewer",
      description:
        "Selects/activates a tool (interaction mode) in the Nutrient Web SDK viewer and keeps it selected.",
      inputSchema: {
        tool: z.string().describe(
          "Tool key to select. Example: text, ink, rectangle, ellipse, pan, search, marqueeZoom, note, inkEraser, line, polygon, polyline, redactText, redactRectangle, documentCrop, documentEditor, formCreator, measurement, none"
        ),
        keepSelectedTool: z
          .boolean()
          .optional()
          .describe("Whether to keep the tool active after creating annotations."),
      },
      _meta: widgetMeta(pdfUploadWidget),
    },
    async (args: { tool: string; keepSelectedTool?: boolean }) => {
      const toolStart = Date.now();
      const { tool, keepSelectedTool } = args;
      const normalize = (s: string) => (s ?? "").trim().toLowerCase();

      // Synonyms -> canonical keys (match the widget's __MODE_MAP keys)
      const TOOL_SYNONYMS: Record<string, string> = {
        // navigation
        hand: "pan",
        move: "pan",
        pan: "pan",
        "marquee zoom": "marqueeZoom",
        marqueezoom: "marqueeZoom",
        zoom: "marqueeZoom",

        // annotation basics
        text: "text",
        freetext: "text",
        "free text": "text",
        note: "note",
        comment: "note",
        sticky: "note",
        ink: "ink",
        pen: "ink",
        draw: "ink",
        eraser: "inkEraser",
        "ink eraser": "inkEraser",
        inkeraser: "inkEraser",

        line: "line",
        rectangle: "rectangle",
        rect: "rectangle",
        box: "rectangle",
        ellipse: "ellipse",
        circle: "ellipse",
        polygon: "polygon",
        polyline: "polyline",

        // search
        search: "search",
        find: "search",

        // crop / editor
        crop: "documentCrop",
        "document crop": "documentCrop",
        documentcrop: "documentCrop",
        editor: "documentEditor",
        "document editor": "documentEditor",
        documenteditor: "documentEditor",

        // redaction
        redact: "redactText",
        "redact text": "redactText",
        redacttext: "redactText",
        "redact rectangle": "redactRectangle",
        redactrectangle: "redactRectangle",

        // forms / measurement
        form: "formCreator",
        "form creator": "formCreator",
        formcreator: "formCreator",
        measure: "measurement",
        measurement: "measurement",

        // reset
        none: "none",
        clear: "none",
        reset: "none",
      };

      const key = TOOL_SYNONYMS[normalize(tool)] ?? normalize(tool);
      const keep = keepSelectedTool !== false;

      const result = {
        content: [
          {
            type: "text",
            text: key === "none" ? "Clearing selected tool." : `Selecting tool: ${key}`,
          },
        ],
        structuredContent: {
          // Keep the same shape as customize_toolbar: top-level key that the widget polls
          selectTool: {
            toolKey: key,
            keepSelectedTool: keep,
          },
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(pdfUploadWidget),
      };

      console.log(`[MCP Tool] select_tool executed in ${Date.now() - toolStart}ms`);
      return result;
    }
  );

  timing = logTiming("Registered select_tool", timing);

  // ========== GLOBAL TOOL (POC ORCHESTRATOR) - UPDATED ==========
  server.registerTool(
    "global_tool",
    {
      title: "Global Tool - Orchestrator",
      description: "Processes user requests through the PromptOrchestrator backend. Takes the full user message, creates an enhanced prompt, calls LLM API (Claude/OpenAI), and returns all values including a live viewer in the widget.",
      inputSchema: {
        user_prompt: z.string().describe("The full user message verbatim (100% of what the user typed)"),
      },
      _meta: widgetMeta(globalToolWidget),
    },
    async (args: { user_prompt: string }) => {
      // IMPORTANT: This handler executes ONLY when the tool is called by ChatGPT,
      // NOT during MCP initialization. This ensures /mcp responds quickly.
      const toolStart = Date.now();
      const { user_prompt } = args;

      try {
        // Call the PromptOrchestrator backend module (slow: 5-30s LLM API call)
        // This is OK here because we're inside a tool handler, not MCP init
        console.log(`[MCP Tool] global_tool starting PromptOrchestrator for prompt: "${user_prompt.substring(0, 50)}..."`);
        const orchestratorStart = Date.now();
        const result = await PromptOrchestrator({ user_prompt });
        console.log(`[MCP Tool] PromptOrchestrator completed in ${Date.now() - orchestratorStart}ms`);

        const errorMsg = result.errors.length > 0 ? `⚠️ Errors: ${result.errors.join("; ")}` : "";
        const warningMsg = result.warnings?.length ? `⚠️ Warnings: ${result.warnings.join("; ")}` : "";
        const statusLines = [errorMsg, warningMsg].filter(Boolean).join("\n\n");

        console.log(`[MCP Tool] global_tool total execution: ${Date.now() - toolStart}ms`);

        return {
          content: [
            {
              type: "text",
              text: `✅ Processed request using ${result.provider} (${result.model_used})\n\n📝 User prompt: "${user_prompt}"\n\n${statusLines || "✨ Response generated successfully"}`,
            },
          ],
          structuredContent: {
            global_tool: {
              user_prompt: result.user_prompt,
              enhanced_prompt: result.enhanced_prompt,
              provider: result.provider,
              model_requested: result.model_requested,
              model_used: result.model_used,
              response_text: result.response_text,
              response_html: result.response_html,
              errors: result.errors,
              available_models: result.available_models,
              warnings: result.warnings,
            },
            timestamp: new Date().toISOString(),
          },
          _meta: widgetMeta(globalToolWidget),
        };
      } catch (error) {
        console.error(`[MCP Tool] global_tool error after ${Date.now() - toolStart}ms:`, error);

        const errorMsg = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: `❌ Error processing request: ${errorMsg}`,
            },
          ],
          structuredContent: {
            global_tool: {
              user_prompt,
              enhanced_prompt: "Error: Could not process prompt",
              provider: "unknown" as "anthropic" | "openai",
              model_requested: "N/A",
              model_used: "N/A",
              response_text: errorMsg,
              response_html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Error</title><style>body{font-family:sans-serif;padding:24px;background:#1a1414;color:#fff;}h2{color:#ef4444;}</style></head><body><h2>⚠️ Error</h2><p>${errorMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></body></html>`,
              errors: [errorMsg],
              warnings: [],
            },
            timestamp: new Date().toISOString(),
          },
          _meta: widgetMeta(globalToolWidget),
        };
      }
    }
  );

  timing = logTiming("Registered global_tool", timing);

  // Final timing: Total MCP initialization time
  const totalTime = Date.now() - startTime;
  console.log(`[MCP Init] ✅ COMPLETE - Total initialization: ${totalTime}ms`);

  if (totalTime > 1000) {
    console.warn(`[MCP Init] ⚠️  WARNING: MCP init took ${totalTime}ms (>1s). ChatGPT expects fast responses for action reload.`);
  }
});

export const GET = handler;
export const POST = handler;