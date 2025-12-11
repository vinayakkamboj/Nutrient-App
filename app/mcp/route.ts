import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

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

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  // OpenSDK Tool Widget
  const openSDKWidget: ContentWidget = {
    id: "open_sdk",
    title: "Open Nutrient SDK",
    templateUri: "ui://widget/nutrient-sdk-viewer.html",
    invoking: "Opening Nutrient SDK...",
    invoked: "Nutrient SDK opened successfully",
    html: html,
    description: "Opens the Nutrient SDK interface",
    widgetDomain: baseURL,
  };

  // PDF Upload widget - FIXED VERSION
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
            .upload-btn {
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
            .upload-btn:hover { background: #e5e5e5; }
            .upload-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
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
              <img src="${baseURL}/logo.png" alt="Nutrient" class="navbar-logo" onerror="this.style.display='none'">
              <span class="navbar-title">Nutrient</span>
            </div>
            <div class="navbar-right">
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
                <li>All processing in browser (no upload to server)</li>
              </ul>
            </div>
          </div>

          <div id="error" class="error hidden"></div>
          <div id="info" class="info hidden"></div>
          <div id="viewer" class="viewer-container"></div>

          <!-- Updated SDK URL - using correct version -->
          <script src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@2024.7.0/pspdfkit.js"></script>
          
          <script>
            (function() {
              let viewerInstance = null;
              let viewerReady = false;
              const uploadArea = document.getElementById('upload-area');
              const fileInput = document.getElementById('file-input');
              const navbarBtn = document.getElementById('navbar-upload-btn');
              const errorDiv = document.getElementById('error');
              const infoDiv = document.getElementById('info');
              const loadingDiv = document.getElementById('loading');
              const viewerDiv = document.getElementById('viewer');
              const uploadSection = document.getElementById('upload-section');

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

              // Wait for PSPDFKit to load
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

              // Initialize viewer
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

                try {
                  console.log('Loading file:', file.name, 'Type:', file.type, 'Size:', file.size);

                  // Unload previous instance if exists
                  if (viewerInstance) {
                    await window.PSPDFKit.unload(viewerDiv);
                    viewerInstance = null;
                  }

                  // Create blob URL
                  const fileUrl = URL.createObjectURL(file);
                  console.log('Created blob URL:', fileUrl);

                  // Load document
                  viewerInstance = await window.PSPDFKit.load({
                    container: viewerDiv,
                    document: fileUrl,
                    baseUrl: "https://cdn.cloud.pspdfkit.com/pspdfkit-web@2024.7.0/",
                  });

                  console.log('Document loaded successfully');
                  
                  // Hide upload section and show viewer
                  uploadSection.style.display = 'none';
                  viewerDiv.classList.add('active');
                  showInfo(\`Loaded: \${file.name}\`);
                  
                  // Clean up blob URL after a delay
                  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
                } catch (error) {
                  console.error('Load error:', error);
                  showError(\`Failed to load \${file.name}. Error: \${error.message}\`);
                  
                  // Show upload section again on error
                  uploadSection.style.display = 'block';
                  viewerDiv.classList.remove('active');
                } finally {
                  showLoading(false);
                  navbarBtn.disabled = false;
                }
              }

              // Event listeners
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
                  e.target.value = ''; // Reset input
                }
              });

              // Drag and drop
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

              // Prevent default drag/drop on document
              document.addEventListener('dragover', (e) => e.preventDefault());
              document.addEventListener('drop', (e) => e.preventDefault());

              // Initialize on load
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
  server.registerResource(
    "open-sdk-widget",
    openSDKWidget.templateUri,
    {
      title: openSDKWidget.title,
      description: openSDKWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": openSDKWidget.description,
        "openai/widgetPrefersBorder": false,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${openSDKWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": openSDKWidget.description,
            "openai/widgetPrefersBorder": false,
            "openai/widgetDomain": openSDKWidget.widgetDomain,
          },
        },
      ],
    })
  );

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
    async (uri) => ({
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

  // Register tools
  server.registerTool(
    openSDKWidget.id,
    {
      title: openSDKWidget.title,
      description: "Opens the Nutrient SDK main interface",
      inputSchema: {},
      _meta: widgetMeta(openSDKWidget),
    },
    async () => {
      return {
        content: [{
          type: "text",
          text: "Opening Nutrient SDK. You can now view and upload documents.",
        }],
        structuredContent: {
          action: "open_sdk",
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(openSDKWidget),
      };
    }
  );

  server.registerTool(
    pdfUploadWidget.id,
    {
      title: pdfUploadWidget.title,
      description: "Opens PDF viewer with upload capability. Supports PDF, Office documents (Word, Excel, PowerPoint), and images (PNG, JPG, TIFF).",
      inputSchema: {
        message: z.string().optional().describe("Optional message to display"),
      },
      _meta: widgetMeta(pdfUploadWidget),
    },
    async ({ message }) => {
      return {
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
    }
  );
});

export const GET = handler;
export const POST = handler;