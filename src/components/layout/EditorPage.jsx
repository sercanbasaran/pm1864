import React from "react";
import SlCard from "@shoelace-style/shoelace/dist/react/card/index.js";
import BackToListButton from "../ui/BackToListButton.jsx";
export default function EditorPage({ title, onClose, busy = false, children }) {
  return (
    <section role="region" aria-label={title} className="editor-page">
      <SlCard className="editor-card">
        <div slot="header" className="page-editor-header">
          <h2>{title}</h2>
          <BackToListButton busy={busy} onClick={onClose} />
        </div>
        {children}
      </SlCard>
    </section>
  );
}
