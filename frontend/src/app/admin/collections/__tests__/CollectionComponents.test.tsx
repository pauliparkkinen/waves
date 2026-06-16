import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PermissionEditor from "../PermissionEditor";
import CollectionSelector from "../CollectionSelector";
import CollectionForm from "../CollectionForm";
import CollectionList from "../CollectionList";
import type { AdminCollection, CollectionPermission } from "@/lib/api";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// -- PermissionEditor hierarchy logic tests -------------------------------

describe("PermissionEditor", () => {
  function renderEditor(permissions: CollectionPermission[]) {
    const onChange = vi.fn();
    const result = render(
      <PermissionEditor permissions={permissions} onChange={onChange} />
    );
    return { onChange, ...result };
  }

  describe("given no permissions", () => {
    it("when rendered, then shows empty state and add button", () => {
      renderEditor([]);
      expect(screen.getByText("No permissions configured.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Add Organisation/i })
      ).toBeInTheDocument();
    });
  });

  describe("given a single permission", () => {
    const basePerms: CollectionPermission[] = [
      { organisation_id: "org1", read: false, use: false, edit: false, owner: false },
    ];

    it("when owner is checked, then read/use/edit are also checked (hierarchy)", () => {
      const { onChange } = renderEditor(basePerms);
      const ownerCheckbox = screen.getAllByRole("checkbox")[3];
      fireEvent.click(ownerCheckbox);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      expect(newPerms[0].owner).toBe(true);
      expect(newPerms[0].edit).toBe(true);
      expect(newPerms[0].use).toBe(true);
      expect(newPerms[0].read).toBe(true);
    });

    it("when edit is checked, then use and read are also checked (hierarchy)", () => {
      const { onChange } = renderEditor(basePerms);
      const editCheckbox = screen.getAllByRole("checkbox")[2];
      fireEvent.click(editCheckbox);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      expect(newPerms[0].edit).toBe(true);
      expect(newPerms[0].use).toBe(true);
      expect(newPerms[0].read).toBe(true);
      expect(newPerms[0].owner).toBe(false);
    });

    it("when use is checked, then read is also checked (hierarchy)", () => {
      const { onChange } = renderEditor(basePerms);
      const useCheckbox = screen.getAllByRole("checkbox")[1];
      fireEvent.click(useCheckbox);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      expect(newPerms[0].use).toBe(true);
      expect(newPerms[0].read).toBe(true);
      expect(newPerms[0].edit).toBe(false);
      expect(newPerms[0].owner).toBe(false);
    });

    it("when read is unchecked, then use/edit/owner are also unchecked", () => {
      const allTruePerms: CollectionPermission[] = [
        { organisation_id: "org1", read: true, use: true, edit: true, owner: true },
      ];
      const { onChange } = renderEditor(allTruePerms);
      const readCheckbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(readCheckbox);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      expect(newPerms[0].read).toBe(false);
      expect(newPerms[0].use).toBe(false);
      expect(newPerms[0].edit).toBe(false);
      expect(newPerms[0].owner).toBe(false);
    });
  });

  describe("given multiple permissions", () => {
    it("when add organisation is clicked, then a new row is added", () => {
      const perms: CollectionPermission[] = [
        { organisation_id: "org1", read: true, use: false, edit: false, owner: false },
      ];
      const onChange = vi.fn();
      render(<PermissionEditor permissions={perms} onChange={onChange} />);

      const addBtns = screen.getAllByRole("button", { name: /Add Organisation/i });
      fireEvent.click(addBtns[0]);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      expect(newPerms).toHaveLength(2);
      expect(newPerms[1].organisation_id).toBe("");
    });

    it("when owner is checked on one org, then owner is removed from others", () => {
      const perms: CollectionPermission[] = [
        { organisation_id: "org1", read: true, use: true, edit: true, owner: true },
        { organisation_id: "org2", read: false, use: false, edit: false, owner: false },
      ];
      const onChange = vi.fn();
      render(<PermissionEditor permissions={perms} onChange={onChange} />);

      // Click owner checkbox on org2 (the 4th checkbox in the 2nd row = index 7 overall)
      const allCheckboxes = screen.getAllByRole("checkbox");
      const org2OwnerCheckbox = allCheckboxes[7];
      fireEvent.click(org2OwnerCheckbox);

      const newPerms = onChange.mock.calls[0][0] as CollectionPermission[];
      // org1 should now have owner=false
      expect(newPerms[0].owner).toBe(false);
      // org2 should now have owner=true (and all hierarchy perms)
      expect(newPerms[1].owner).toBe(true);
      expect(newPerms[1].edit).toBe(true);
      expect(newPerms[1].use).toBe(true);
      expect(newPerms[1].read).toBe(true);
    });
  });
});

// -- CollectionSelector rendering tests -----------------------------------

describe("CollectionSelector", () => {
  const collections: AdminCollection[] = [
    {
      collection_id: "c1",
      collection_symbol: "Alpha",
      collection_permissions: [],
    },
    {
      collection_id: "c2",
      collection_symbol: "Beta",
      collection_permissions: [],
    },
  ];

  it("renders all collections plus unassigned option", () => {
    const onChange = vi.fn();
    render(
      <CollectionSelector
        collections={collections}
        onChange={onChange}
        label="Collection"
      />
    );

    const select = screen.getByLabelText("Collection");
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3); // unassigned + 2 collections
    expect(options[0]).toHaveValue("");
    expect(options[0]).toHaveTextContent("-- Unassigned --");
    expect(options[1]).toHaveValue("c1");
    expect(options[1]).toHaveTextContent("Alpha");
    expect(options[2]).toHaveValue("c2");
    expect(options[2]).toHaveTextContent("Beta");
  });

  it("when no label given, then no label element rendered", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CollectionSelector collections={collections} onChange={onChange} />
    );
    const labels = container.querySelectorAll("label");
    expect(labels).toHaveLength(0);
  });

  it("when selectedId matches a collection, that option is selected", () => {
    const onChange = vi.fn();
    render(
      <CollectionSelector
        collections={collections}
        selectedId="c2"
        onChange={onChange}
      />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("c2");
  });
});

