"use client";

import { useState, useEffect, useRef } from 'react';
import type { Formula, AstNode, OutputType, AdminQuestion, FormulaReferenceType } from '@/lib/api';
import {
  astToHumanReadable,
  humanReadableToAst,
  validateFormulaString,
  inferAstType,
} from '@/lib/formula/astConverter';
import type { VariableDef } from '@/lib/formula/astConverter';

type FormulaEditorPopupProps = {
  formula?: Formula;
  collectionId: string;
  accessToken: string;
  onSave: (formula: Formula) => void;
  onCancel: () => void;
};

export default function FormulaEditorPopup({
  formula,
  collectionId,
  accessToken,
  onSave,
  onCancel,
}: FormulaEditorPopupProps) {
  const isEdit = !!formula;

  const [symbol, setSymbol] = useState(formula?.symbol ?? '');
  const [expression, setExpression] = useState(
    formula ? astToHumanReadable(formula.expression) : '',
  );
  const [outputType, setOutputType] = useState<OutputType>(
    formula?.output_type ?? 'number',
  );
  const [variableDefs, setVariableDefs] = useState<VariableDef[]>([]);
  const [availableFormulas, setAvailableFormulas] = useState<Formula[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [inferredType, setInferredType] = useState<
    'number' | 'boolean' | 'unknown' | null
  >(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusable = overlay!.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    const focusable = overlay.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, []);

  useEffect(() => {
    async function fetchVars() {
      try {
        const [questionsRes, formulasRes] = await Promise.all([
          fetch(
            `/api/admin/questions?collectionId=${encodeURIComponent(collectionId)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
          fetch(
            `/api/admin/formulas?collection_id=${encodeURIComponent(collectionId)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ),
        ]);

        const questions: AdminQuestion[] = questionsRes.ok
          ? await questionsRes.json()
          : [];
        const formulas: Formula[] = formulasRes.ok
          ? await formulasRes.json()
          : [];

        setAvailableFormulas(formulas);

        const defs: VariableDef[] = [
          ...questions.map((q) => ({
            name: q.question_symbol,
            type: 'unknown' as const,
            kind: 'activity' as const,
          })),
          ...formulas.map((f) => ({
            name: f.symbol,
            type: f.output_type,
            kind: 'formula' as const,
          })),
        ];

        setVariableDefs(defs);
      } catch {
        /* silently ignore fetch errors */
      }
    }
    fetchVars();
  }, [collectionId, accessToken]);

  useEffect(() => {
    if (!expression.trim()) {
      setErrors([]);
      setInferredType(null);
      return;
    }
    const validationErrors = validateFormulaString(expression, variableDefs);
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      try {
        const ast = humanReadableToAst(expression, variableDefs);
        const inferred = inferAstType(ast);
        setInferredType(inferred);
      } catch {
        setInferredType(null);
      }
    } else {
      setInferredType(null);
    }
  }, [expression, variableDefs]);

  function insertAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue =
      expression.slice(0, start) + text + expression.slice(end);
    setExpression(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + text.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  function insertTernary() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = expression.slice(start, end);
    if (selected) {
      const newValue =
        expression.slice(0, start) +
        `${selected} ?  : ` +
        expression.slice(end);
      setExpression(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + selected.length + 4;
        textarea.setSelectionRange(pos, pos);
      });
    } else {
      insertAtCursor(' ?  : ');
    }
  }

  function insertFunctionCall(fn: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = expression.slice(start, end);
    if (selected) {
      const newValue =
        expression.slice(0, start) + `${fn}(${selected})` + expression.slice(end);
      setExpression(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + fn.length + 1;
        textarea.setSelectionRange(pos, pos + selected.length);
      });
    } else {
      insertAtCursor(`${fn}()`);
    }
  }

  function insertParentheses() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = expression.slice(start, end);
    if (selected) {
      const newValue =
        expression.slice(0, start) + `(${selected})` + expression.slice(end);
      setExpression(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + 1;
        textarea.setSelectionRange(pos, pos + selected.length);
      });
    } else {
      insertAtCursor('()');
    }
  }

  function extractVariableNames(node: AstNode): string[] {
    const names: string[] = [];
    function walk(n: AstNode) {
      switch (n.type) {
        case 'variable':
          names.push(n.name);
          break;
        case 'binary_expression':
        case 'logical_expression':
        case 'comparison_expression':
          walk(n.left);
          walk(n.right);
          break;
        case 'unary_expression':
          walk(n.operand);
          break;
        case 'ternary_expression':
          walk(n.condition);
          walk(n.true_branch);
          walk(n.false_branch);
          break;
        case 'function_call':
          n.arguments.forEach(walk);
          break;
        case 'literal':
          break;
      }
    }
    walk(node);
    return [...new Set(names)];
  }

  async function handleSave() {
    setSaveError(null);

    const trimmedSymbol = symbol.trim();
    if (!trimmedSymbol) {
      setSaveError('Symbol is required');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedSymbol)) {
      setSaveError(
        'Symbol may only contain letters, numbers, and underscores',
      );
      return;
    }

    let ast: AstNode;
    try {
      ast = humanReadableToAst(expression, variableDefs);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Invalid expression',
      );
      return;
    }

    const inferred = inferAstType(ast);
    if (inferred !== 'unknown' && inferred !== outputType) {
      setSaveError(
        `Expression evaluates to ${inferred} but output type is ${outputType}`,
      );
      return;
    }

    const usedVars = extractVariableNames(ast);
    const formulaReferences = usedVars.map((name) => {
      const def = variableDefs.find((v) => v.name === name);
      const matchedFormula = availableFormulas.find((f) => f.symbol === name);
      return {
        formula_reference_id: crypto.randomUUID(),
        symbol: `$${name}`,
        type: (def?.kind === 'formula' ? 'formula' : 'activity') as FormulaReferenceType,
        referenced_formula_id: matchedFormula?.formula_id,
      };
    });

    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        collection_id: collectionId,
        symbol: trimmedSymbol,
        expression: ast,
        output_type: outputType,
        formula_references: formulaReferences,
      };

      const url = isEdit
        ? `/api/admin/formulas/${formula.formula_id}`
        : '/api/admin/formulas';

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const saved = (await res.json()) as Formula;
      onSave(saved);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'An error occurred',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-editor-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      tabIndex={-1}
    >
      <div
        className="modal-content formula-editor-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="formula-editor-heading">
          {isEdit ? 'Edit Formula' : 'New Formula'}
        </h3>

        <div className="form-group">
          <label htmlFor="formula-symbol">Symbol</label>
          <input
            id="formula-symbol"
            type="text"
            className="formula-editor-symbol-input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. total_score"
            maxLength={100}
            pattern="[a-zA-Z0-9_]+"
          />
        </div>

        <div className="form-group">
          <label htmlFor="formula-expression">Expression</label>
          <textarea
            ref={textareaRef}
            id="formula-expression"
            className={`formula-editor-expression ${errors.length > 0 ? 'has-error' : ''}`}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="e.g. $revenue + $cost"
            spellCheck={false}
          />
        </div>

        <div className="formula-operator-buttons">
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' + ')}
            aria-label="Insert plus"
          >
            +
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' - ')}
            aria-label="Insert minus"
          >
            -
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' * ')}
            aria-label="Insert multiply"
          >
            *
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' / ')}
            aria-label="Insert divide"
          >
            /
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' && ')}
            aria-label="Insert AND"
          >
            &amp;&amp;
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' || ')}
            aria-label="Insert OR"
          >
            ||
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={insertTernary}
            aria-label="Insert ternary"
          >
            ?:
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' > ')}
            aria-label="Insert greater than"
          >
            &gt;
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' < ')}
            aria-label="Insert less than"
          >
            &lt;
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' >= ')}
            aria-label="Insert greater or equal"
          >
            &gt;=
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' <= ')}
            aria-label="Insert less or equal"
          >
            &lt;=
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertAtCursor(' == ')}
            aria-label="Insert equals"
          >
            ==
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertFunctionCall('max')}
            aria-label="Insert max function"
          >
            max()
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={() => insertFunctionCall('min')}
            aria-label="Insert min function"
          >
            min()
          </button>
          <button
            type="button"
            className="formula-operator-btn"
            onClick={insertParentheses}
            aria-label="Insert parentheses"
          >
            ( )
          </button>
        </div>

        {variableDefs.length > 0 && (
          <div className="form-group">
            <label>Variables</label>
            <div className="formula-variables-panel">
              {variableDefs.map((def) => (
                <div key={def.name} className="formula-variable-row">
                  <span>
                    <span className="formula-variable-name">${def.name}</span>
                    <span className="formula-variable-type-badge">
                      {def.type}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-small formula-variable-insert-btn"
                    onClick={() => insertAtCursor(`$${def.name}`)}
                  >
                    Insert
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Output Type</label>
          <div className="formula-output-type-group">
            <label>
              <input
                type="radio"
                name="output-type"
                value="number"
                checked={outputType === 'number'}
                onChange={() => setOutputType('number')}
              />
              number
            </label>
            <label>
              <input
                type="radio"
                name="output-type"
                value="boolean"
                checked={outputType === 'boolean'}
                onChange={() => setOutputType('boolean')}
              />
              boolean
            </label>
            {inferredType && (
              <span
                className={`formula-inferred-type ${inferredType === outputType ? 'match' : 'conflict'}`}
              >
                Inferred: {inferredType}
                {inferredType === outputType ? ' (match)' : ' (conflict)'}
              </span>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="formula-errors">
            {errors.map((err, i) => (
              <p key={i} className="formula-error-item">
                {err}
              </p>
            ))}
          </div>
        )}

        {saveError && (
          <div className="error-message" role="alert">
            {saveError}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
