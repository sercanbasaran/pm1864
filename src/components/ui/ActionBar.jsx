import React from "react";
export default function ActionBar({ position = "top", children }) {
  if (!children) return null;
  return (
    <div
      className={"card-action-bar card-action-" + position}
      role="group"
      aria-label={position === "top" ? "Üst aksiyonlar" : "Alt aksiyonlar"}
    >
      {children}
    </div>
  );
}
