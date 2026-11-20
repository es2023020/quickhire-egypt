/**
 * Safe document viewing and downloading utilities for QuickHire Egypt.
 * Resolves browser restrictions on data: URLs (such as Chrome's 'Not allowed to navigate top-level to data URI').
 */

export function openDocumentSafely(urlOrData: string, filename = "candidate-cv.pdf") {
  if (!urlOrData) return;

  if (urlOrData.startsWith("data:")) {
    try {
      const parts = urlOrData.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "application/pdf";
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, "_blank");
      if (!win) {
        // Pop-up blocker fallback: trigger download
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    } catch (e) {
      console.warn("Failed to convert data URL to blob", e);
    }
  }

  window.open(urlOrData, "_blank");
}

export function downloadDocumentSafely(urlOrData: string, filename = "candidate-cv.pdf") {
  if (!urlOrData) return;

  if (urlOrData.startsWith("data:")) {
    try {
      const parts = urlOrData.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "application/pdf";
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    } catch (e) {
      console.warn("Failed to convert data URL to blob for download", e);
    }
  }

  const a = document.createElement("a");
  a.href = urlOrData;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
