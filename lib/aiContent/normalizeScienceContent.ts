/**
 * Normalizes AI-generated science content (math + chemistry).
 * 
 * Extends standard math normalization with chemistry-aware patterns
 * for professional rendering of molecular formulas, reactions, and units.
 */

// ─── Classification Regex ───────────────────────────────────────────────────

// Explicit mhchem commands
const MHCHEM_COMMAND_RE = /\\(?:ce|pu)\{/;

// Chemistry reaction patterns
const REACTION_ARROW_RE = /->|<-|=>|<=|<->|<=>/;

// Common chemistry formula patterns (heuristic but conservative)
// Matches H2O, CO2, NaCl, H2SO4, NH4+, SO4^2-, etc.
const FORMULA_RE = /\b(?:H2O|CO2|NaCl|H2SO4|NH3|NH4\+|SO4\^{?2-}?|C[1-9][0-9]?H[1-9][0-9]?(?:O[1-9][0-9]?)?)\b/;

// Chemistry state of matter
const STATE_OF_MATTER_RE = /\((?:aq|s|l|g)\)/;

// Chemistry unit patterns
const CHEM_UNITS_RE = /\b(?:mol|g\/mol|mol\^{-?1}|kJ|kJ\/mol|J|atm|M|mL|cm\^3)\b/;

// Domain keywords for context
const CHEM_KEYWORDS_RE = /\b(?:molecule|atom|reaction|compound|molar mass|stoichiometry|gas law|concentration|empirical formula|molecular formula)\b/i;

// Standard Math signals (from normalizeMathMarkdown)
// Includes \ce and \pu so bare chemistry expressions get auto-wrapped in $$
const LATEX_SIGNAL_RE = /\\(?:frac|sqrt|Delta|implies|le|ge|neq|text|left|right|cdot|times|pm|mp|alpha|beta|gamma|theta|pi|sum|int|lim|ce|pu|mathrm|mathbf|mathit)|\^|_/;
const MATH_RELATION_RE = /[=<>±+\-]/;

// ─── Detection ─────────────────────────────────────────────────────────────

export function detectChemistryContent(input: string): boolean {
  if (!input) return false;
  return (
    MHCHEM_COMMAND_RE.test(input) ||
    REACTION_ARROW_RE.test(input) ||
    FORMULA_RE.test(input) ||
    STATE_OF_MATTER_RE.test(input) ||
    CHEM_UNITS_RE.test(input) ||
    CHEM_KEYWORDS_RE.test(input)
  );
}

export function isProbablyRawLatexMath(input: string): boolean {
  const s = input.trim();
  if (!s) return false;
  if (/\$[^$]+\$/.test(s) || /\$\$[\s\S]+\$\$/.test(s)) return false;
  // Bare \ce{} or \pu{} outside any delimiter should be wrapped
  if (/\\(?:ce|pu)\{/.test(s)) return true;
  return LATEX_SIGNAL_RE.test(s) && MATH_RELATION_RE.test(s);
}

// ─── Normalization Utilities ──────────────────────────────────────────────

function normalizeLatexLineBreaks(block: string): string {
  return block
    .replace(/\\\s+(?=\\text\{)/g, ' \\\\\n')
    .replace(/\\\s+$/g, ' \\\\')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Wraps chemistry-like raw text with \ce{...} and math delimiters.
 */
export function normalizeChemistryContent(input: string): string {
  let text = input.trim();

  // If it's a multiline block with arrows, it's likely a reaction block
  if (REACTION_ARROW_RE.test(text) && !text.includes('$')) {
    return `$$\n\\ce{${text}}\n$$`;
  }

  // Handle common collapsed units like \mathrm{molC} or 12.01 gC
  text = text
    .replace(/\\mathrm\{(atoms?|mol|g|L|mL|kJ|J)([A-Z][a-z]?)\}/g, '\\pu{$1 $2}')
    .replace(/\\pu\{(atoms?|mol|g|L|mL|kJ|J)([A-Z][a-z]?)\}/g, '\\pu{$1 $2}')
    .replace(/(\d+(?:\.\d+)?)\s*(atoms?|mol)([A-Z][a-z]?)/g, '\\pu{$1 $2 $3}')
    .replace(/(\d+(?:\.\d+)?)\s*g([A-Z][a-z]?)/g, '\\pu{$1 g $2}')
    .replace(/mol([A-Z][a-z]?)/g, '\\pu{mol $1}');

  return text;
}

/**
 * Normalizes mixed prose/science content by identifying segments that need
 * LaTeX or mhchem wrapping.
 */
export function normalizeScienceContent(input: string): string {
  if (!input?.trim()) return '';

  // Initial cleanup: remove zero-width spaces and standardize newlines
  let text = input
    .replace(/\u200b/g, '')
    .replace(/\r\n/g, '\n');

  // 1. Normalize legacy TeX delimiters first
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$\n${m.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);

  // 2. Handle chemistry-specific unit fixes globally (common AI errors)
  text = text
    // Convert \mathrm{unit+element} patterns to \pu{unit element}
    .replace(/\\mathrm\{(atoms?|mol|g|L|mL|kJ|J)([A-Z][a-z]?)\}/g, '\\pu{$1 $2}')
    // Fix spacing inside existing \pu{} — e.g., \pu{molC} → \pu{mol C}
    .replace(/\\pu\{(atoms?|mol|g|L|mL|kJ|J)([A-Z][a-z]?)\}/g, '\\pu{$1 $2}')
    // Handle bare number+unit+element tokens like 235atomsC or 12.01gC
    .replace(/(\d+(?:\.\d+)?)\s*(atoms?|mol)([A-Z][a-z]?)/g, '\\pu{$1 $2 $3}')
    .replace(/(\d+(?:\.\d+)?)\s*g([A-Z][a-z]?)/g, '\\pu{$1 g $2}');

  // 3. Paragraph-aware transformation
  const paragraphs = text.split(/\n\s*\n/);

  const normalizedParagraphs = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return para;

    // If it already has delimiters, leave it alone but maybe normalize internals
    if (/\$[^$]+\$/.test(trimmed) || /\$\$[\s\S]+\$\$/.test(trimmed)) {
      return para;
    }

    // Is it a standalone reaction?
    if (REACTION_ARROW_RE.test(trimmed) && !/[a-z]{4,}/.test(trimmed)) {
      return `$$\n\\ce{${trimmed}}\n$$`;
    }

    // Is it probably a math block?
    if (isProbablyRawLatexMath(trimmed)) {
      const normalized = normalizeLatexLineBreaks(trimmed);
      return `$$\n${normalized}\n$$`;
    }

    // Inline chemistry formulas in prose (e.g. "CO2 is a gas")
    // Replace common formulas with $\ce{...}$
    // We use a slightly more aggressive formula regex here but only for standalone words
    return para.replace(/\b(H2O|CO2|NaCl|H2SO4|NH3|O2|H2|Cl2|Ba\^?2\+|SO4\^?2-)\b/g, '$\\ce{$1}$');
  });

  return normalizedParagraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strips display math blocks and simplifies content for preview mode.
 */
export function createSciencePreview(content: string): string {
  if (!content) return '';
  
  return content
    // Replace display math/chem blocks with their content (or just remove them if too long)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
      const trimmed = inner.trim();
      // If it's a \ce block, strip the \ce{ } part for preview if short
      let preview = trimmed;
      if (preview.startsWith('\\ce{') && preview.endsWith('}')) {
        preview = preview.slice(4, -1).trim();
      }
      return preview.length > 50 ? '[Equation]' : `$${preview}$`;
    })
    // Truncate long content
    .slice(0, 180) + (content.length > 180 ? '...' : '');
}
