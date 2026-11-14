import { toPng } from "html-to-image";

/**
 * Exports what is currently visible on the ReactFlow canvas as a high-resolution PNG image.
 * Excludes floating UI overlays like toolbars, guides, and search bars.
 */
export async function exportCurrentBoardAsImage(familyName?: string): Promise<void> {
  const flowElement = document.querySelector(".react-flow") as HTMLElement;
  if (!flowElement) {
    throw new Error("Elemen kanvas silsilah tidak ditemukan.");
  }

  const isExcluded = (node: HTMLElement) => {
    if (!node || !node.classList) return false;
    return (
      node.classList.contains("canvas-dock") ||
      node.classList.contains("relation-guide-group") ||
      node.classList.contains("relation-guide") ||
      node.classList.contains("board-export-trigger") ||
      node.classList.contains("react-flow__minimap") ||
      node.classList.contains("react-flow__panel") ||
      node.classList.contains("family-search-container") ||
      node.classList.contains("board-header")
    );
  };

  const dataUrl = await toPng(flowElement, {
    backgroundColor: "#f4f4f5",
    filter: (node) => !isExcluded(node as HTMLElement),
    pixelRatio: 2, // 2x high-resolution crisp export
    cacheBust: true,
  });

  const link = document.createElement("a");
  const baseName = (familyName || "silsilah_keluarga")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");
  const timestamp = new Date().toISOString().slice(0, 10);
  link.download = `${baseName || "silsilah"}_kanvas_${timestamp}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
