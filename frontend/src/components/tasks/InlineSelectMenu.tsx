import React from "react";

type InlineSelectMenuProps = {
  value: string;
  fallbackValue: string;
  options: string[];
  getOptionClassName: (option: string) => string;
  badgeClassName: string;
  onSelect: (option: string) => void;
  onCancel: () => void;
};

export default function InlineSelectMenu({
  value,
  fallbackValue,
  options,
  getOptionClassName,
  badgeClassName,
  onSelect,
  onCancel,
}: InlineSelectMenuProps) {
  const currentValue = value || fallbackValue;

  return (
    <div className="inline-dropdown">
      <div className="inline-current-value">
        <button
          type="button"
          className={`inline-option-chip task-badge ${badgeClassName} ${
            getOptionClassName(currentValue) || ""
          } active`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(currentValue);
          }}
        >
          {currentValue}
        </button>
      </div>
      <div className="inline-options-menu">
        <div className="inline-option-stack">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`inline-option-chip task-badge ${badgeClassName} ${
                getOptionClassName(option) || ""
              } ${currentValue === option ? "active" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(option);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onCancel();
                }
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
