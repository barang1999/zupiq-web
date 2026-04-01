/**
 * Normalizes AI-generated math/markdown content.
 * 
 * Targeted fix for raw LaTeX narrative blocks not wrapped in delimiters.
 */

// Signals that the block contains LaTeX math commands
const LATEX_SIGNAL_RE = /\\(?:frac|sqrt|Delta|implies|le|ge|neq|text|left|right|cdot|times|pm|mp|alpha|beta|gamma|theta|pi|sum|int|lim)|\^|_/;

// Signals that the block contains math relations or algebraic structure
const MATH_RELATION_RE = /[=<>±+\-]/;

function isProbablyRawLatexMath(input: string): boolean {
  const s = input.trim();
  if (!s) return false;

  // If it's already delimited by $ or $$, leave it alone
  if (/\$[^$]+\$/.test(s) || /\$\$[\s\S]+\$\$/.test(s)) return false;

  // Must have both a LaTeX command signal AND a math relation signal
  return LATEX_SIGNAL_RE.test(s) && MATH_RELATION_RE.test(s);
}

function normalizeLatexLineBreaks(block: string): string {
  return block
    // convert "\ " pseudo-breaks between segments into proper display breaks
    // specifically when followed by \text{
    .replace(/\\\s+(?=\\text\{)/g, ' \\\\\n')
    // and also just general "\ " at the end of a thought
    .replace(/\\\s+$/g, ' \\\\')
    // collapse accidental triple-or-more newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrapRawLatexBlock(block: string): string {
  const normalized = normalizeLatexLineBreaks(block);
  return `$$\n${normalized}\n$$`;
}

/**
 * Main normalization pipeline
 */
export function normalizeMathMarkdown(input: string): string {
  if (!input?.trim()) return '';

  // Initial cleanup: remove zero-width spaces and standardize newlines
  let text = input
    .replace(/\u200b/g, '')
    .replace(/\r\n/g, '\n');

  // 1. Normalize legacy TeX delimiters first
  // \[ ... \] -> $$ ... $$
  // \( ... \) -> $ ... $
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$\n${m.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);

  // 2. Handle multiline blocks wrapped in single $ (uncommon but possible from AI)
  // Convert them to $$...$$
  text = text.replace(/(?<!\$)\$([^\$]+?)\$(?!\$)/g, (match, inner: string) => {
    if (!inner.includes('\n')) return match;
    const lines = inner.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return `$$\n${lines.join(' \\\\\n')}\n$$`;
  });

  // 3. Paragraph-aware transformation for raw LaTeX
  // Split by double newlines to treat paragraphs independently
  const blocks = text.split(/\n\s*\n/);

  const normalizedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return block;

    if (isProbablyRawLatexMath(trimmed)) {
      return wrapRawLatexBlock(trimmed);
    }

    return block;
  });

  // 4. Final join and cleanup
  return normalizedBlocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
