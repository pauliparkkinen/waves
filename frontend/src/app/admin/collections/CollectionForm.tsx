"use client";

import { useState } from "react";
import type { AdminCollection, CollectionPermission } from "@/lib/api";
import PermissionEditor from "./PermissionEditor";

type CollectionFormProps = {
  collection?: AdminCollection;
  accessToken: string;
  userOrgId?: string;
  onSave: () => void;
  onCancel: () => void;
};

export default function CollectionForm({
  collection,
  accessToken,
  userOrgId,
  onSave,
  onCancel,
}: CollectionFormProps) {
  const isEdit = !!collection;
  const [symbol, setSymbol] = useState(collection?.collection_symbol ?? "");

  // Pre-fill permissions: on create, include user's org as owner if provided
  const initialPerms = (): CollectionPermission[] => {
    if (collection?.collection_permissions && collection.collection_permissions.length > 0) {
      return collection.collection_permissions;
    }
    if (!isEdit && userOrgId) {
      return [{ organisation_id: userOrgId, read: true, use: true, edit: true, owner: true }];
    }
    return [];
  };
  const [permissions, setPermissions] = useState<CollectionPermission[]>(initialPerms);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const trimmed = symbol.trim();
    if (!trimmed) {
      errors.symbol = "Collection symbol is required";
    } else if (trimmed.length < 2) {
      errors.symbol = "Collection symbol must be at least 2 characters";
    } else if (trimmed.length > 100) {
      errors.symbol = "Collection symbol must be 100 characters or fewer";
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      errors.symbol = "Collection symbol may only contain letters, numbers, and underscores";
    }
    const invalidPerms = permissions.filter((p) => !p.organisation_id.trim());
    if (invalidPerms.length > 0) {
      errors.permissions = "All permission rows must have an organisation ID";
    }
    const ownerCount = permissions.filter((p) => p.owner).length;
    if (ownerCount !== 1) {
      errors.permissions = (errors.permissions ? errors.permissions + " " : "") +
        "A collection must have exactly one organisation with owner rights";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const body = {
        collection_symbol: symbol.trim(),
        collection_permissions: permissions,
      };

      const url = isEdit
        ? `/api/admin/collections/${collection.collection_id}`
        : "/api/admin/collections";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="collection-form" onSubmit={handleSubmit} noValidate>
      <h3>{isEdit ? "Edit Collection" : "Create Collection"}</h3>

      <div className="form-group">
        <label htmlFor="collection-symbol">Collection Symbol</label>
        <input
          id="collection-symbol"
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g. financial_2024"
          maxLength={100}
          pattern="[a-zA-Z0-9_]+"
          aria-invalid={!!fieldErrors.symbol}
          aria-describedby={fieldErrors.symbol ? "symbol-error" : undefined}
        />
        {fieldErrors.symbol && (
          <p className="inline-error" id="symbol-error" role="alert">
            {fieldErrors.symbol}
          </p>
        )}
      </div>

      <div className="form-group">
        <label>Permissions</label>
        <PermissionEditor
          permissions={permissions}
          onChange={setPermissions}
          userOrgId={userOrgId}
          ownerLocked={!isEdit}
        />
        {fieldErrors.permissions && (
          <p className="inline-error" role="alert">
            {fieldErrors.permissions}
          </p>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
