import katex from 'katex';

interface MathTextProps {
  latex?: string;
  children?: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * Strips outer math delimiters ($...$ or $$...$$) from a string.
 */
function stripOuterMathDelimiters(latex: string): string {
  const src = latex.trim();
  if (src.startsWith('$$') && src.endsWith('$$') && src.length > 4) {
    return src.slice(2, -2).trim();
  }
  if (src.startsWith('$') && src.endsWith('$') && src.length > 2) {
    return src.slice(1, -1).trim();
  }
  return src;
}

/**
 * MathText - Strict pure-math rendering component.
 * 
 * This component is only for strings that are known to be pure LaTeX formulas.
 * It should NOT be used for mixed prose/math content.
 */
export function MathText({ latex, children, displayMode = false, className }: MathTextProps) {
  const content = latex || children;
  if (!content?.trim()) return null;

  const src = stripOuterMathDelimiters(content);

  try {
    return (
      <span
        className={`${className || ''} no-scrollbar`}
        style={{ 
          display: displayMode ? 'block' : 'inline-block', 
          maxWidth: '100%', 
          overflowX: 'auto', 
          overflowY: 'hidden', 
          verticalAlign: 'middle',
          textAlign: displayMode ? 'center' : 'inherit'
        }}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(src, {
            throwOnError: false,
            displayMode,
            strict: false,
            trust: true,
          }),
        }}
      />
    );
  } catch (error) {
    console.warn('[MathText] KaTeX rendering failed:', error);
    return <span className={className}>{content}</span>;
  }
}
