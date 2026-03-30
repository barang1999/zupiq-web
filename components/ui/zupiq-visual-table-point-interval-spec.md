# Zupiq VisualTable Sign Analysis Rendering Spec

## Goal

Update the current `VisualTable.tsx` sign-analysis rendering so it keeps the existing table structure, but follows the correct mathematical convention:

- `+` and `−` are **interval states**
- `0` is a **boundary / point state**
- `0` must **not** be rendered inside the same row style as interval signs
- keep the UI compact, premium, and easy to read

This is a **targeted rendering upgrade**, not a full redesign.

---

## Current Problem

The current sign-analysis table mixes two different meanings in one visual row:

- exact-value state: `0`
- interval state: `+` / `−`

That is mathematically weak because a student can read a sign like `−` as if it belongs to the exact point row instead of the open interval around that point.

Example of the ambiguity:

```text
m      Δ
1      0
3/2    -
9/2    0
```

What the math really means is:

- at `m = 1`, `Δ = 0`
- on `(1, 9/2)`, `Δ < 0`
- at `m = 9/2`, `Δ = 0`

So the rendering must distinguish:

- **point rows**
- **interval rows**

---

## Final UX Decision

Keep the table.

Do **not** redesign into a timeline or freeform chart.

Instead:

1. Keep one normal table for sign analysis
2. Keep the same headers: parameter column, analysis columns, conclusion column
3. Keep rows in order from top to bottom
4. Keep interval rows as normal table rows
5. Render `0` as a **boundary marker**, visually attached to the border between interval regions
6. Avoid making `0` look like a normal interval sign inside a regular cell

This preserves:

- the current data model direction
- compact reading on mobile
- table clarity
- mathematical correctness

---

## Rendering Rules

### 1) Row semantics

There are only two row types:

- `interval`
- `value`

#### `interval` row
Represents an open interval between two boundary values.

Allowed cell values:

- `+`
- `−`
- `""`

Visual behavior:

- render as a normal row
- signs are centered in the cell
- this is the main row style

#### `value` row
Represents an exact critical value where one or more expressions equal `0`.

Allowed cell values:

- `0`
- `""`

Visual behavior:

- should **not** look like a full standard sign row
- should feel like a boundary marker row
- shorter height than interval rows
- `0` should sit visually on or near the border line
- muted background or transparent background preferred

---

## Standard to Follow

### Correct interpretation

- `+` / `−` belong to intervals
- `0` belongs to exact points

### Therefore

Do **not** visually treat this as equivalent:

```text
3/2   -
```

unless `3/2` is explicitly an interval label, which it is not.

If the row label is a single exact value like `1`, `3/2`, or `9/2`, that row should behave like a **point row**.

If the row is meant to represent the region between two values, it should behave like an **interval row**.

---

## Data Model

Keep the existing structure, but enforce stricter semantics.

### Existing interfaces

```ts
export interface SignTableRow {
  label: string;
  type: 'value' | 'interval';
  cells: string[];
  conclusion: string;
}
```

### Interpretation rules

#### For `type: 'value'`
- `label` is an exact value like `1`, `9/2`, `0`
- `cells` may contain only:
  - `0`
  - `""`
- `+` or `−` should not be accepted here

#### For `type: 'interval'`
- `label` should represent an interval meaning, not an exact point
- ideal labels:
  - `(-∞, 0)`
  - `(0, 1/2)`
  - `(1, 9/2)`
  - `(9/2, +∞)`
- `cells` may contain only:
  - `+`
  - `−`
  - `""`
- `0` should not be accepted here

---

## Recommended Data Shape Example

