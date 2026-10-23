import React from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "./Controls.jsx";

export default function BackToListButton({ busy = false, onClick }) {
  return (
    <Button
      type="button"
      size="small"
      className="editor-back-button"
      disabled={busy}
      onClick={onClick}
    >
      <ArrowLeft size={18} />
      Listeye dön
    </Button>
  );
}
