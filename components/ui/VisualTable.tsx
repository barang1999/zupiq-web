import { MathText } from './MathText';

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

function SignCell({ value }: { value: string }) {
  const base = 'flex items-center justify-center w-full h-full text-sm font-bold';
  if (value === '+') return <span className={`${base} text-emerald-400`}>+</span>;
  if (value === '-') return <span className={`${base} text-rose-400`}>−</span>;
  if (value === '0') return (
    <span className={`${base} text-amber-400`}>
      <span className="w-4 h-4 rounded-full border-2 border-amber-400 inline-flex items-center justify-center text-[10px]">0</span>
    </span>
  );
  return <SafeText className="text-xs text-on-surface/80">{value}</SafeText>;
}

interface VisualTableProps {
  table: VisualTableData;
}

export function VisualTable({ table }: VisualTableProps) {
  if (table.type === 'sign_analysis') {
    const allCols = [table.parameterName!, ...table.columns!, table.conclusionLabel!];
    const rows = table.rows as SignTableRow[];

    return (
      <div className="overflow-x-auto -mx-1">
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
          <tbody>
            {rows.map((row, ri) => {
              const isValueRow = row.type === 'value';
              const rowBg = isValueRow
                ? 'bg-surface-container/60'
                : 'bg-background/20';

              return (
                <tr key={ri} className={rowBg}>
                  {/* m column */}
                  <td className="border border-primary/15 px-2 py-2 text-center font-mono text-on-surface-variant">
                    {row.label ? (
                      <SafeText className="block text-xs">{row.label}</SafeText>
                    ) : null}
                  </td>

                  {/* Sign columns */}
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-primary/15 px-1 py-2 text-center h-9
                        ${isValueRow && cell === '0' ? 'bg-amber-400/10' : ''}
                      `}
                    >
                      <SignCell value={cell} />
                    </td>
                  ))}

                  {/* Conclusion column */}
                  <td className="border border-primary/15 px-3 py-2 text-left">
                    {row.conclusion ? (
                      <SafeText className="text-[11px] text-on-surface leading-snug block">
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
    );
  }

  if (table.type === 'generic') {
    const headers = table.headers || [];
    const rows = table.rows as GenericTableRow[];

    return (
      <div className="overflow-x-auto -mx-1">
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
    );
  }

  return null;
}