```ts
const table = {
  type: 'sign_analysis',
  parameterName: 'm',
  columns: ['Δ', 'P', 'S'],
  conclusionLabel: 'Conclusion',
  rows: [
    {
      label: '(-∞, 0)',
      type: 'interval',
      cells: ['+', '+', '+'],
      conclusion: '0 < x₁ < x₂'
    },
    {
      label: '0',
      type: 'value',
      cells: ['', '0', ''],
      conclusion: 'x₁ < 0 < x₂'
    },
    {
      label: '(0, 1/2)',
      type: 'interval',
      cells: ['+', '+', '−'],
      conclusion: 'x₁ < x₂ < 0'
    },
    {
      label: '1',
      type: 'value',
      cells: ['0', '', ''],
      conclusion: 'Δ = 0'
    },
    {
      label: '(1, 9/2)',
      type: 'interval',
      cells: ['−', '+', ''],
      conclusion: 'No real solution'
    },
    {
      label: '9/2',
      type: 'value',
      cells: ['0', '', ''],
      conclusion: 'x₁ = x₂ = 4/3'
    },
    {
      label: '(9/2, +∞)',
      type: 'interval',
      cells: ['+', '+', '+'],
      conclusion: '0 < x₁ < x₂'
    }
  ]
};
```

---

## UI Behavior Spec

### Table headers
Keep the current header structure:

- first column = parameter label, e.g. `m`
- middle columns = analysis symbols, e.g. `Δ`, `P`, `S`
- last column = conclusion label

No change needed here.

---

### Interval rows

Interval rows are the default readable rows.

#### Styling goals
- readable on mobile
- compact
- visually primary
- clear sign cells

#### Behavior
- render `+` or `−` centered
- preserve current sign colors
- preserve current conclusion layout

#### Recommended style
- row height around current height
- regular cell borders
- standard background striping is OK

---

### Value rows

Value rows represent boundaries only.

#### Styling goals
- visually lighter than interval rows
- clearly not another interval band
- `0` should feel attached to the border, not the cell center as a full row value

#### Recommended style
- smaller row height than interval rows
- transparent or very subtle background
- reduced vertical padding
- cell content vertically aligned close to the top or bottom border
- optional pseudo-element or absolutely positioned marker to make the `0` sit over the horizontal divider

#### Acceptable implementation options

##### Option A — simplest
- keep a short row
- render a smaller circular `0` marker centered in the cell
- use thin row height so it reads as a separator row

##### Option B — better
- render the row with height near zero / very small height
- absolutely position the `0` marker at `top: 0` with `transform: translateY(-50%)`
- marker overlaps the border line so it visually sits on the boundary

Preferred: **Option B** if it can be done cleanly without making the table brittle.

---

## Validation Rules

Add guardrails so the renderer cannot silently output bad math semantics.

### Rule 1
For `type: 'value'`, reject `+` or `−` in `cells`

### Rule 2
For `type: 'interval'`, reject `0` in `cells`

### Rule 3
Prefer interval labels for interval rows, not single point labels

### Rule 4
If legacy AI output still sends point labels like `3/2` for an interval row, normalize it before render or flag it in development

---

## Legacy Compatibility Strategy

If current AI output still produces rows like:

```ts
{ label: '3/2', type: 'interval', cells: ['-', '+', ''], conclusion: '...' }
```

that should be treated as **legacy ambiguous format**.

### Recommended handling

1. Do not break production immediately
2. Add a normalization layer before render
3. Convert old row meaning into cleaner row meaning where possible
4. Log warnings in development mode

### Example normalization idea

- if `row.type === 'interval'` and `label` looks like a single exact value
- try to infer neighboring bounds from adjacent rows
- convert label into interval notation for render only

If that inference is unreliable, at minimum:

- keep rendering
- but do not render the interval sign as if it belongs to a boundary point row
- optionally hide the point-style label and show a generic interval marker

---

## Component-Level Implementation Tasks

File target:

- `VisualTable.tsx`

### Task 1 — tighten row semantics
Update sign-analysis rendering rules so:

- `value` rows are treated as boundary rows
- `interval` rows are treated as sign rows

### Task 2 — update `SignCell`
Current `SignCell` supports `+`, `−`, `0`.

Refactor so it can support different render modes depending on row type:

- interval sign mode
- value marker mode

Suggested direction:

```ts
function SignCell({ value, rowType }: { value: string; rowType: 'value' | 'interval' })
```

Behavior:

- if `rowType === 'interval'`, render only `+` / `−`
- if `rowType === 'value'`, render only `0` marker or empty

### Task 3 — update row layout
For `value` rows:

