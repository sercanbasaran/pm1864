import "./image-drop.css";
import { useState } from "react";

export default function useImageDrop(onFiles, disabled = false) {
  const [dragging, setDragging] = useState(false);
  const isFiles = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");
  return {
    dragging,
    dropProps: {
      onDragOver: (event) => { if (!disabled && isFiles(event)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragging(true); } },
      onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); },
      onDrop: (event) => { if (!isFiles(event)) return; event.preventDefault(); setDragging(false); if (!disabled) onFiles(Array.from(event.dataTransfer.files || [])); },
    },
  };
}
