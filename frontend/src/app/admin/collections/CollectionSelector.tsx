"use client";

import { useId } from "react";
import type { AdminCollection } from "@/lib/api";

type CollectionSelectorProps = {
  collections: AdminCollection[];
  selectedId?: string;
  onChange: (collectionId: string | undefined) => void;
  label?: string;
  disabled?: boolean;
};

export default function CollectionSelector({
  collections,
  selectedId,
  onChange,
  label,
  disabled,
}: CollectionSelectorProps) {
  const id = useId();

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        className="collection-selector"
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
      >
        <option value="">-- Unassigned --</option>
        {collections.map((col) => (
          <option key={col.collection_id} value={col.collection_id}>
            {col.collection_symbol}
          </option>
        ))}
      </select>
    </div>
  );
}
