# Zupiq Math Rendering Performance Optimization Spec

## Objective

Reduce UI slowdown introduced by markdown + KaTeX rendering, while preserving correct and consistent math output.

This spec is targeted to the current code areas:

- `MarkdownMath.tsx`
- `RichText.tsx`
- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`
- any node-card / graph-card component that renders math-rich content previews

---

## Core Problem

The current math rendering path likely reparses and rerenders expensive markdown/math content too often.

Typical causes:

1. raw AI content is normalized on every render
2. markdown AST is rebuilt on every render
3. KaTeX rerenders on every parent rerender
4. graph interactions cause many cards to rerender together
5. full math rendering happens even for collapsed / preview-only cards
6. new object/function props break memoization

The goal is to change the system from:

`every UI update -> normalize -> parse markdown -> render KaTeX for many nodes`

to:

`content changes once -> normalize once -> memoize -> render only affected node`

---

## Required Outcomes

After implementation:

- math-heavy pages feel noticeably more responsive
- dragging/selecting/hovering in the graph does not rerender all math blocks
- collapsed cards do not run full markdown + KaTeX unnecessarily
- normalization is performed once per content change, not once per render
- markdown/math renderer components are memoized
- expensive rendering is reserved for focused/expanded/detail states

---

## Implementation Plan

## 1) Normalize content once per content change

### Requirement

Any expensive text cleanup such as:

- raw LaTeX detection
- auto-wrapping into `$$ ... $$`
- separator cleanup
- escaped line break conversion
- malformed inline/block cleanup

must not run directly inside JSX on each render.

### Required pattern

Use `useMemo` around normalization:

```tsx
const normalizedContent = useMemo(() => {
  return normalizeMathContent(content || "");
}, [content]);
```

### Avoid

```tsx
<MarkdownMath content={normalizeMathContent(content)} />
```

### Prefer

```tsx
const normalizedContent = useMemo(() => normalizeMathContent(content || ""), [content]);
return <MarkdownMath content={normalizedContent} />;
```

### Notes

- only `content` should be the dependency unless another true content-transform input exists
- helper functions used in normalization should be module-level pure functions
- do not recreate regex arrays or parser config inside components

---

## 2) Memoize the markdown/math renderer

### Requirement

`MarkdownMath.tsx` must be wrapped with `React.memo`.

### Required pattern

```tsx
function MarkdownMathInner(props: MarkdownMathProps) {
  // component body
}

export const MarkdownMath = React.memo(MarkdownMathInner);
export default MarkdownMath;
```

If there are props like:

- `content`
- `className`
- `mode`
- `inline`
- `compact`

keep them stable and primitive where possible.

### Optional custom compare

If needed:

```tsx
export default React.memo(MarkdownMathInner, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.className === next.className &&
    prev.mode === next.mode
  );
});
```

Only add custom compare if default shallow comparison is not enough.

---

## 3) Memoize `RichText.tsx`

### Requirement

If `RichText.tsx` delegates to markdown/math rendering, it must also be memoized.

### Required pattern

```tsx
function RichTextInner(props: RichTextProps) {
  // render
}

export default React.memo(RichTextInner);
```

### Important

Do not place expensive normalization logic in both `RichText` and `MarkdownMath`.

There should be one canonical normalization path.

### Rule

- `normalizeMathContent()` should live in one shared utility
- `RichText` should not “re-fix” content already normalized upstream
- `MarkdownMath` should render, not re-clean aggressively

---

## 4) Introduce preview mode vs full mode

### Requirement

Small graph cards / collapsed insight cards must not always render full markdown + KaTeX.

### Target behavior

#### Preview mode
Use lightweight rendering for:
- collapsed cards
- small graph nodes
- off-focus cards
- list/grid previews

Preview mode may use:
- plain text
- truncated text
- minimal inline math only
- no markdown tables / no heavy display blocks

#### Full mode
Use full markdown + KaTeX only for:
- selected node
- expanded insight panel
- open modal
- dedicated detail area
- currently focused card

### Recommended API

```tsx
<RichText content={content} mode={isExpanded ? "full" : "preview"} />
```

### Preview rendering rules

In preview mode:
- strip or flatten large display math blocks when possible
- cap content length
- avoid rendering long lists and long derivations
- optionally convert display math to plain text fallback for tiny cards

### Example strategy

```tsx
const displayContent = useMemo(() => {
  if (mode === "preview") return createMathPreview(normalizedContent);
  return normalizedContent;
}, [mode, normalizedContent]);
```

---

## 5) Do not rerender all nodes during graph interactions

### Requirement

Graph-level interactions must not force all node cards to rerender if their content has not changed.

### Audit these areas

Check for:
- parent component recreating node arrays every render
- inline callbacks passed to every node
- inline style objects
- inline config objects
- derived node props rebuilt on drag/hover/select

### Avoid

```tsx
<NodeCard
  data={{ content, title, selected }}
  onClick={() => handleSelect(node.id)}
  style={{ padding: 12 }}
