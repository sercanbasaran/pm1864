import React from "react";
import SlSwitch from "@shoelace-style/shoelace/dist/react/switch/index.js";
import SlTag from "@shoelace-style/shoelace/dist/react/tag/index.js";
import {
  salesChannels,
  salesAvailability,
  effectiveSales,
} from "../../sales-availability.js";
export function SalesChannelSwitches({ variant, onChange, disabled = false }) {
  const preferences = salesAvailability(
    variant?.salesAvailability,
    undefined,
    true,
  );
  return (
    <div className="sales-controls">
      <h3>Satış kanalları</h3>
      <p>
        Kanallar yalnızca bu varyant için geçerlidir. Pasif varyantların kanal
        tercihleri korunur; satışları kapalıdır.
      </p>
      {salesChannels.map(({ key, label }) => (
        <div key={key} className="sales-switch-row">
          <SlSwitch
            aria-label={label}
            checked={preferences[key]}
            disabled={disabled}
            onSlChange={(e) =>
              onChange({ ...preferences, [key]: e.target.checked })
            }
          >
            {label}
          </SlSwitch>
        </div>
      ))}
    </div>
  );
}
export function SalesChannelSummary({ product, variant }) {
  const values = effectiveSales(product, variant);
  return (
    <div className="sales-summary">
      {salesChannels.map(({ key, label }) => (
        <SlTag
          key={key}
          size="small"
          title={label}
          variant={values[key] ? "success" : "neutral"}
          className={"sales-channel-tag" + (values[key] ? "" : " is-disabled")}
          aria-disabled={values[key] ? "false" : "true"}
          aria-label={label + ": " + (values[key] ? "Etkin" : "Devre dışı")}
        >
          {label}
        </SlTag>
      ))}
    </div>
  );
}
