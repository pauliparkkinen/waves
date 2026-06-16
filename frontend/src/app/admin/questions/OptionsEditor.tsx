'use client';


type Option = { label: string; value: string; order_index: number; id?: string };

type OptionsEditorProps = {
  options: Option[];
  onChange: (options: Option[]) => void;
};

export default function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  function handleLabelChange(index: number, label: string) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, label } : opt,
    );
    onChange(updated);
  }

  function handleValueChange(index: number, value: string) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, value } : opt,
    );
    onChange(updated);
  }

  function handleRemove(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function handleAdd() {
    const nextOrder =
      options.length > 0
        ? Math.max(...options.map((o) => o.order_index)) + 1
        : 0;
    const id = crypto.randomUUID?.() ?? `opt-${Date.now()}-${Math.random()}`;
    onChange([
      ...options,
      { label: '', value: '', order_index: nextOrder, id },
    ]);
  }

  if (options.length === 0) {
    return (
      <div className="options-editor">
        <p className="empty-state">
          No options defined. Click &apos;Add Option&apos; to add one.
        </p>
        <button
          type="button"
          className="btn-primary btn-small btn-add-option"
          onClick={handleAdd}
        >
          Add Option
        </button>
      </div>
    );
  }

  return (
    <div className="options-editor">
      <table className="options-table" aria-label="Question options">
        <thead>
          <tr>
            <th>Order</th>
            <th>Label</th>
            <th>Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt, i) => (
            <tr key={opt.id ?? i} className="options-row">
              <td className="option-order">{i + 1}</td>
              <td>
                <input
                  type="text"
                  className="option-label-input"
                  value={opt.label}
                  onChange={(e) => handleLabelChange(i, e.target.value)}
                  placeholder="Label"
                  aria-label={`Option ${i + 1} label`}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="option-value-input"
                  value={opt.value}
                  onChange={(e) => handleValueChange(i, e.target.value)}
                  placeholder="Value"
                  aria-label={`Option ${i + 1} value`}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn-danger btn-small"
                  onClick={() => handleRemove(i)}
                  aria-label={`Remove option ${i + 1}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn-secondary btn-small btn-add-option"
          onClick={handleAdd}
        >
          Add Option
        </button>
      </div>
    </div>
  );
}