/>
```

### Prefer

```tsx
const handleNodeSelect = useCallback((id: string) => {
  // ...
}, []);

const nodeStyle = useMemo(() => ({ padding: 12 }), []);

<NodeCard
  data={memoizedNodeData}
  onSelect={handleNodeSelect}
  style={nodeStyle}
/>
```

### Node card requirement

Wrap graph node card component in `React.memo`.

If using a custom node renderer, ensure it only rerenders when relevant node props actually change.

---

## 6) Keep markdown plugin setup static

### Requirement

Do not recreate plugin arrays inside component render.

### Avoid

```tsx
<ReactMarkdown
  remarkPlugins={[remarkMath]}
  rehypePlugins={[rehypeKatex]}
>
  {content}
</ReactMarkdown>
```

inside a path where additional arrays/options are rebuilt dynamically each render.

### Prefer

At module scope:

```tsx
const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];
```

Then:

```tsx
<ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
  {content}
</ReactMarkdown>
```

### Reason

Static plugin arrays improve stability and reduce unnecessary downstream work.

---

## 7) Avoid recomputing derived display strings repeatedly

### Requirement

Any of these should be memoized if they are nontrivial:

- preview extraction
- truncation with math-safe cleanup
- markdown-to-preview conversion
- block splitting
- content mode selection
- heading extraction
- equation summary extraction

### Required pattern

```tsx
const previewText = useMemo(() => {
  return buildPreviewText(normalizedContent);
}, [normalizedContent]);
```

---

## 8) Lazy render heavy detail panels

### Requirement

Detail content should render only when visible.

### Examples

- node insight body only after expansion
- modal content only after open
- side panel detail only for selected node

### Avoid

Rendering full detail component for every card and hiding via CSS.

### Prefer

```tsx
{isExpanded ? <RichText content={content} mode="full" /> : <PreviewText text={previewText} />}
```

---

## 9) Add lightweight instrumentation for rerender debugging

### Requirement

Temporarily add debug logging in development to verify rerender frequency.

### Example

```tsx
if (process.env.NODE_ENV !== "production") {
  console.log("[MarkdownMath render]", { contentLength: content.length, mode });
}
```

and in node card:

```tsx
if (process.env.NODE_ENV !== "production") {
  console.log("[NodeCard render]", nodeId);
}
```

### Goal

Confirm whether:
- one selection rerenders all nodes
- one drag rerenders all cards
- markdown/math rerenders even when content is unchanged

Remove noisy logs after verification.

---

## 10) Add content-size guardrails

### Requirement

Very large math payloads should not fully render in tiny cards.

### Recommended thresholds

Use practical thresholds such as:
- preview mode max chars: 180 to 320
- tiny card max lines: 3 to 6
- if content contains many display blocks, show summary/preview instead

### Example policy

- one or two short equations: render inline
- long derivation: show first meaningful line plus “expand”
- large proof or multi-step case split: render only in detail mode

---

## 11) Prefer preprocessing when content enters state

### Requirement

If possible, normalize incoming AI content before storing/rendering downstream.

### Best pattern

When receiving AI response:

```tsx
const normalized = normalizeMathContent(rawAiText);
saveToState(normalized);
```

Then render stored normalized content.

### Better architecture

Store:

```ts
{
  rawContent: string;
  normalizedContent: string;
  previewText: string;
}
```

or compute `normalizedContent` once before it enters node/card state.

### Benefit

This prevents repeated cleanup in every renderer and improves consistency.

---

## 12) Keep one canonical normalization utility

### Requirement

There must be one authoritative utility for math normalization.

### Suggested file

`utils/normalizeMathContent.ts`

### Responsibility

This utility may handle:
- raw LaTeX block detection
- wrapping missing display delimiters
- converting pseudo separators to `\\`
- converting `\(` `\)` and `\[` `\]`
- trimming malformed spacing
- preserving intended Khmer text inside `\text{...}`

### Rule

Do not duplicate equivalent cleanup logic in:
- `RichText.tsx`
- `MarkdownMath.tsx`
- `NodeInsightPanel.tsx`

These components should consume normalized content, not compete in normalization behavior.

---

## 13) StudySpacePage responsibilities

### Requirement

`StudySpacePage.tsx` should coordinate state and rendering mode efficiently.

### Recommended responsibilities

- compute selected/expanded state
- pass `mode="preview"` for non-focused cards
- pass `mode="full"` for selected card / panel
- avoid rebuilding large render props unnecessarily
- memoize derived node data collections if expensive

### Important

If `StudySpacePage.tsx` maps many nodes/cards, ensure the mapped item props are as stable as possible.

---

## 14) NodeInsightPanel responsibilities

### Requirement

`NodeInsightPanel.tsx` should prefer full rendering only when the panel is truly open or focused.

### Recommended behavior

- closed/minimized state -> no heavy full content rendering
- expanded state -> full `RichText` or `MarkdownMath`
- use memoized `content`, `preview`, and handlers
- avoid expensive preprocessing inside render body

---

## 15) Concrete refactor checklist

Implement in this order:

### Phase 1: High impact, low risk
1. move normalization into one shared utility
2. memoize normalization with `useMemo`
3. wrap `MarkdownMath` with `React.memo`
4. wrap `RichText` with `React.memo`
5. move plugin arrays/config to module scope

### Phase 2: UI rendering strategy
6. add `mode="preview" | "full"`
7. use preview mode for collapsed graph cards
8. render full math only in selected/expanded states
9. truncate or simplify oversized card previews

### Phase 3: graph rerender control
10. memoize node card components
11. stabilize callbacks with `useCallback`
12. stabilize style/config/data props with `useMemo`
13. verify graph interaction does not rerender all cards

### Phase 4: verification
14. add dev-only render logs
15. profile selection/dragging/open-detail interactions
16. remove debug logs after confirming improvement

---

## Example target architecture

### Shared utility

```tsx
// utils/normalizeMathContent.ts
export function normalizeMathContent(input: string): string {
  // single canonical normalization pipeline
  return input;
}
```

### MarkdownMath

```tsx
const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

