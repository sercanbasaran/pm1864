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
      ) : type === "chocolate" ? (
        <g transform="rotate(-12 24 24)">
          <rect
            x="9"
            y="5"
            width="30"
            height="38"
            rx="3"
            fill="#70432e"
            stroke="#442719"
            strokeWidth="2"
          />
          <path
            d="M24 7v34M11 18h26M11 30h26"
            stroke="#bd8b62"
            strokeWidth="2"
          />
        </g>
      ) : type === "strawberry" ? (
        <>
          <path
            d="M8 20C8 8 40 8 40 20c0 12-12 24-16 24S8 32 8 20Z"
            fill="#d74649"
            stroke="#a12d36"
            strokeWidth="1.5"
          />
          <path d="m24 16-12-7 10 1 3-7 3 7 10-1-12 8" fill="#648e42" />
          <path
            d="m16 23 1 3m13-3 1 3m-7 6 1 3m-3-14 1 3"
            stroke="#ffe3a0"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : type === "banana" ? (
        <>
          <path
            d="M9 10c1 19 12 29 29 17-6 17-28 20-33 1C3 22 4 15 9 10Z"
            fill="#f4cf50"
            stroke="#bd9230"
            strokeWidth="2"
          />
          <path
            d="M9 14c3 17 13 22 26 16"
            fill="none"
            stroke="#ffe990"
            strokeWidth="3"
          />
          <path
            d="m8 11 2-6m27 23 4-4"
            stroke="#796037"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : type === "raspberry" ? (
        <>
          <path d="m24 14-12-5 9-1 3-5 4 5 9 1-12 5" fill="#648e42" />
          {[
            [17, 17],
            [29, 17],
            [12, 25],
            [24, 25],
            [36, 25],
            [18, 33],
            [30, 33],
            [24, 40],
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="6"
              fill="#cf456c"
              stroke="#a42952"
              strokeWidth="1.5"
            />
          ))}
        </>
      ) : type === "mixed-fruit" ? (
        <>
          <circle
            cx="15"
            cy="28"
            r="11"
            fill="#e79636"
            stroke="#b97527"
            strokeWidth="1.5"
          />
          <path
            d="M22 25c0-8 20-8 20 0 0 9-8 17-10 17s-10-8-10-17Z"
            fill="#d74649"
            stroke="#a12d36"
            strokeWidth="1.5"
          />
          <path
            d="m32 23-8-7 7 1 2-6 3 6 7-1-9 7M14 17c-1-8 8-11 12-8-2 6-6 9-12 8"
            fill="#648e42"
          />
          <circle cx="13" cy="36" r="5" fill="#755399" />
          <circle cx="21" cy="39" r="5" fill="#8862aa" />
        </>
      ) : type === "cherry" ? (
        <>
          <path
            d="M16 29C17 16 29 13 30 4c0 13 9 17 7 25"
            fill="none"
            stroke="#63833b"
            strokeWidth="2.5"
          />
          <path d="M30 7c9-5 15 0 15 0s-5 7-15 0" fill="#7c9f42" />
          <circle
            cx="15"
            cy="33"
            r="10"
            fill="#9e2344"
            stroke="#701530"
            strokeWidth="1.5"
          />
          <circle
            cx="35"
            cy="35"
            r="9"
            fill="#bd3151"
            stroke="#701530"
            strokeWidth="1.5"
          />
          <path
            d="M11 29l2-2m18 4 2-2"
            stroke="#ec93aa"
            strokeWidth="2.5"
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
  label,
  showTypeSelector = true,
  radioName = "satiety-level",
  compact = false,
}) {
  const type = value?.type || suggestedType;
  const level = value?.level || null;
  const metric =
    (label
      ? label + " yoğunluğu"
      : satietyTypes.find((item) => item.value === type)?.metric) ||
    "Doygunluk seviyesi";
  if (!editing && !hasSatiety(value)) return null;
  const icons = (compact ? [1] : [1, 2, 3, 4, 5]).map((number) => (
    <span
      key={number}
      className={"satiety-icon" + (number <= level ? " is-filled" : "")}
    >
      <NutIcon type={type} />
    </span>
  ));
  return (
    <div className="satiety-information">
      {editing && showTypeSelector && (
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
                  name={radioName}
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
          {!compact && (
            <span className="satiety-metric" aria-hidden="true">
              {metric}
            </span>
          )}
          <span className="satiety-icons" aria-hidden="true">
            {icons}
          </span>
        </div>
      )}
      {!compact && (
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
      )}
      {editing && (
        <p className="satiety-hint">
          1: Çok hafif · 5: Çok yoğun. Ürünleri karşılaştırmak için kullanılan
          beş seviyeli bir ölçektir; içerik yüzdesi değildir.
        </p>
      )}
    </div>
  );
}
