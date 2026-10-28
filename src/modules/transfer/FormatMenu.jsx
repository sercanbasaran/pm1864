import React from "react";
import SlDropdown from "@shoelace-style/shoelace/dist/react/dropdown/index.js";
import SlMenu from "@shoelace-style/shoelace/dist/react/menu/index.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/react/menu-item/index.js";
import SlButton from "@shoelace-style/shoelace/dist/react/button/index.js";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { formats, formatLabel } from "./transfer.js";
export default function FormatMenu({ direction, onSelect, disabled = false }) {
  const importing = direction === "import";
  return <SlDropdown placement="bottom-end"><SlButton slot="trigger" caret disabled={disabled}>{importing ? <UploadSimple slot="prefix" size={16} /> : <DownloadSimple slot="prefix" size={16} />}{importing ? "İçe aktar" : "Dışa aktar"}</SlButton><SlMenu onSlSelect={event => onSelect(event.detail.item.value)}>{formats.map(format => <SlMenuItem key={format} value={format}>{formatLabel(format)}</SlMenuItem>)}</SlMenu></SlDropdown>;
}
