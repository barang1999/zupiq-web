import { MathText } from './MathText';
import { Maximize2 } from 'lucide-react';

// Detect Khmer Unicode block (U+1780–U+17FF) or other non-math scripts
function hasNonMathScript(text: string): boolean {
  return /[\u1780-\u17FF\u1800-\u18AF]/.test(text);
}

// Render text as MathText only if it's safe for KaTeX (no Khmer/non-Latin scripts)
function SafeText({ children, className }: { children: string; className?: string }) {
  if (hasNonMathScript(children)) {
    return <span className={className}>{children}</span>;
  }
  return <MathText className={className}>{children}</MathText>;
}

export interface SignTableRow {
  label: string;       // "-∞", "0", "1/2", "+∞"
  type: 'value' | 'interval';
  cells: string[];     // "+", "-", "0", "" — one per analysis column
  conclusion: string;  // e.g. "0 < x₁ < x₂"  or  "x₁ = x₂ = 4/3"
}

export interface GenericTableRow {
  cells: string[];
}

export type VisualTableData = 
  | { 
      type: 'sign_analysis'; 
      parameterName: string;
      columns: string[];
      conclusionLabel: string;
      rows: SignTableRow[];
    }
  | { 
      type: 'generic'; 
      headers: string[]; 
      rows: GenericTableRow[];
    };

function SignCell({ value, rowType }: { value: string; rowType: 'value' | 'interval' }) {
  const base = 'flex items-center justify-center w-full h-full text-sm font-bold';

  if (rowType === 'value') {
    if (value === '0') {
      // Option B: anchor the marker on the border line between rows
      return (
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full border border-amber-400/90 bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-amber-400 shadow-sm pointer-events-none">
          0
        </span>
      );
    }
    // +/− must not appear in value rows — silently suppressed
    return null;
  }

  // Interval row signs
  if (value === '+') return <span className={`${base} text-emerald-400`}>+</span>;
  if (value === '-' || value === '−') return <span className={`${base} text-rose-400`}>−</span>;

  return <SafeText className="text-xs text-on-surface/80">{value}</SafeText>;
}

interface VisualTableProps {
  table: VisualTableData;
  expandable?: boolean;
  onExpand?: () => void;
}

