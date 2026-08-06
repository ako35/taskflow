import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    opacity: 0,
  });

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      onCancel();
    };

    document.addEventListener("mousedown", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, [onCancel]);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const triggerElement = triggerRef.current;
      const menuElement = menuRef.current;
      if (!triggerElement || !menuElement) {
        return;
      }

      const triggerRect = triggerElement.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const requiredSpace = Math.ceil(menuRect.height) + 12;
      const availableBelow = viewportHeight - triggerRect.bottom;
      const availableAbove = triggerRect.top;
      const openUpward =
        availableBelow < requiredSpace && availableAbove > availableBelow;
      const top = openUpward
        ? Math.max(8, triggerRect.top - menuRect.height - 6)
        : triggerRect.bottom + 6;

      setMenuStyle({
        position: "fixed",
        top,
        left: triggerRect.left + triggerRect.width / 2,
        width: Math.max(triggerRect.width, 144),
        transform: "translateX(-50%)",
        zIndex: 2600,
        opacity: 1,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [options, value, fallbackValue]);

  return (
    <div className="inline-dropdown" ref={containerRef}>
      <div className="inline-current-value" ref={triggerRef}>
        <button
          type="button"
          className={`inline-option-chip task-badge ${badgeClassName} ${
            getOptionClassName(currentValue) || ""
          } active`}
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
        >
          {currentValue}
        </button>
      </div>
      <div ref={menuRef} className="inline-options-menu" style={menuStyle}>
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
                if (option === currentValue) {
                  onCancel();
                  return;
                }
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
