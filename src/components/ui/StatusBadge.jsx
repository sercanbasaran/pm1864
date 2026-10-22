import React from "react";
import SlBadge from "@shoelace-style/shoelace/dist/react/badge/index.js";
export default function StatusBadge({ status }) {
  return (
    <SlBadge variant={status === "Aktif" ? "success" : "neutral"}>
      {status}
    </SlBadge>
  );
}