/** Returns true if label looks like a single exact value (not an interval). */
function looksLikePointLabel(label: string): boolean {
  const t = label.trim();
  // Interval notation: starts with ( or [ or −∞, +∞
  if (/^[([−-]/.test(t) || t.includes(',')) return false;
  // Single value: digits, fractions, ±∞, or simple expressions like 9/2
  return /^[0-9−-]/.test(t) || t === '+∞' || t === '-∞';
}

/**
 * Normalizes legacy or ambiguous rows to follow stricter mathematical semantics.
 * Logs dev-mode warnings for rows that violate the spec.
 */
function normalizeSignTableRows(rows: SignTableRow[]): SignTableRow[] {
  const isDev = typeof process !== 'undefined'
    ? process.env.NODE_ENV !== 'production'
    : !!(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;

  return rows.map((row, i) => {
    // Rule 1: value row that has ONLY +/− (no zero) is almost certainly a
    // mislabelled interval row — reclassify. But if it has at least one '0'
    // alongside +/− (e.g. P=0 while Δ>0) it is a genuine critical-point row.
    const hasSign = row.cells.some(c => c === '+' || c === '-' || c === '−');
    const hasZero = row.cells.some(c => c === '0');
    if (row.type === 'value' && hasSign && !hasZero) {
      if (isDev) console.warn(`[VisualTable] row[${i}] type='value' but contains only interval signs — reclassified as 'interval'`, row);
      return { ...row, type: 'interval' };
    }
    // Rule 2: interval row must not contain 0
    if (row.type === 'interval' && row.cells.every(c => !c || c === '0') && row.cells.some(c => c === '0')) {
      if (isDev) console.warn(`[VisualTable] row[${i}] type='interval' but contains only zeros — reclassified as 'value'`, row);
      return { ...row, type: 'value' };
    }
    // Rule 3/4: interval row with a point-style label (legacy AI output)
    if (row.type === 'interval' && looksLikePointLabel(row.label)) {
      if (isDev) console.warn(`[VisualTable] row[${i}] type='interval' but label looks like a point value '${row.label}' — legacy ambiguous format`, row);
      // Keep rendering as interval (signs belong to the open interval around it),
      // but don't silently upgrade to a point row unless all cells are 0.
    }
    return row;
  });
}

export function VisualTable({ table, expandable, onExpand }: VisualTableProps) {
  // Two-layer approach: outer holds the border + radius (no overflow clip so
  // corners stay sharp), inner clips the table content at a matching radius.
  const outerClass = "relative group/table rounded-xl ring-1 ring-inset ring-outline-variant/20 bg-surface-container";
  const innerClass = "overflow-hidden rounded-[11px]";

  const expandButton = expandable && onExpand && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onExpand();
      }}
      className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-surface-container-highest/80 backdrop-blur-md text-on-surface-variant hover:text-primary border border-white/5 opacity-0 group-hover/table:opacity-100 transition-all shadow-lg"
      title="Expand Table"
    >
      <Maximize2 className="w-4 h-4" />
    </button>
  );

  if (table.type === 'sign_analysis') {
    // Support AI responses that used generic `headers` instead of the structured fields
    const headers = (table as unknown as { headers?: string[] }).headers;
    const allCols = (table.parameterName || table.columns || table.conclusionLabel)
      ? [table.parameterName ?? '', ...(table.columns ?? []), table.conclusionLabel ?? '']
      : (headers ?? []);
    const rows = normalizeSignTableRows(table.rows as SignTableRow[]);

    return (
      <div className={outerClass}>
        {expandButton}
        <div className={innerClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-xs">
            {/* Header */}
            <thead>
              <tr>
                {allCols.map((col, i) => (
                  <th
                    key={i}
                    className={`
                      border border-primary/25 px-2 py-2 font-bold text-center
                      ${i === 0 ? 'text-on-surface-variant w-14' : ''}
                      ${i > 0 && i < allCols.length - 1 ? 'text-secondary w-10' : ''}
                      ${i === allCols.length - 1 ? 'text-primary text-left pl-3' : ''}
                    `}
                  >
                    <SafeText className="block">{col}</SafeText>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="relative">
              {rows.map((row, ri) => {
                const isValueRow = row.type === 'value';
                
                const rowClass = isValueRow
                  ? 'h-3 bg-transparent group/value'
                  : 'h-10 bg-background/20 group/interval';

                const cellClass = isValueRow
                  ? 'border-x border-primary/15 px-1 py-0 text-center overflow-visible relative'
                  : 'border border-primary/15 px-1 py-2 text-center';

                const labelClass = isValueRow
                  ? 'border-x border-primary/15 px-2 py-0 text-center font-mono text-[10px] text-on-surface-variant/60'
                  : 'border border-primary/15 px-2 py-2 text-center font-mono text-on-surface-variant';

                return (
                  <tr key={ri} className={rowClass}>
                    {/* Parameter column (e.g. m) */}
                    <td className={labelClass}>
                      {row.label ? (
                        <SafeText className="block">{row.label}</SafeText>
                      ) : null}
                    </td>

                    {/* Sign columns */}
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className={cellClass}>
                        <SignCell value={cell} rowType={row.type} />
                      </td>
                    ))}

                    {/* Conclusion column */}
                    <td className={`border-primary/15 px-3 py-1 text-left ${isValueRow ? 'border-x' : 'border'}`}>
                      {row.conclusion ? (
                        <SafeText className={`block leading-snug ${isValueRow ? 'text-[10px] text-on-surface/50 italic' : 'text-[11px] text-on-surface'}`}>
                          {row.conclusion}
                        </SafeText>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    );
  }

  if (table.type === 'generic') {
    const headers = table.headers || [];
    const rows = table.rows as GenericTableRow[];

    return (
      <div className={outerClass}>
        {expandButton}
        <div className={innerClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-xs">
            {headers.length > 0 && (
              <thead>
                <tr className="bg-surface-container/40">
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="border border-primary/25 px-3 py-2 font-bold text-left text-secondary"
                    >
                      <SafeText>{header}</SafeText>
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-background/10' : 'bg-surface-container/20'}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} className="border border-primary/15 px-3 py-2 text-on-surface">
                      <SafeText>{cell}</SafeText>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    );
  }

  return null;
}