- reduce row height
- reduce padding
- add class that makes it read like a separator

For `interval` rows:

- keep current height and readability

### Task 4 — optional border-anchored marker
If implementation is stable, render the `0` marker overlapping the row border.

Suggested approach:

- make the `td` or wrapper `relative`
- place marker `absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2`
- ensure overflow is visible if needed

### Task 5 — keep conclusion column stable
Do not let the conclusion column jump vertically due to boundary-marker styling.

- text should remain readable
- empty conclusion on value rows is acceptable
- if present, it can remain aligned within the row

---

## Minimal Visual Direction

Maintain current Zupiq style:

- compact
- premium
- dark-mode friendly
- subtle color accents
- no heavy redesign

### Keep
- current table shell
- current border language
- current sign colors
- current typography hierarchy

### Adjust
- make `value` rows visually thinner
- make `0` smaller and more marker-like
- de-emphasize boundary rows compared with interval rows

---

## Suggested Tailwind Direction

This is guidance, not mandatory exact code.

### Interval row classes

```ts
const intervalRowClass = 'bg-background/20';
const intervalCellClass = 'px-1 py-2 text-center h-9';
```

### Value row classes

```ts
const valueRowClass = 'bg-transparent';
const valueCellClass = 'relative px-1 py-0 text-center h-3 overflow-visible';
```

### Value marker classes

```ts
const valueMarkerClass = `
  absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2
  w-4 h-4 rounded-full border border-amber-400/90
  bg-surface flex items-center justify-center text-[10px] font-bold text-amber-400
`;
```

If table overflow clipping prevents this from showing correctly, use the short-row approach instead.

---

## Non-Goals

Do **not** do the following in this task:

- do not redesign into a graph or horizontal timeline
- do not remove the table structure
- do not change the AI math engine here
- do not rewrite generic table rendering
- do not introduce heavy animation
- do not over-stylize boundary markers

This task is about **mathematical correctness with minimal UI change**.

---

## Acceptance Criteria

Implementation is successful if all of the following are true:

1. The table still looks like a table
2. `Δ`, `P`, and `S` still render in columns
3. Interval rows show `+` / `−`
4. Boundary rows show `0` only
5. `0` is no longer visually treated like a normal interval sign cell
6. Students can visually distinguish:
   - exact points
   - open intervals
7. Mobile readability remains good
8. Existing premium UI feel is preserved

---

## QA Cases

### Case 1 — simple Delta pattern

Input meaning:

- `Δ > 0` on `(-∞, 1)`
- `Δ = 0` at `1`
- `Δ < 0` on `(1, 9/2)`
- `Δ = 0` at `9/2`
- `Δ > 0` on `(9/2, +∞)`

Expected:

- `0` appears only on boundary rows at `1` and `9/2`
- `−` appears only on the interval row `(1, 9/2)`

### Case 2 — mixed Δ / P / S states

Input meaning:

- one value row where only `P = 0`
- one interval row where `Δ = +`, `P = +`, `S = −`

Expected:

- value row has only one `0` marker in the `P` column
- interval row shows normal signs

### Case 3 — legacy ambiguous row

Input:

```ts
{ label: '3/2', type: 'interval', cells: ['-', '+', ''], conclusion: '...' }
```

Expected:

- development warning or normalization
- renderer does not style it like a mathematically correct point row

---

## Recommended Implementation Order

1. Update semantics and validation
2. Split interval row styling from value row styling
3. Refactor `SignCell` to receive row type
4. Implement shorter boundary rows
5. Optionally anchor `0` on the border
6. Test on mobile width and Khmer-containing conclusion text

---

## Final Product Principle

This change is small visually, but important pedagogically.

Zupiq should not render sign tables like a generic spreadsheet.
It should teach the structure of the math correctly.

The correct idea is:

- **interval signs live in the interval rows**
- **zero lives on the boundary rows**

Keep the table.
Improve the semantics.
Make the math feel native.

---

## Maintenance Notes

### Rule 1 — Loosened (2026-03-30)

The original Rule 1 was:

> If a `value` row contains any `+` or `−`, reclassify it as `interval`.

