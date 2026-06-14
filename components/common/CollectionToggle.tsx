"use client";

import { COLLECTIONS, type Collection } from "@/lib/types";

interface CollectionToggleProps {
  value: Collection;
  onChange: (c: Collection) => void;
}

/** Gen2 / Gen3 pill switcher. */
export function CollectionToggle({ value, onChange }: CollectionToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Collection"
      className="inline-flex pixel-border bg-screen"
    >
      {COLLECTIONS.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.id)}
            className={`font-[family-name:var(--font-display)] text-[11px] px-5 py-3 transition-colors ${
              active
                ? "bg-banana text-screen"
                : "bg-transparent text-cream/60 hover:text-cream"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