function MarkdownMathInner({ content, mode = "full" }: Props) {
  const normalizedContent = useMemo(() => normalizeMathContent(content || ""), [content]);

  const displayContent = useMemo(() => {
    if (mode === "preview") return createMathPreview(normalizedContent);
    return normalizedContent;
  }, [mode, normalizedContent]);

  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
      {displayContent}
    </ReactMarkdown>
  );
}

export default React.memo(MarkdownMathInner);
```

### Node card

```tsx
function NodeCardInner({ content, isExpanded }: Props) {
  return (
    <div>
      <RichText content={content} mode={isExpanded ? "full" : "preview"} />
    </div>
  );
}

export default React.memo(NodeCardInner);
```

---

## Acceptance Criteria

Implementation is complete when all of the following are true:

- repeated graph interactions no longer cause obvious lag from math rendering
- collapsed cards feel lightweight
- selected/expanded detail still renders correct KaTeX
- raw LaTeX fixes still work after optimization
- no duplicated normalization pipelines remain
- logs/profiling show materially fewer renders for unchanged math components

---

## Non-goals

Do not:
- remove KaTeX
- revert to inconsistent regex-only rendering
- add multiple competing math renderers
- normalize content in multiple components again
- fully render large derivations in every tiny preview card

---

## Final Instruction to Agent

Prioritize correctness first, then performance, but do both within one clean architecture:

- one normalization pipeline
- one canonical markdown + KaTeX renderer
- preview mode for lightweight cards
- full mode only for focused content
- memoization at every expensive boundary
- stable props to prevent graph-wide rerenders

Do not apply scattered micro-fixes. Refactor the rendering path into a professional, predictable system.