// -- CollectionForm validation tests --------------------------------------

describe("CollectionForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows validation error when symbol is empty and submitted", async () => {
    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    expect(
      await screen.findByText("Collection symbol is required")
    ).toBeInTheDocument();
  });

  it("shows validation error when symbol is too short", async () => {
    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "a" } });
    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    expect(
      await screen.findByText("Collection symbol must be at least 2 characters")
    ).toBeInTheDocument();
  });

  it("shows validation error when symbol has invalid characters", async () => {
    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "hello world" } });
    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    expect(
      await screen.findByText(
        "Collection symbol may only contain letters, numbers, and underscores"
      )
    ).toBeInTheDocument();
  });

  it("shows form title Create for new collection", () => {
    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Create Collection")).toBeInTheDocument();
  });

  it("shows form title Edit for existing collection", () => {
    const collection: AdminCollection = {
      collection_id: "c1",
      collection_symbol: "Test",
      collection_permissions: [],
    };

    render(
      <CollectionForm
        collection={collection}
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Collection")).toBeInTheDocument();
  });

  it("pre-fills the symbol field when editing", () => {
    const collection: AdminCollection = {
      collection_id: "c1",
      collection_symbol: "Test",
      collection_permissions: [],
    };

    render(
      <CollectionForm
        collection={collection}
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol") as HTMLInputElement;
    expect(input.value).toBe("Test");
  });

  it("calls onSave when create API succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        collection_id: "c-new",
        collection_symbol: "valid_symbol",
        collection_permissions: [
          { organisation_id: "my-org", read: true, use: true, edit: true, owner: true },
        ],
      }),
    });

    const onSave = vi.fn();
    render(
      <CollectionForm
        accessToken="test-token"
        userOrgId="my-org"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    // User's org is pre-filled; just set the symbol
    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "valid_symbol" } });

    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/collections",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(onSave).toHaveBeenCalled();
  });

  it("calls onSave when update API succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        collection_id: "c1",
        collection_symbol: "updated_symbol",
        collection_permissions: [{ organisation_id: "org1", read: true, use: true, edit: true, owner: true }],
      }),
    });

    const collection: AdminCollection = {
      collection_id: "c1",
      collection_symbol: "original",
      collection_permissions: [{ organisation_id: "org1", read: true, use: true, edit: true, owner: true }],
    };

    const onSave = vi.fn();
    render(
      <CollectionForm
        collection={collection}
        accessToken="test-token"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "updated_symbol" } });
    const updateButton = screen.getByRole("button", { name: /Update/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/collections/c1",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("updated_symbol"),
        })
      );
    });
    expect(onSave).toHaveBeenCalled();
  });

  it("shows error when API call fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "valid_symbol" } });

    // Add an organisation with owner rights
    const addBtn = screen.getByRole("button", { name: /Add Organisation/i });
    fireEvent.click(addBtn);
    const orgInput = screen.getByLabelText("Organisation ID");
    fireEvent.change(orgInput, { target: { value: "org1" } });
    const ownerCheckbox = screen.getAllByRole("checkbox")[3];
    fireEvent.click(ownerCheckbox);

    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("shows validation error when no organisation has owner rights", async () => {
    render(
      <CollectionForm
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Collection Symbol");
    fireEvent.change(input, { target: { value: "valid_symbol" } });

    // Add a permission org without owner
    const addBtn = screen.getByRole("button", { name: /Add Organisation/i });
    fireEvent.click(addBtn);

    const orgInputs = screen.getAllByLabelText("Organisation ID");
    fireEvent.change(orgInputs[0], { target: { value: "org1" } });

    const createButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(createButton);

    expect(
      await screen.findByText(/exactly one organisation with owner rights/)
    ).toBeInTheDocument();
  });

  it("shows validation error when multiple organisations have owner rights", async () => {
    // Pre-populate with two owners (simulates legacy data or direct API edits)
    const collectionWithTwoOwners: AdminCollection = {
      collection_id: "c1",
      collection_symbol: "multi_owner",
      collection_permissions: [
        { organisation_id: "org1", read: true, use: true, edit: true, owner: true },
        { organisation_id: "org2", read: true, use: true, edit: true, owner: true },
      ],
    };

    render(
      <CollectionForm
        collection={collectionWithTwoOwners}
        accessToken="test-token"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const updateButton = screen.getByRole("button", { name: /Update/i });
    fireEvent.click(updateButton);

    expect(
      await screen.findByText(/exactly one organisation with owner rights/)
    ).toBeInTheDocument();
  });

  it("pre-fills user organisation as owner when userOrgId is provided on create", () => {
    render(
      <CollectionForm
        accessToken="test-token"
        userOrgId="my-org"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const orgInput = screen.getByLabelText("Organisation ID") as HTMLInputElement;
    expect(orgInput.value).toBe("my-org");

    // Owner checkbox should be checked
    const ownerCheckbox = screen.getAllByRole("checkbox")[3] as HTMLInputElement;
    expect(ownerCheckbox.checked).toBe(true);
  });

  it("when userOrgId is provided on create, the org input is read-only and owner checkbox is disabled", () => {
    render(
      <CollectionForm
        accessToken="test-token"
        userOrgId="my-org"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const orgInput = screen.getByLabelText("Organisation ID") as HTMLInputElement;
    expect(orgInput.readOnly).toBe(true);

    const ownerCheckbox = screen.getAllByRole("checkbox")[3] as HTMLInputElement;
    expect(ownerCheckbox.disabled).toBe(true);

    // Remove button for user's org should be disabled
    const removeButton = screen.getByRole("button", {
      name: /Remove organisation my-org/i,
    }) as HTMLButtonElement;
    expect(removeButton.disabled).toBe(true);
  });

  it("when userOrgId is provided on edit, the org input is still read-only but owner is not disabled", () => {
    const collection: AdminCollection = {
      collection_id: "c1",
      collection_symbol: "Test",
      collection_permissions: [
        { organisation_id: "my-org", read: true, use: true, edit: true, owner: true },
      ],
    };

    render(
      <CollectionForm
        collection={collection}
        accessToken="test-token"
        userOrgId="my-org"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const orgInput = screen.getByLabelText("Organisation ID") as HTMLInputElement;
    expect(orgInput.readOnly).toBe(true); // Still read-only (org ID is fixed)

    const ownerCheckbox = screen.getAllByRole("checkbox")[3] as HTMLInputElement;
    expect(ownerCheckbox.disabled).toBe(false); // Owner is changeable in edit mode
  });
});

// -- CollectionList tests -------------------------------------------------

describe("CollectionList", () => {
  const sampleCollections: AdminCollection[] = [
    {
      collection_id: "c1",
      collection_symbol: "Alpha",
      collection_permissions: [
        { organisation_id: "org1", read: true, use: true, edit: false, owner: false },
      ],
    },
    {
      collection_id: "c2",
      collection_symbol: "Beta",
      collection_permissions: [],
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the list of collections", () => {
    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows permissions summary", () => {
    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    expect(screen.getByText("1 organisation")).toBeInTheDocument();
    expect(screen.getByText("No permissions")).toBeInTheDocument();
  });

  it("shows create button", () => {
    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    expect(
      screen.getByRole("button", { name: "Create Collection" })
    ).toBeInTheDocument();
  });

  it("shows empty state when no collections", () => {
    render(
      <CollectionList
        initialCollections={[]}
        accessToken="test-token"
      />
    );

    expect(
      screen.getByText(/No collections yet/)
    ).toBeInTheDocument();
  });

  it("shows delete confirmation when delete button clicked", () => {
    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /Delete Alpha/i });
    fireEvent.click(deleteButton);

    expect(
      screen.getByText("Confirm Delete")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure/)
    ).toBeInTheDocument();
  });

  it("calls delete API when delete confirmed", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /Delete Alpha/i });
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/collections/c1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("cancels delete when Cancel button clicked", () => {
    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /Delete Alpha/i });
    fireEvent.click(deleteButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
  });

  it("shows error banner when delete fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Delete failed"));

    render(
      <CollectionList
        initialCollections={sampleCollections}
        accessToken="test-token"
      />
    );

    const deleteButton = screen.getByRole("button", { name: /Delete Alpha/i });
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmButton);

    expect(await screen.findByText("Delete failed")).toBeInTheDocument();
  });
});
