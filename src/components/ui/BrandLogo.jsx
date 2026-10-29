import {imageUrl} from "../../image-sizes.js";
import React from "react";
export default function BrandLogo({ className = "", ...props }) {
  return (
    <img
      src={imageUrl("/logo.png","tile")}
      width={338} height={480} decoding="async"
      alt="Hafız Mustafa 1864"
      className={className}
      {...props}
    />
  );
}
