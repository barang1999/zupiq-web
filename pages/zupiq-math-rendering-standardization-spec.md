# Zupiq — Professional Math/Text Rendering Standardization Spec

## Goal

Fix inconsistent rendering of AI-generated content across math, plain text, markdown, and multilingual explanation content.

Current issues observed:

- raw math tokens leak to UI
- malformed or partial KaTeX appears to users
- markdown, prose, and math are parsed differently in different components
- Khmer/plain-language explanation is sometimes forced through KaTeX paths
- regex-based auto-repair logic is duplicated and fragile
- the same content can render differently depending on whether it goes through `MathText` or `RichText`

The target state is:

- one canonical content contract
- one canonical normalization pipeline
- one canonical markdown + math renderer
- clean separation between narrative text and LaTeX math
- deterministic rendering across Study Space, node panels, insights, OCR analysis, and conversation output

---

## Current code areas involved

Based on current uploaded files, the main rendering stack touches:

- `MathText.tsx`
- `RichText.tsx`
- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`

### Problems in current implementation

#### 1. Duplicate parsing responsibility
Both `MathText.tsx` and `RichText.tsx` contain parsing, cleaning, math detection, and fallback behavior.

That creates inconsistent results because:

- each component has its own heuristics
- each component can normalize the same source differently
- bug fixes in one renderer do not automatically fix the other

#### 2. Render-time repair is too aggressive
The current approach tries to infer whether content is:

- plain text
- inline math
- display math
- bare LaTeX
- narrative mixed with LaTeX

This is useful as a temporary patch, but not as a stable architecture.

#### 3. Non-math prose is entering KaTeX paths
Khmer explanation text and math often appear inside the same render segment. When this happens, KaTeX either fails or forces fallback behavior.

#### 4. AI output contract is too loose
The AI is likely returning mixed content such as:

- malformed LaTeX
- plain text formulas
- markdown with math-like fragments
- display math without delimiters
- multilingual explanation mixed directly into formula lines

No renderer can make this fully consistent if the content contract is loose.

---

## Architecture decision

### Canonical direction
Adopt a single markdown+math rendering pipeline based on:

- `react-markdown`
- `remark-math`
- `rehype-katex`
- `katex`
- `katex/dist/katex.min.css`

This becomes the only approved content renderer for mixed prose + markdown + math.

### Approved responsibility split

#### A. Upstream normalization layer
Normalize AI/OCR output before it reaches the UI.

#### B. Structured content contract
Where possible, store content as typed blocks instead of a single dirty mixed string.

#### C. Unified renderer
Use one renderer for all rich explanation content.

#### D. Strict math rendering helper
Keep a very small dedicated helper only for known pure-math fields.

---

## Required packages

Install these packages if not already present:

```bash
npm install react-markdown remark-math rehype-katex katex
```

Make sure KaTeX CSS is loaded once globally:

```ts
import 'katex/dist/katex.min.css';
```

Preferred location:

- root app entry
- or main layout
- not inside deeply nested components multiple times

---

## New rendering standard

### 1. Content types
Define two rendering categories only.

#### Category A — Rich explanation content
For mixed content such as:

- paragraphs
- headings
- bullets
- inline math
- display math
- bold text
- solution steps

This must go through the unified markdown + math renderer.

#### Category B — Pure math content
For content that is known to be only a formula or symbolic expression.

Examples:

- `x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`
- `f'(x) = 2x - 3`
- `\Delta = b^2 - 4ac`

This may use a dedicated pure-math component, but only when the field is explicitly typed as pure math.

---

## Content contract for AI output

### Minimum required format rules
Update prompts and server-side post-processing so AI outputs follow these rules:

1. Use valid markdown for prose.
2. Use `$...$` for inline math.
3. Use `$$...$$` for display math.
4. Do not place narrative Khmer text inside math delimiters unless absolutely necessary.
5. All formulas must be valid KaTeX-compatible LaTeX.
6. Do not output plain-text fake formulas like:

```text
x = - b ± √(b^2 - 4ac)2a
```

7. Instead output:

```latex
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

### Strongly recommended output shape
Whenever practical, return structured blocks from AI/backend instead of a single string.

```ts
export type AiRenderableBlock =
  | { type: 'heading'; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'math_block'; latex: string }
  | { type: 'markdown'; content: string };
