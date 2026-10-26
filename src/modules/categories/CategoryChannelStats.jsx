import React from "react";

export default function CategoryChannelStats({ channels }) {
  return (
    <div
      className="category-summary-channels"
      role="group"
      aria-label="Satış kanallarında aktif kategoriler"
    >
      {channels.map((channel) => (
        <section
          className="category-channel-summary"
          key={channel.key}
          aria-label={channel.label}
        >
          <h3>{channel.label}</h3>
          <dl>
            <div>
              <dt>Ana kategori</dt>
              <dd>{channel.main}</dd>
            </div>
            <div>
              <dt>Alt kategori</dt>
              <dd>{channel.children}</dd>
            </div>
          </dl>
        </section>
      ))}
    </div>
  );
}
