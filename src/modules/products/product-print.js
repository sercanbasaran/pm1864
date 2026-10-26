// Expand native Shoelace details for printing, then restore the reader's view.
export function setupProductPrint(root) {
  let snapshot = null;
  const prepare = () => {
    if (!snapshot)
      snapshot = [...root.querySelectorAll("sl-details")].map((node) => [
        node,
        node.open,
      ]);
    snapshot.forEach(([node]) => {
      node.open = true;
    });
  };
  const restore = () => {
    snapshot?.forEach(([node, open]) => {
      node.open = open;
    });
    snapshot = null;
  };
  window.addEventListener("beforeprint", prepare);
  window.addEventListener("afterprint", restore);
  return {
    async print() {
      prepare();
      try {
        await Promise.all(
          [...root.querySelectorAll("sl-details")].map(
            (node) => node.updateComplete,
          ),
        );
        await document.fonts?.ready;
        await Promise.all(
          [...root.querySelectorAll("img")].map((img) =>
            img.decode?.().catch(() => {}),
          ),
        );
        window.print();
      } finally {
        restore();
      }
    },
    dispose() {
      restore();
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
    },
  };
}