```

If full block typing is too large a change right now, use this phased fallback:

```ts
interface NormalizedAiContent {
  markdown: string;
  pureMath?: string[];
  warnings?: string[];
}
```

---

## Required implementation plan

## Phase 1 — Introduce one canonical rich renderer

### Create a new component
Create:

- `components/ui/MarkdownMath.tsx`

### Responsibilities
This component must:

- render markdown
- support inline math via `$...$`
- support display math via `$$...$$`
- support paragraphs, lists, headings, emphasis
- provide safe fallback when content is malformed
- be the default renderer for AI explanation content

### Example implementation

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownMath({ content, className }: Props) {
  if (!content?.trim()) return null;

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### Styling requirements
Add clean typography styles for:

- paragraphs
- bullet lists
- ordered lists
- inline code if any
- block equations with horizontal overflow handling

Recommended behavior:

- display equations should scroll horizontally on small screens
- long formulas must not break layout
- paragraph spacing should be consistent
- list spacing should match the app’s premium UI style

---

## Phase 2 — Create one normalization utility

### Create utility
Create:

- `lib/aiContent/normalizeMathMarkdown.ts`

### Responsibilities
This utility must normalize known AI/OCR issues before rendering.

### Allowed normalization tasks
Only perform deterministic cleanup. Do not over-infer.

Allowed:

1. Convert `\(` `\)` into `$...$`
2. Convert `\[` `\]` into `$$...$$`
3. Remove zero-width characters
4. Normalize escaped line breaks that are clearly broken artifacts
5. Collapse repeated blank lines
6. Trim surrounding spaces
7. Optionally repair a very small set of known OCR artifacts

Examples:

- `ln\left(` -> `\ln\left(`
- duplicated escaped command backslashes where safe

### Not allowed
Do not do these in the normalizer:

- guess full formulas from plain text
- auto-convert arbitrary text into LaTeX
- infer whether prose is “probably math” using heavy regex heuristics
- split one string into mixed math segments using custom parser logic unless strictly necessary for a migration bridge

### Example utility skeleton

```ts
export function normalizeMathMarkdown(input: string): string {
  return input
    .replace(/\u200b/g, '')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

---

## Phase 3 — Reduce `MathText.tsx` to strict pure-math rendering only

### New role of `MathText.tsx`
`MathText.tsx` should no longer be responsible for mixed markdown/text parsing.

It should only render a string that is already known to be a pure math expression.

### Keep only these responsibilities

- receive a trusted formula string
- strip outer delimiters if present
- render with KaTeX
- if invalid, show safe plain-text fallback

### Remove from `MathText.tsx`
Gradually remove:

- mixed narrative/math splitting
- markdown bold parsing
- auto-wrap inline math detection
- heuristic classification for prose vs math
- duplicated multiline inline-math normalization logic

### Target API

```ts
interface MathTextProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}
```

### Example simplified behavior

```tsx
export function MathText({ latex, displayMode = false, className }: MathTextProps) {
  if (!latex?.trim()) return null;

  const src = stripOuterMathDelimiters(latex.trim());

  try {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(src, {
            throwOnError: false,
            displayMode,
            strict: false,
            trust: false,
          }),
        }}
      />
    );
  } catch {
    return <span className={className}>{latex}</span>;
  }
}
```

### Important
Do not send Khmer or general prose through this component.

---

## Phase 4 — Deprecate `RichText.tsx` or convert it into a thin wrapper

### Current issue
`RichText.tsx` is doing too much custom parsing.

### Target decision
Choose one of these approaches:

#### Option A — Deprecate `RichText.tsx`
Replace usage sites with `MarkdownMath`.

#### Option B — Keep `RichText.tsx` as a thin wrapper
It should only do:

- `normalizeMathMarkdown(children)`
- pass result to `MarkdownMath`

### Target wrapper example

```tsx
import { MarkdownMath } from './MarkdownMath';
import { normalizeMathMarkdown } from '../../lib/aiContent/normalizeMathMarkdown';

export function RichText({ children, className }: { children: string; className?: string }) {
  if (!children) return null;
  return <MarkdownMath className={className} content={normalizeMathMarkdown(children)} />;
}
```

This is the preferred migration bridge because it minimizes breakage while removing duplicate parsing logic.

---

## Phase 5 — Apply renderer consistently in current screens

### `NodeInsightPanel.tsx`
Use the canonical renderer for:

- `simpleBreakdown`
- conversation messages
- node explanation text

Use pure math renderer only for explicitly pure formula fields such as:

- `keyFormula`
- `mathContent` when the field is guaranteed to be formula-only

If `mathContent` currently contains mixed prose + formula, it must be normalized upstream or moved to rich markdown rendering.

### `StudySpacePage.tsx`
Audit all render locations where AI/OCR analysis is shown.

Likely categories:

- OCR explanation
- breakdown nodes
- node conversations
- insight panels
- saved knowledge content

Rule:

- mixed explanation → `MarkdownMath` / thin `RichText`
- known pure symbolic formula → `MathText`

---

## Phase 6 — Normalize data at ingestion boundaries

### In AI response handling
Where AI responses are received, normalize immediately before storing in UI state.

In current project, likely relevant boundaries include:

- image analysis response handling
- study session AI response handling
- node insight generation response handling
- conversation response handling

### Example rule
When receiving AI string content:

```ts
const normalized = normalizeMathMarkdown(rawContent);
```

Then store normalized content in state.

This prevents different screens from each doing their own cleanup.

---

## Rendering rules for multilingual content

### Rule 1
Narrative Khmer text must stay as plain markdown text, not KaTeX.

### Rule 2
Math symbols and formulas should be isolated in math delimiters.

Good:

```md
យើងប្រើរូបមន្តសមីការដឺក្រេទីពីរ៖

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

នៅក្នុងលំហាត់នេះ $a=-2$, $b=5$, និង $c=15$.
```

Bad:

```text
យើងប្រើ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} ហើយបន្តគណនា...
```

### Rule 3
Avoid forcing Khmer text into `\text{}` within KaTeX unless there is a strong mathematical reason.

---

## Fallback behavior standard

### For rich markdown content
If markdown/math parsing fails, show normalized plain text rather than broken HTML.

### For pure math fields
If KaTeX fails:

- log a debug warning in development
- render plain text fallback
- do not crash
- do not show raw HTML artifacts

### Debug logging
Keep debug logging behind a dev-only flag.
Do not emit noisy KaTeX logs in production.

---

## Security standard

### KaTeX options
Use conservative options unless there is a proven need for more.

Recommended:

```ts
{
  throwOnError: false,
  strict: false,
  trust: false,
}
```

### Markdown rendering
Do not allow unsafe HTML from AI unless there is an explicit sanitization plan.

If raw HTML is currently allowed anywhere in AI output, remove that behavior.

---

## Migration checklist

### Step 1
Install and wire:

- `react-markdown`
- `remark-math`
- `rehype-katex`
- KaTeX CSS

### Step 2
Create:

- `components/ui/MarkdownMath.tsx`
- `lib/aiContent/normalizeMathMarkdown.ts`

### Step 3
Refactor `RichText.tsx` into a thin wrapper over `MarkdownMath`.

### Step 4
Refactor `MathText.tsx` into strict pure-math rendering only.

### Step 5
Replace mixed-content rendering call sites in:

- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`

### Step 6
Normalize AI/OCR output at ingestion time.

### Step 7
Update prompts so the model always outputs:

- valid markdown
- valid `$...$` inline math
- valid `$$...$$` display math
- narrative text outside math delimiters

### Step 8
Add regression test fixtures.

---

## Required regression test cases

Create test fixtures for these exact scenarios.

### Case 1 — Plain paragraph only

```md
This is a simple explanation.
```

Expected:
- plain paragraph
- no KaTeX usage

### Case 2 — Inline math inside paragraph

```md
Use the formula $a^2 + b^2 = c^2$ to continue.
```

Expected:
- paragraph renders correctly
- inline formula renders consistently

### Case 3 — Display equation

```md
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

Expected:
- centered display equation
- no raw delimiters shown

### Case 4 — Khmer + inline math

```md
នៅទីនេះ $a=-2$, $b=5$, និង $c=15$.
```

Expected:
- Khmer text renders as text
- math renders inline
- no fallback corruption

### Case 5 — Khmer paragraph + display formula

```md
យើងប្រើរូបមន្តនេះ៖

$$\Delta = b^2 - 4ac$$
```

Expected:
- paragraph plus display math
- consistent spacing

### Case 6 — Malformed math

```md
Use this $x = \frac{a+b$ example.
```

Expected:
- no UI crash
- visible readable fallback
- dev warning only

### Case 7 — OCR escaped delimiters

```text
\[x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}\]
```

Expected:
- normalized into display math
- renders correctly

### Case 8 — Pure math field

```ts
latex = "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";
```

Expected:
- `MathText` renders formula only
- no markdown path involved

---

## Prompt contract to give the AI model

Use a strict generation instruction like this:

```text
Return output in valid markdown.
Use $...$ for inline math.
Use $$...$$ for display equations.
Keep narrative explanation outside math delimiters.
All formulas must be valid KaTeX-compatible LaTeX.
Do not output plain-text fake math using raw Unicode symbols when proper LaTeX is available.
Do not mix Khmer explanation text inside display equation blocks unless mathematically necessary.
```

### Example desired output

```md
យើងប្រើរូបមន្តសមីការដឺក្រេទីពីរ៖

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

នៅទីនេះ $a=-2$, $b=5$, និង $c=15$.

ដូច្នេះ៖

$$x = \frac{-5 \pm \sqrt{5^2 - 4(-2)(15)}}{2(-2)}$$
```

---

## Non-goals

Do not do these in this refactor:

- build a complex homemade markdown parser
- keep expanding regex heuristics forever
- attempt to auto-reconstruct arbitrarily broken math from any possible AI output
- support multiple competing rendering pipelines
- allow each screen to normalize content differently

---

## Final expected outcome

After this refactor:

- AI-generated explanation content renders consistently everywhere
- math is rendered through one standard pipeline
- pure math uses a smaller, safer KaTeX wrapper
- Khmer and other narrative text no longer leak through KaTeX incorrectly
- malformed output fails gracefully instead of looking broken
- future maintenance becomes much easier because parsing logic is centralized

---

## Recommended file changes summary

### New files

- `components/ui/MarkdownMath.tsx`
- `lib/aiContent/normalizeMathMarkdown.ts`

### Files to refactor

- `MathText.tsx`
- `RichText.tsx`
- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`

### Preferred end state

- `MarkdownMath` = default mixed-content renderer
- `MathText` = pure-math only
- `RichText` = deprecated or very thin wrapper
- normalization happens once at ingestion

