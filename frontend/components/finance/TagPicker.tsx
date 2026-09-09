"use client";
import { splitIds } from "@/frontend/finance/presentation";
import { type Tag } from "@/shared/finance";
import { type CSSProperties } from "react";
export default function TagPicker({
  tags,
  value,
  onChange,
}: {
  tags: Tag[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(splitIds(value));
  return (
    <div className="field">
      <span>
        Tags <small>(opcional)</small>
      </span>
      <div className="tag-picker">
        {tags.map((tag) => (
          <button
            type="button"
            className={`tag-chip ${selected.has(tag.id) ? "selected" : ""}`}
            style={{ "--tag-color": tag.color } as CSSProperties}
            key={tag.id}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(tag.id)) next.delete(tag.id);
              else next.add(tag.id);
              onChange([...next].join(","));
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
