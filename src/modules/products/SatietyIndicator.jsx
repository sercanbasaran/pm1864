import React from "react";
import { Button, Select } from "../../components/ui/Controls.jsx";
import { hasSatiety, satietyTypes, satietyLevels } from "../../satiety.js";
import "./satiety.css";

function NutIcon({ type }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {type === "pistachio" ? (
        <>
          <path
            d="M24 4C8 8 4 29 14 40c5 6 12 6 19 0C45 29 40 9 24 4Z"
            fill="#d7bb82"
            stroke="#967148"
            strokeWidth="1.5"
          />
          <path
            d="M24 8C17 16 13 29 20 39c4 4 9 0 12-6 5-10 1-20-8-25Z"
            fill="#77933c"
          />
          <path
            d="M24 7c-5 12-5 24-3 34M24 7c9 10 10 21 5 32"
            fill="none"
            stroke="#f3e4bf"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M23 15c-2 7-1 15 1 20"
            fill="none"
            stroke="#abc05b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : type === "walnut" ? (
        <>
          <path
            d="M24 5C12 4 5 14 6 26c0 11 8 18 18 18s18-7 18-18C43 14 36 4 24 5Z"
            fill="#ba8349"
            stroke="#80502a"
            strokeWidth="1.5"
          />
          <path
            d="M24 7c-4 10 4 19 0 35M16 10l-4 8 5 7-5 7 6 7M32 10l4 8-5 7 5 7-6 7M10 21l7-2M31 19l7 2M17 32l5-3M26 29l5 3"
            fill="none"
            stroke="#7d4e2d"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 9c-5 0-9 6-9 12M29 9c5 0 9 6 9 12"
            fill="none"
            stroke="#e3b67d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <circle
          cx="24"
          cy="24"
          r="16"
          fill="#cba052"
          stroke="#9b7535"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

export default function SatietyIndicator({
  value,
  editing = false,
  suggestedType = "general",
  onChange,
}) {
  const type = value?.type || suggestedType;
  const level = value?.level || null;
  const metric =
    satietyTypes.find((item) => item.value === type)?.metric ||
    "Doygunluk seviyesi";
  if (!editing && !hasSatiety(value)) return null;
  const icons = [1, 2, 3, 4, 5].map((number) => (
    <span
      key={number}
      className={"satiety-icon" + (number <= level ? " is-filled" : "")}
    >
      <NutIcon type={type} />
    </span>
  ));
  return (
    <div className="satiety-information">
      {editing && (
        <Select
          label="Doygunluk gösterimi"
          value={type}
          onChange={(e) => onChange({ type: e.target.value, level })}
        >
          {satietyTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      )}
      {editing ? (
        <fieldset className="satiety-picker">
          <legend>{metric}</legend>
          <div className="satiety-options">
            {icons.map((icon, index) => (
              <label className="satiety-option" key={index}>
                <input
                  type="radio"
                  name="satiety-level"
                  value={index + 1}
                  checked={level === index + 1}
                  onChange={() => onChange({ type, level: index + 1 })}
                  aria-label={`${index + 1} / 5 · ${satietyLevels[index]}`}
                />
                {icon}
                <span aria-hidden="true">{index + 1}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div
          className="satiety-display"
          role="img"
          aria-label={`${metric}: ${level} / 5 · ${satietyLevels[level - 1]}`}
        >
          <span className="satiety-metric" aria-hidden="true">
            {metric}
          </span>
          <span className="satiety-icons" aria-hidden="true">
            {icons}
          </span>
        </div>
      )}
      <div className="satiety-caption">
        <strong>
          {level
            ? `${level} / 5 · ${satietyLevels[level - 1]}`
            : "Henüz seçilmedi"}
        </strong>
        {editing && level && (
          <Button type="button" size="small" onClick={() => onChange(null)}>
            Seçimi temizle
          </Button>
        )}
      </div>
      {editing && (
        <p className="satiety-hint">
          1: Çok hafif · 5: Çok yoğun. Ürünleri karşılaştırmak için kullanılan
          beş seviyeli bir ölçektir; içerik yüzdesi değildir.
        </p>
      )}
    </div>
  );
}
