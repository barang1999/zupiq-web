import { RichText } from './RichText';
import { Maximize2 } from 'lucide-react';
import React from 'react';

function SafeText({ children, className }: { children: string; className?: string }) {
  if (!children) return null;
  return <RichText className={className} discreet>{children}</RichText>;
}

export interface SignTableRow {
  label: string;
  type: 'value' | 'interval';
  cells: string[];
  conclusion: string;
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

/**
 * Normalizes fragmented AI data into a strict textbook sequence:
 * Interval -> Point -> Interval -> Point ...
 * Merges sign data so each region is represented exactly once.
 */
function normalizeToSignChart(rows: SignTableRow[], colCount: number): SignTableRow[] {
  // 1. Initial reclassification
  const baseRows = rows.map(row => {
    const hasSign = row.cells.some(c => c === '+' || c === '-' || c === '−');
    const hasZero = row.cells.some(c => c === '0');
    if (row.type === 'value' && hasSign && !hasZero) return { ...row, type: 'interval' as const };
    if (row.type === 'interval' && row.cells.every(c => !c || c === '0') && row.cells.some(c => c === '0')) return { ...row, type: 'value' as const };
    return row;
  });

  // 2. Identify unique boundary points in ascending order
  const points: string[] = [];
  baseRows.forEach(r => {
    if (r.type === 'value' && r.label && !points.includes(r.label)) {
      points.push(r.label);
    }
  });

  // 3. Construct textbook slots
  const slots: SignTableRow[] = [];
  for (let i = 0; i <= points.length; i++) {
    const lower = i === 0 ? '-∞' : points[i - 1];
    const upper = i === points.length ? '+∞' : points[i];
    slots.push({
      label: `(${lower}, ${upper})`,
      type: 'interval',
      cells: Array(colCount).fill(''),
      conclusion: ''
    });
    if (i < points.length) {
      slots.push({
        label: points[i],
        type: 'value',
        cells: Array(colCount).fill(''),
        conclusion: ''
      });
    }
  }

  // 4. Merge data into slots
  baseRows.forEach(row => {
    let targetSlot: SignTableRow | undefined;
    if (row.type === 'value') {
      targetSlot = slots.find(s => s.type === 'value' && s.label === row.label);
    } else {
      // Find interval slot - preference for exact label match or overlap
      targetSlot = slots.find(s => s.type === 'interval' && (
        row.label === s.label || row.label.includes(s.label.split(',')[0].replace('(', '').trim())
      ));
    }

    if (targetSlot) {
      row.cells.forEach((c, ci) => {
        if (c && !targetSlot!.cells[ci]) targetSlot!.cells[ci] = c;
      });
      if (row.conclusion && !targetSlot.conclusion) targetSlot.conclusion = row.conclusion;
    }
  });

  return slots.filter(s => s.cells.some(c => c) || s.type === 'value');
}

export function VisualTable({ table, expandable, onExpand }: {
  table: VisualTableData;
  expandable?: boolean;
  onExpand?: () => void;
}) {
  const outerClass = "relative group/table rounded-xl ring-1 ring-inset ring-outline-variant/25 bg-surface-container p-px";
  const innerClass = "overflow-hidden rounded-[11px]";

  const expandButton = expandable && onExpand && (
    <button
      onClick={(e) => { e.stopPropagation(); onExpand(); }}
      className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-surface-container-highest/80 backdrop-blur-md text-on-surface-variant hover:text-primary border border-white/5 invisible opacity-0 group-hover/table:visible group-hover/table:opacity-100 transition-all shadow-lg active:scale-95 cursor-pointer"
      title="Expand Table"
    >
      <Maximize2 className="w-4 h-4" />
    </button>
  );

  if (table.type === 'sign_analysis') {
    const columns = table.columns ?? [];
    const rows = normalizeToSignChart(table.rows as SignTableRow[], columns.length).reverse();
    
    // Grid Setup: Label Column | Sign Columns | Conclusion Column
    // Sign columns use minmax so complex math headers get enough room
    const gridCols = `120px repeat(${columns.length}, minmax(80px, 1fr)) 2fr`;

    return (
      <div className={outerClass}>
        {expandButton}
        <div className={innerClass}>
          <div className="overflow-x-auto no-scrollbar bg-surface-container/20 p-6">
            <div
              className="grid min-w-[500px]"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* Header */}
              <div className="py-5 px-2 flex items-end justify-center font-bold text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-primary/20">
                <SafeText>{table.parameterName}</SafeText>
              </div>
              {columns.map((col, ci) => (
                <div key={ci} className="py-5 px-3 flex items-end justify-center font-bold text-secondary text-sm border-b border-primary/20 text-center">
                  <SafeText>{col}</SafeText>
                </div>
              ))}
              <div className="py-5 px-4 flex items-end pl-8 font-bold text-primary text-[11px] uppercase tracking-wider border-b border-primary/20">
                <SafeText>{table.conclusionLabel}</SafeText>
              </div>

              {/* Chart Body */}
              {rows.map((row, ri) => {
                if (row.type === 'value') {
                  return (
                    <React.Fragment key={ri}>
                      {/* Label cell — no border so line doesn't cut through text */}
                      <div className="h-0 relative my-4">
                        <div className="absolute right-0 top-0 -translate-y-1/2 pr-2">
                          <span className="text-[10px] font-mono text-on-surface-variant/40 whitespace-nowrap">
                            <SafeText>{`${table.parameterName} = ${row.label}`}</SafeText>
                          </span>
                        </div>
                      </div>
                      {/* Sign cells — render 0 centered on the line for vanishing factors */}
                      {row.cells.map((cell, ci) => (
                        <div key={ci} className="h-0 relative my-4 border-t border-primary/10">
                          {cell === '0' && (
                            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 text-base font-bold text-on-surface-variant/60">
                              0
                            </span>
                          )}
                        </div>
                      ))}
                      {/* Conclusion cell — chevron split < at boundary point */}
                      <div className="h-0 relative my-4" style={{ overflow: 'visible' }}>
                        {/* Chevron < */}
                        <svg
                          className="absolute left-2 top-0"
                          style={{ transform: 'translateY(-50%)', overflow: 'visible' }}
                          width="20"
                          height="52"
                        >
                          <polyline
                            points="18,0 3,26 18,52"
                            fill="none"
                            stroke="rgba(148,163,184,0.55)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {/* Top horizontal line from chevron tip to right edge */}
                        <div className="absolute" style={{ left: 26, right: 0, top: 0, transform: 'translateY(-26px)', borderTop: '1.5px solid rgba(148,163,184,0.55)' }} />
                        {/* Bottom horizontal line from chevron tip to right edge */}
                        <div className="absolute" style={{ left: 26, right: 0, top: 0, transform: 'translateY(26px)', borderTop: '1.5px solid rgba(148,163,184,0.55)' }} />
                        {row.conclusion && (
                          <div className="absolute left-7 top-0 -translate-y-1/2 pr-2">
                            <SafeText className="text-[10px] text-on-surface/55 italic">{row.conclusion}</SafeText>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={ri}>
                    {/* Interval Row */}
                    <div className="h-14 flex items-center justify-center text-[10px] font-mono text-on-surface-variant/40">
                      <SafeText>{row.label}</SafeText>
                    </div>
                    {row.cells.map((cell, ci) => (
                      <div key={ci} className="h-14 flex items-center justify-center">
                        {cell === '+' && (
                          <span className="text-xl font-bold text-emerald-400/90 drop-shadow-[0_0_8px_rgba(52,211,153,0.25)]">+</span>
                        )}
                        {(cell === '-' || cell === '−') && (
                          <span className="text-xl font-bold text-rose-400/90 drop-shadow-[0_0_8px_rgba(251,113,133,0.25)]">−</span>
                        )}
                      </div>
                    ))}
                    <div className="h-14 flex items-center pl-6 text-[11px] text-on-surface/80 leading-snug">
                      <SafeText>{row.conclusion}</SafeText>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
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
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[320px] border-separate border-spacing-0 text-xs">
            {headers.length > 0 && (
              <thead>
                <tr className="bg-surface-container/60">
                  {headers.map((header, i) => (
                    <th key={i} className={`border-b border-primary/25 px-3 py-2.5 font-bold text-left text-secondary ${i < headers.length - 1 ? 'border-r border-primary/15' : ''}`}>
                      <SafeText>{header}</SafeText>
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-background/20' : 'bg-surface-container/20'}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-2 text-on-surface ${ri < rows.length - 1 ? 'border-b border-primary/10' : ''} ${ci < row.cells.length - 1 ? 'border-r border-primary/10' : ''}`}>
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
