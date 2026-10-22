import React from "react";
import SlAvatar from "@shoelace-style/shoelace/dist/react/avatar/index.js";
import { initials } from "../../catalog-tools.js";
export default function UserAvatar({ user, ...props }) {
  return (
    <SlAvatar
      image={user.avatarUrl || ""}
      initials={initials(user)}
      label={user.name}
      {...props}
    />
  );
}
