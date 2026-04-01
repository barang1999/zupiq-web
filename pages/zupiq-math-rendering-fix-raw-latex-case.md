# Zupiq — Targeted Fix for Raw LaTeX Narrative Rendering

## Problem Observed

Some AI outputs still render incorrectly even after the markdown/math pipeline was introduced.

A common failing case is content like this:

```text
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \ \text{សម្រាប់ } m = 1 \implies \Delta = 0 \ \text{សម្រាប់ } 1 < m < \frac{9}{2} \implies \Delta < 0 \ \text{សម្រាប់ } m = \frac{9}{2} \implies \Delta = 0 \ \text{សម្រាប់ } m > \frac{9}{2} \implies \Delta > 0
```

This leaks raw LaTeX to the UI instead of rendering as formatted math.

---

## Root Cause

This content is **LaTeX-like**, but it is **not valid markdown math syntax yet**.

The renderer stack:

- `react-markdown`
- `remark-math`
- `rehype-katex`

only renders math when the content is inside math delimiters such as:

- inline math: `$...$`
- display math: `$$...$$`

The failing string contains LaTeX commands such as:

- `\text{...}`
- `\Delta`
- `\implies`
- `\frac{...}{...}`

but it is not wrapped in `$` or `$$`, so markdown treats it as plain text.

There is also a second issue:

- the AI sometimes uses `\ ` as a pseudo separator
- sometimes it intends a new line, but does not output valid display-math line breaks

So the content is semantically math, but syntactically not renderable.

---

## Goal

Add a **targeted normalization pass** so raw LaTeX narrative blocks are converted into valid KaTeX-compatible display math before rendering.

This must be done conservatively to avoid incorrectly wrapping normal Khmer or English prose.

---

## Required Fix

## 1. Upgrade `normalizeMathMarkdown()`

Create or update:

- `lib/aiContent/normalizeMathMarkdown.ts`

### Responsibilities

The normalizer must:

1. preserve already-valid markdown math
2. detect likely raw LaTeX math blocks not wrapped in delimiters
3. convert them into `$$...$$`
4. normalize invalid pseudo-line-break usage
5. avoid touching normal prose

---

## 2. Detection Rule for Raw LaTeX Blocks

Treat a string or paragraph as a likely math block when **both** conditions are true:

### Condition A: it contains strong LaTeX math signals

Examples:

- `\frac{`
- `\sqrt{`
- `\Delta`
- `\implies`
- `\le`
- `\ge`
- `\neq`
- `\text{`
- `^`
- `_`

### Condition B: it contains math relations or algebraic structure

Examples:

- `=`
- `<`
- `>`
- `+`
- `-`
- variables such as `x`, `m`, `a`, `b`, `c`

Do **not** rely on Khmer text presence as a blocker. Khmer inside `\text{}` is valid and expected.

---

## 3. Normalize the Specific Failing Pattern

For content such as:

```text
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \ \text{សម្រាប់ } m = 1 \implies \Delta = 0
```

normalize it into:

```latex
$$
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \\
\text{សម្រាប់ } m = 1 \implies \Delta = 0
$$
```

Important:

- inside display math, line breaks should be `\\`
- not `\ `
- not raw newlines only

---

## 4. Implementation Reference

Use this implementation style.

```ts
const LATEX_SIGNAL_RE =
  /\\(?:frac|sqrt|Delta|implies|le|ge|neq|text|left|right|cdot|times|pm|mp|alpha|beta|gamma|theta|pi|sum|int|lim)
  |\^|_/x;

const MATH_RELATION_RE = /[=<>±+\-]/;

function isProbablyRawLatexMath(input: string): boolean {
  const s = input.trim();
  if (!s) return false;

  // already delimited -> leave it alone
  if (/\$[^$]+\$/.test(s) || /\$\$[\s\S]+\$\$/.test(s)) return false;

  return LATEX_SIGNAL_RE.test(s) && MATH_RELATION_RE.test(s);
}
```

Then wrap only the paragraphs that match.

---

## 5. Recommended `normalizeMathMarkdown()`

Use a paragraph-aware transform, not a whole-document blind regex.

```ts
function normalizeLatexLineBreaks(block: string): string {
  return block
    // convert "\ " pseudo-breaks between segments into proper display breaks
    .replace(/\\\s+(?=\\text\{)/g, ' \\\\\n')
    // collapse accidental triple-or-more newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrapRawLatexBlock(block: string): string {
  const normalized = normalizeLatexLineBreaks(block);
  return `$$\n${normalized}\n$$`;
}

export function normalizeMathMarkdown(input: string): string {
  if (!input?.trim()) return '';

  let text = input.replace(/\r\n/g, '\n');

  // Normalize legacy TeX delimiters first
  text = text
    .replace(/\\\[(.*?)\\\]/gs, (_, m) => `$$\n${m.trim()}\n$$`)
    .replace(/\\\((.*?)\\\)/gs, (_, m) => `$${m.trim()}$`);

  const blocks = text.split(/\n\s*\n/);

  const normalizedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return block;

    if (isProbablyRawLatexMath(trimmed)) {
      return wrapRawLatexBlock(trimmed);
    }

    return block;
  });

  return normalizedBlocks.join('\n\n');
}
```

