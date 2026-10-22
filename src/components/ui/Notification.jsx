import React from "react";
import SlAlert from "@shoelace-style/shoelace/dist/react/alert/index.js";
export default function Notification({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="workspace-notification" role="status">
      <SlAlert open closable variant="primary" onSlAfterHide={onClose}>
        {message}
      </SlAlert>
    </div>
  );
}