**This was too aggressive.**

In practice the AI correctly emits rows like:

```ts
{ label: '$\\frac{1}{2}$', type: 'value', cells: ['+', '0', '+'], conclusion: '...' }
```

This means: at the exact point $m = \frac{1}{2}$, $P = 0$ while $\Delta$ and $S$ are still positive. The `+` values are valid non-zero states at the boundary — they are not interval signs. The `SignCell` renderer already suppresses `+`/`−` in value rows (shows nothing), so they do not produce incorrect visual output.

**Current Rule 1 (correct):**

> Reclassify as `interval` only if the `value` row has `+`/`−` signs **and no `0` at all**.
> If at least one cell is `0`, the row is a genuine critical-point row — keep it as `value`.

```ts
const hasSign = row.cells.some(c => c === '+' || c === '-' || c === '−');
const hasZero = row.cells.some(c => c === '0');
if (row.type === 'value' && hasSign && !hasZero) {
  // reclassify
}
```

---

### `headers` Fallback for `sign_analysis` (2026-03-30)

The AI sometimes returns a `sign_analysis` table using the generic `headers` field instead of the structured `parameterName` / `columns` / `conclusionLabel` fields:

```json
{
  "type": "sign_analysis",
  "headers": ["$m$", "$\\Delta$", "$P$", "$S$", "Conclusion"],
  "rows": [...]
}
```

This caused a runtime crash: `table.columns is not iterable`.

**Fix:** When `parameterName`, `columns`, and `conclusionLabel` are all absent, fall back to `headers` for constructing the header row:

```ts
const headers = (table as unknown as { headers?: string[] }).headers;
const allCols = (table.parameterName || table.columns || table.conclusionLabel)
  ? [table.parameterName ?? '', ...(table.columns ?? []), table.conclusionLabel ?? '']
  : (headers ?? []);
```

The preferred data shape remains `parameterName` / `columns` / `conclusionLabel`. If the AI prompt is updated, enforce this shape there first.

---

### Border Corner Rendering (2026-03-30)

CSS `border` + `border-radius` + `overflow: hidden` on the same element causes the border to appear faded at the corners due to double anti-aliasing.

**Fix applied in `VisualTable`:** Two-layer container approach.

- **Outer div** — holds `rounded-xl` and `ring-1 ring-inset ring-outline-variant/20` (inset box-shadow, not `border`). No `overflow: hidden` so the border paints cleanly.
- **Inner div** — holds `overflow-hidden rounded-[11px]` (1 px inset from outer radius) to clip table content at the corners.

Why `ring-inset` and not `ring` (outer box-shadow): an outer ring gets clipped by any parent element that has `overflow: hidden` (e.g. the insight panel wrapper). An inset box-shadow lives inside the element's border-box and is never clipped by a parent.

```ts
const outerClass = "relative group/table rounded-xl ring-1 ring-inset ring-outline-variant/20 bg-surface-container";
const innerClass = "overflow-hidden rounded-[11px]";
```

---

### Expand to Full-Screen Modal (2026-03-30)

`VisualTable` accepts optional `expandable` and `onExpand` props. When `expandable` is true, a `Maximize2` button appears on hover.

The modal is **not** rendered inside `VisualTable` or `NodeInsightPanel`. It is lifted to `StudySpacePage` so it overlays the full viewport:

- `StudySpacePage` holds `expandedTable: VisualTableData | null` state.
- `NodeInsightPanel` receives `onExpandTable: (table: VisualTableData) => void` and passes it down as `onExpand` to each `VisualTable`.
- The modal renders at the root level of `StudySpacePage` using `<Modal maxWidth="fit">`.
- Title and close button are rendered as `fixed` elements (`z-[101]`) outside the modal container so they sit at the screen edges.

Modal sizing in the expand context:
- `maxWidth="fit"` → `w-full max-w-[calc(100vw-2rem)]`
- `containerClassName="!bg-transparent !border-0 !shadow-none"` — no box background
- Content wrapper: `overflow-auto max-h-[80vh] [&_table]:w-auto [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap`
- Table centered with `w-fit mx-auto`
