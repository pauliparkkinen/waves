"use client";

import type { CollectionPermission } from "@/lib/api";

type PermissionEditorProps = {
  permissions: CollectionPermission[];
  onChange: (permissions: CollectionPermission[]) => void;
  /** The user's own organisation ID — this row's org ID will be read-only */
  userOrgId?: string;
  /** When true, the owner checkbox is locked (not changeable) for the user's org */
  ownerLocked?: boolean;
};

function enforceHierarchy(perm: CollectionPermission): CollectionPermission {
  if (perm.owner) {
    return { ...perm, edit: true, use: true, read: true };
  }
  if (perm.edit) {
    return { ...perm, use: true, read: true };
  }
  if (perm.use) {
    return { ...perm, read: true };
  }
  return perm;
}

function onUncheckRead(perm: CollectionPermission): CollectionPermission {
  if (!perm.read) {
    return { ...perm, use: false, edit: false, owner: false };
  }
  return perm;
}

export default function PermissionEditor({
  permissions,
  onChange,
  userOrgId,
  ownerLocked,
}: PermissionEditorProps) {
  function handleChange(
    index: number,
    field: keyof CollectionPermission,
    value: boolean
  ) {
    if (field === "owner" && value) {
      // Enforce exactly one owner — uncheck owner on all other rows
      const updated = permissions.map((p, i) => {
        if (i === index) {
          return enforceHierarchy({ ...p, owner: true });
        }
        return { ...p, owner: false };
      });
      onChange(updated);
      return;
    }

    const updated = permissions.map((p, i) => {
      if (i !== index) return p;
      let next = { ...p, [field]: value };
      if (field === "read") {
        next = onUncheckRead(next);
      } else {
        next = enforceHierarchy(next);
      }
      return next;
    });
    onChange(updated);
  }

  function handleOrgChange(index: number, value: string) {
    const updated = permissions.map((p, i) =>
      i === index ? { ...p, organisation_id: value } : p
    );
    onChange(updated);
  }

  function handleRemove(index: number) {
    onChange(permissions.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([
      ...permissions,
      { organisation_id: "", read: false, use: false, edit: false, owner: false },
    ]);
  }

  if (permissions.length === 0) {
    return (
      <div>
        <p className="empty-state">No permissions configured.</p>
        <button type="button" className="btn-primary btn-small" onClick={handleAdd}>
          Add Organisation
        </button>
      </div>
    );
  }

  return (
    <div>
      <table className="permission-matrix" aria-label="Organisation permission matrix">
        <thead>
          <tr>
            <th>Organisation ID</th>
            <th>Read</th>
            <th>Use</th>
            <th>Edit</th>
            <th>Owner</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((perm, i) => {
            const isUserOrg = userOrgId !== undefined && perm.organisation_id === userOrgId;
            return (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    className="permission-row-org"
                    value={perm.organisation_id}
                    onChange={(e) => handleOrgChange(i, e.target.value)}
                    placeholder="org-id"
                    aria-label="Organisation ID"
                    readOnly={isUserOrg}
                    style={isUserOrg ? { background: '#f3f4f6', cursor: 'not-allowed' } : undefined}
                    title={isUserOrg ? 'Your organisation ID is fixed' : undefined}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={perm.read}
                    onChange={(e) => handleChange(i, "read", e.target.checked)}
                    aria-label={`Read permission for ${perm.organisation_id || `organisation ${i + 1}`}`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={perm.use}
                    onChange={(e) => handleChange(i, "use", e.target.checked)}
                    aria-label={`Use permission for ${perm.organisation_id || `organisation ${i + 1}`}`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={perm.edit}
                    onChange={(e) => handleChange(i, "edit", e.target.checked)}
                    aria-label={`Edit permission for ${perm.organisation_id || `organisation ${i + 1}`}`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={perm.owner}
                    onChange={(e) => {
                      if (!(ownerLocked && isUserOrg)) {
                        handleChange(i, "owner", e.target.checked);
                      }
                    }}
                    aria-label={`Owner permission for ${perm.organisation_id || `organisation ${i + 1}`}`}
                    disabled={ownerLocked && isUserOrg}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-danger btn-small"
                    onClick={() => handleRemove(i)}
                    aria-label={`Remove organisation ${perm.organisation_id || i + 1}`}
                    disabled={isUserOrg}
                    style={isUserOrg ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                    title={isUserOrg ? 'Your organisation cannot be removed' : undefined}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn-secondary btn-small" onClick={handleAdd}>
          Add Organisation
        </button>
      </div>
    </div>
  );
}
