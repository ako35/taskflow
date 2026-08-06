import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    position: "fixed",
    top: -9999,
    left: -9999,
    transform: "translateX(-50%)",
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
  });

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
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
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;
      const viewportPadding = 8;
      const menuWidth = Math.ceil(Math.max(triggerRect.width, 144));
      const maxMenuHeight = Math.max(140, viewportHeight - viewportPadding * 2);
      const measuredMenuHeight = Math.ceil(menuRect.height);
      const effectiveMenuHeight = Math.min(measuredMenuHeight, maxMenuHeight);
      const requiredSpace = Math.ceil(menuRect.height) + 12;
      const availableBelow = viewportHeight - triggerRect.bottom;
      const availableAbove = triggerRect.top;
      const openUpward =
        availableBelow < requiredSpace && availableAbove > availableBelow;
      const requestedTop = openUpward
        ? Math.max(8, triggerRect.top - menuRect.height - 6)
        : triggerRect.bottom + 6;
      const minTop = viewportPadding;
      const maxTop = Math.max(
        viewportPadding,
        viewportHeight - effectiveMenuHeight - viewportPadding,
      );
      const top = Math.min(Math.max(requestedTop, minTop), maxTop);
      const requestedLeft = triggerRect.left + triggerRect.width / 2;
      const minLeft = viewportPadding + menuWidth / 2;
      const maxLeft = Math.max(
        minLeft,
        viewportWidth - viewportPadding - menuWidth / 2,
      );
      const left = Math.min(Math.max(requestedLeft, minLeft), maxLeft);

      setMenuStyle({
        position: "fixed",
        top: Math.round(top),
        left: Math.round(left),
        width: menuWidth,
        maxHeight: maxMenuHeight,
        overflowY: "auto",
        transform: "translateX(-50%)",
        zIndex: 2600,
        opacity: 1,
        visibility: "visible",
        pointerEvents: "auto",
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

  const menu = (
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
  );

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
      {typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : menu}
    </div>
  );
}
