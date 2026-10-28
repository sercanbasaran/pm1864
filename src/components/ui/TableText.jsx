import React from "react";

// Keep the complete value available to assistive technology and on hover.
export default function TableText({ value }) {
  const text = String(value ?? "");
  const characters = Array.from(text);
  if (characters.length <= 30) return text;
  return <span title={text} aria-label={text}>{characters.slice(0, 30).join("")}…</span>;
}