---

## 6. Safer Heuristic for Mixed Narrative Content

Do not wrap an entire long explanation block just because it contains one LaTeX token.

Instead:

- split by double newlines into paragraphs
- inspect each paragraph independently
- only wrap the paragraphs that are strongly math-like

This avoids converting full explanations into giant math blocks.

---

## 7. Fix the Renderer Component

Update:

- `components/ui/MarkdownMath.tsx`

Add explicit handling for KaTeX display blocks so long formulas wrap visually in narrow cards.

### Requirements

1. ensure KaTeX CSS is imported once globally
2. add styles for:
   - `.katex-display`
   - overflow handling
   - spacing between display blocks and text
3. preserve readable typography inside node cards

### Suggested CSS

```css
.katex-display {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.25rem 0;
  margin: 0.35rem 0;
}

.katex-display > .katex {
  white-space: nowrap;
}
```

If horizontal scrolling is undesirable in compact cards, allow wrapping at the content-generation stage instead by converting long sequences into multi-line display math using `\\`.

---

## 8. AI Output Contract Update

Strengthen the prompt so the model stops emitting raw unwrapped LaTeX.

### Required prompt rules

Add this to the generation prompt:

```text
Formatting rules:
- Use valid markdown.
- Use $...$ for inline math.
- Use $$...$$ for display equations or multi-line math.
- Never output raw LaTeX commands like \text{}, \frac{}, \Delta, \implies outside math delimiters.
- For multi-line case analysis, use one display-math block with \\ between lines.
- Keep explanatory Khmer prose outside math delimiters unless it is inside \text{} within a formula.
```

---

## 9. Preferred Output for This Exact Example

Instead of returning:

```text
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \ \text{សម្រាប់ } m = 1 \implies \Delta = 0 \ \text{សម្រាប់ } 1 < m < \frac{9}{2} \implies \Delta < 0 \ \text{សម្រាប់ } m = \frac{9}{2} \implies \Delta = 0 \ \text{សម្រាប់ } m > \frac{9}{2} \implies \Delta > 0
```

The AI should return:

```md
$$
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \\
\text{សម្រាប់ } m = 1 \implies \Delta = 0 \\
\text{សម្រាប់ } 1 < m < \frac{9}{2} \implies \Delta < 0 \\
\text{សម្រាប់ } m = \frac{9}{2} \implies \Delta = 0 \\
\text{សម្រាប់ } m > \frac{9}{2} \implies \Delta > 0
$$
```

This is the correct structure for KaTeX rendering.

---

## 10. QA Cases to Test

Add test cases for all of the following.

### Case A — already valid inline math

```md
តម្លៃ $a=-2$, $b=5$, $c=15$
```

Must stay unchanged.

### Case B — already valid display math

```md
$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$
```

Must stay unchanged.

### Case C — raw LaTeX block without delimiters

```text
\text{សម្រាប់ } m < 1 \implies \Delta > 0
```

Must be converted to display math.

### Case D — multi-line raw LaTeX narrative

```text
\text{សម្រាប់ } m < 1 \implies \Delta > 0 \ \text{សម្រាប់ } m = 1 \implies \Delta = 0
```

Must be converted into one `$$...$$` block with `\\` line breaks.

### Case E — mixed prose paragraph with one inline formula

```md
យើងបានរកឃើញថា $\Delta = 0$ ដូច្នេះសមីការមានឫសស្ទួន។
```

Must remain prose with inline math.

### Case F — plain prose containing backslashes that are not math

Must not be force-wrapped.

---

## 11. Where to Apply This in Current Codebase

### Files to touch

- `lib/aiContent/normalizeMathMarkdown.ts`
- `components/ui/MarkdownMath.tsx`
- `components/ui/RichText.tsx`

### Files to verify after patch

- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`
- any chat bubble / node card / insight card rendering surface

---

## 12. Non-Goals

Do not add another parallel renderer.

Do not add ad hoc regex fixes directly inside card components.

Do not let `NodeInsightPanel` or page-level components guess math syntax independently.

All normalization should happen in one place before render.

---

## 13. Acceptance Criteria

The patch is complete only if:

1. the failing raw-LaTeX example renders correctly as formatted math
2. already-valid markdown math still renders unchanged
3. Khmer prose outside math is preserved as normal text
4. narrow insight cards do not show broken raw backslash commands
5. there is only one normalization pipeline used before rendering

---

## 14. Final Engineering Direction

The correct long-term strategy is:

- make AI output valid markdown + valid math delimiters
- normalize only when necessary
- wrap raw LaTeX blocks conservatively
- render through one canonical markdown/math pipeline only

This is the smallest professional fix that addresses the current bug without reintroducing the old inconsistent regex-heavy rendering behavior.
