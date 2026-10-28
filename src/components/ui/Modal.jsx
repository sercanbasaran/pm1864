import React from "react";
import SlDialog from "@shoelace-style/shoelace/dist/react/dialog/index.js";
export default function Modal({
  title,
  onClose,
  busy = false,
  children,
  wide = false,
  className = "",
}) {
  return (
    <SlDialog
      open
      label={title}
      className={[wide ? "wide-dialog" : "", className].filter(Boolean).join(" ")}
      onSlRequestClose={(e) => {
        if (busy || e.detail.source === "overlay") e.preventDefault();
      }}
      onSlAfterHide={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </SlDialog>
  );
}
