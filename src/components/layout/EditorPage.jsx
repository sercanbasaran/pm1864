import React, { useEffect, useRef } from "react";
import SlCard from "@shoelace-style/shoelace/dist/react/card/index.js";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "../ui/Controls.jsx";
export default function EditorPage({ title, onClose, busy = false, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <section role="region" aria-label={title} className="editor-page">
      <SlCard className="editor-card">
        <div slot="header" className="page-editor-header">
          <h2 ref={ref} tabIndex={-1}>
            {title}
          </h2>
          <Button type="button" disabled={busy} onClick={onClose}>
            <ArrowLeft size={18} />
            Listeye dön
          </Button>
        </div>
        {children}
      </SlCard>
    </section>
  );
}
