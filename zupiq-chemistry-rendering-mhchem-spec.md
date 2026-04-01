# Zupiq Chemistry Rendering Support Spec (KaTeX + mhchem + Normalization)

## Objective

Add professional, consistent chemistry rendering support to Zupiq so chemistry content no longer leaks as raw LaTeX/plain text.

This spec extends the existing markdown + KaTeX math pipeline with:

- chemistry-aware normalization
- mhchem-compatible rendering rules
- safe detection of chemistry expressions
- correct handling of formulas, reactions, stoichiometry, units, and scientific notation
- preview/full-mode behavior consistent with the rest of the app

Target files:

- `MarkdownMath.tsx`
- `RichText.tsx`
- `NodeInsightPanel.tsx`
- `StudySpacePage.tsx`
- shared normalization utilities
- any preview/card renderer that shows science content

---

## Problem Statement

Standard math rendering is not enough for chemistry.

The app currently handles many expressions as generic math or raw text, which causes issues such as:

- raw LaTeX shown to the user
- chemistry formulas rendered as plain text
- reaction notation not formatted correctly
- scientific unit-heavy expressions appearing broken
- mixed chemistry + prose output being inconsistently parsed
- repeated custom cleanup logic across components

Examples of problematic content:

```latex
\frac{235}{6.02 \times 10^{23}} \mathrm{molC} \times \frac{12.01 \mathrm{gC}}{1 \mathrm{molC}}
```

```latex
\ce{H2O + CO2 -> H2CO3}
```

```latex
\text{Given } \ce{2H2 + O2 -> 2H2O}
```

```latex
\pu{75.3 J mol^{-1} K^{-1}}
```

---

## Desired Outcome

After implementation:

- chemistry formulas render cleanly and consistently
- molecular formulas, ions, charges, and reactions display properly
- unit-heavy chemistry expressions render correctly
- raw chemistry-like LaTeX is normalized before render
- preview cards do not leak chemistry syntax to users
- chemistry and normal math coexist in one predictable pipeline

---

## Rendering Strategy

Use **KaTeX** as the base renderer and add **mhchem** support for chemistry syntax.

### Standard math continues to use:
- markdown
- `remark-math`
- `rehype-katex`

### Chemistry support adds:
- mhchem-compatible syntax recognition
- chemistry-aware normalization
- a chemistry render path that supports:
  - `\ce{...}`
  - `\pu{...}`

---

## Architecture Rule

There must be **one canonical content normalization pipeline**.

Do not scatter chemistry fixes across:
- `RichText.tsx`
- `MarkdownMath.tsx`
- `NodeInsightPanel.tsx`
- ad hoc regex inside card components

Instead:

- centralize content cleanup in one utility
- detect whether content is:
  - plain prose
  - regular math
  - chemistry
  - mixed science prose + math/chemistry
- render through a predictable path

---

## Recommended Utility Structure

Create a shared utility such as:

`utils/normalizeScienceContent.ts`

or split into:

- `utils/normalizeMathContent.ts`
- `utils/normalizeChemContent.ts`
- `utils/detectScienceContent.ts`

### Minimum required shared functions

```ts
detectChemistryContent(input: string): boolean
normalizeChemistryContent(input: string): string
normalizeScienceContent(input: string): string
createSciencePreview(input: string): string
```

---

## Content Classification Rules

## 1) Treat as chemistry if any of these are present

### Explicit mhchem commands
- `\ce{`
- `\pu{`

### Chemistry reaction patterns
- `->`
- `<->`
- `<=>`
- `=>`

### Chemistry-like formula patterns
- `H2O`
- `CO2`
- `NaCl`
- `H2SO4`
- `NH4+`
- `SO4^{2-}`
- `(aq)`, `(s)`, `(l)`, `(g)`

### Stoichiometry / chemistry units patterns
- `mol`
- `g/mol`
- `mol^{-1}`
- `M`
- `atm`
- `kJ`
- `J`
- `L`
- `mL`

### Domain hints from explanation text
- mentions of:
  - molecule
  - atom
  - reaction
  - compound
  - molar mass
  - stoichiometry
  - gas law
  - concentration
  - empirical formula
  - molecular formula

### Important

Detection should be heuristic but conservative. Do not convert all science/math text into mhchem blindly.

---

## 2) Treat as normal math if

- expression is algebraic/calculus/general scientific computation
- no strong chemistry patterns are present
- formula is primarily:
  - fractions
  - roots
  - exponents
  - equations
  - inequalities
  - functions
  - derivatives/integrals
  - general scientific notation

Example:

```latex
\frac{235}{6.02 \times 10^{23}} \times 12.01
```

This alone can remain standard KaTeX unless chemistry units/formulas are involved.

---

## 3) Treat as mixed science content if

The content contains prose plus one or more of:
- math blocks
- chemistry formulas
- unit expressions
- reactions

Example:

```text
First compute the number of moles, then use \ce{CO2} molar mass to convert to grams.
```

---

## Chemistry Normalization Rules

## Rule A: Wrap raw chemistry expressions with math delimiters if missing

If chemistry-like LaTeX arrives without `$...$` or `$$...$$`, auto-wrap it.

### Example input

```latex
\ce{H2 + Cl2 -> 2HCl}
```

### Normalized output

```latex
$$
\ce{H2 + Cl2 -> 2HCl}
$$
```

### Single inline chemistry expression

If it is short and clearly inline:

```text
The compound is \ce{H2SO4}.
```

Normalize to:

```text
The compound is $\ce{H2SO4}$.
```

---

## Rule B: Convert chemistry-like raw formula text into mhchem where appropriate

### Example raw input
```text
H2O + CO2 -> H2CO3
```

### Normalized output
```latex
$$
\ce{H2O + CO2 -> H2CO3}
$$
```

### Another example
```text
NaCl
```

### Preferred output
```latex
$\ce{NaCl}$
```

### Important

Do this only when the token strongly looks like a chemical formula, not for arbitrary uppercase/lowercase combinations.

---

## Rule C: Preserve standard math around chemistry

Mixed expressions must remain mathematically valid.

### Example raw input

```latex
\frac{235}{6.02 \times 10^{23}} \mathrm{molC} \times \frac{12.01 \mathrm{gC}}{1 \mathrm{molC}}
```

### Preferred normalization

```latex
$$
\frac{235}{6.02 \times 10^{23}}\ \mathrm{mol\ C}\times\frac{12.01\ \mathrm{g\ C}}{1\ \mathrm{mol\ C}}
$$
```

### Better if unit formatting is chemistry-aware

If represented as units:

```latex
$$
\frac{235}{6.02 \times 10^{23}}\ \pu{mol C}\times\frac{\pu{12.01 g C}}{\pu{1 mol C}}
$$
```

### Rule

Do not force all unit expressions into `\ce{}`.
Use:
- `\ce{}` for formulas/reactions/species
- `\pu{}` for units/physical quantities
- standard math for algebraic structure

---

## Rule D: Convert reaction arrows to mhchem syntax when chemistry is detected

Examples:

### Input
```text
2H2 + O2 -> 2H2O
```

### Output
```latex
$$
\ce{2H2 + O2 -> 2H2O}
$$
```

### Input
```text
NH3 + H+ <=> NH4+
```

### Output
```latex
$$
\ce{NH3 + H+ <=> NH4+}
$$
```

---

## Rule E: Preserve prose outside chemistry delimiters

Avoid wrapping full paragraphs inside `\ce{}` or `$$...$$` just because they mention chemistry.

### Bad
```latex
$$
\text{First compute the number of moles, then use CO2 mass.}
$$
```

### Better
```text
First compute the number of moles, then use $\ce{CO2}$ molar mass.
```

### Rule

Only the actual formula/reaction/unit expression should be chemistry-rendered.

---

## Rule F: Handle Khmer or multilingual chemistry prose safely

When explanation text is Khmer/English mixed with chemistry notation:

### Example
```text
ម៉ូលេគុល \ce{CO2} មានម៉ាសម៉ូល 44 g/mol
```

Prefer normalization like:

```text
ម៉ូលេគុល $\ce{CO2}$ មានម៉ាសម៉ូល $\pu{44 g mol^{-1}}$
```

### Rule

- prose stays prose
- formulas become `\ce{...}`
- units/quantities become `\pu{...}` or standard math/unit notation

---

## Rule G: Normalize broken spacing and concatenated units

Example problematic input:

```latex
\mathrm{molC}
```

Preferred normalization:

```latex
\mathrm{mol\ C}
```

or unit-aware:

```latex
\pu{mol C}
```

Similarly:

```latex
12.01 \mathrm{gC}
```

should become:

```latex
12.01\ \mathrm{g\ C}
```

or

```latex
\pu{12.01 g C}
```

### Rule

Insert intentional spacing where AI has collapsed chemistry unit tokens.

---

## Rule H: Leave non-chemistry math alone

Do not rewrite correct algebraic content into chemistry syntax.

Example:

```latex
x^2 + 5x + 6 = 0
```

must remain standard math.

---

## Recommended Renderer Behavior

## 1) Add a chemistry-aware renderer path

You may implement either:

### Option A: unified science renderer
A single renderer decides whether content is:
- prose
- math
- chemistry
- mixed

### Option B: math renderer with chemistry enhancement
Existing `MarkdownMath.tsx` is upgraded to support chemistry-aware normalization and mhchem-ready render flow.

Either is acceptable, but keep only **one canonical render path**.

---

## 2) Module-level plugin/config setup only

Keep plugin arrays/config static at module scope.

Do not rebuild plugin/config objects per render.

---

## 3) Full mode vs preview mode

### Preview mode
For graph cards / collapsed nodes:
- render short chemistry snippets safely
- avoid long derivations
- avoid full multiline reaction explanations
- never leak raw `\ce{...}` or raw LaTeX to the UI

### Full mode
For selected/expanded detail:
- full markdown + KaTeX + chemistry formatting
- display equations, reactions, unit expressions, and explanations cleanly

---

## 4) Fallback policy

If chemistry normalization fails:
- prefer rendering a readable plain-text preview
- never show obviously broken raw command strings if avoidable
- log dev-only warnings for malformed content

Example fallback:
- strip outer broken slashes
- show sanitized readable text
- do not crash the render tree

---

## Suggested Normalization Pipeline

## Step 1: classify content

```ts
const kind = classifyScienceContent(input);
// returns: "plain" | "math" | "chem" | "mixed"
```

## Step 2: normalize by kind

```ts
switch (kind) {
  case "chem":
    return normalizeChemistryContent(input);
  case "mixed":
    return normalizeMixedScienceContent(input);
  case "math":
    return normalizeMathContent(input);
  default:
    return input;
}
```

## Step 3: render by mode

```ts
const displayContent = mode === "preview"
  ? createSciencePreview(normalizedContent)
  : normalizedContent;
```

---

## Examples of Expected Transformations

## Example 1: raw reaction text

### Input
```text
H2 + O2 -> H2O
```

### Output
```latex
$$
\ce{H2 + O2 -> H2O}
$$
```

---

## Example 2: chemistry inline in prose

### Input
```text
The product is CO2 and water.
```

### Output
```text
The product is $\ce{CO2}$ and water.
```

If both are formulas:

```text
The products are $\ce{CO2}$ and $\ce{H2O}$.
```

---

## Example 3: molar mass explanation

### Input
```text
CO2 has molar mass 44 g/mol
```

### Output
```text
$\ce{CO2}$ has molar mass $\pu{44 g mol^{-1}}$.
```

---

## Example 4: current broken screenshot-type expression

### Input
```latex
\frac{235}{6.02 \times 10^{23}} \mathrm{molC} \times \frac{12.01 \mathrm{gC}}{1 \mathrm{molC}}
```

### Preferred output
```latex
$$
\frac{235}{6.02 \times 10^{23}}\ \mathrm{mol\ C}\times\frac{12.01\ \mathrm{g\ C}}{1\ \mathrm{mol\ C}}
$$
```

### Acceptable enhanced output
```latex
$$
\frac{235}{6.02 \times 10^{23}} \times \frac{\pu{12.01 g C}}{\pu{1 mol C}} \times \pu{mol C}
$$
```

As long as the displayed result is clean, consistent, and not raw/broken.

---

## Example 5: mixed Khmer explanation + chemistry

### Input
```text
យើងគណនាចំនួនម៉ូលរបស់ CO2 ជាមុនសិន
```

### Output
```text
យើងគណនាចំនួនម៉ូលរបស់ $\ce{CO2}$ ជាមុនសិន
```

---

## Example 6: ionic species

### Input
```text
SO4^2- reacts with Ba^2+
```

### Output
```text
$\ce{SO4^2-}$ reacts with $\ce{Ba^2+}$.
```

Or full reaction if known:

```latex
$$
\ce{Ba^2+ + SO4^2- -> BaSO4}
$$
```

---

## Implementation Requirements

## 1) Shared detection utility

Create a shared detector:

```ts
export function detectChemistryContent(input: string): boolean
```

It should check:
- explicit mhchem commands
- reaction arrows
- chemistry formula patterns
- chemistry unit patterns
- domain keywords if useful

Keep it conservative.

---

## 2) Shared chemistry normalizer

Create:

```ts
export function normalizeChemistryContent(input: string): string
```

Responsibilities:
- wrap missing math delimiters
- convert raw reaction strings to `\ce{...}`
- convert obvious formulas to `\ce{...}` in mixed prose
- normalize unit spacing
- preserve surrounding prose
- avoid damaging correct standard math

---

## 3) Shared mixed-science normalizer

Create:

```ts
export function normalizeMixedScienceContent(input: string): string
```

Responsibilities:
- preserve paragraph structure
- apply chemistry transformation only to chemistry fragments
- leave ordinary text untouched
- leave ordinary math untouched unless existing math normalization is needed

---

## 4) Renderer integration

`MarkdownMath.tsx` or your canonical renderer should:

- memoize normalized content
- select preview/full mode
- render normalized science content through one consistent path
- never duplicate chemistry normalization elsewhere

---

## 5) Preview behavior

In preview mode:
- render compact readable snippets
- replace large chemistry blocks with shortened display where needed
- never show raw `\ce{`, `\pu{`, `\mathrm{molC}`, or unwrapped LaTeX to users

---

## 6) Dev-only diagnostics

Temporarily log when chemistry is detected and normalized.

Example:

```ts
if (process.env.NODE_ENV !== "production") {
  console.log("[chem-detect]", { detected: true, snippet: input.slice(0, 120) });
}
```

Also log when fallback is used.

Remove noisy logs after validation.

---

## Performance Rules

Chemistry support must not significantly worsen responsiveness.

### Required
- memoize normalization
- keep plugin/config arrays static
- use preview mode for small cards
- do not fully render large chemistry blocks in every collapsed node
- avoid rerendering unchanged cards

This spec must follow the same performance guidelines already defined in the math performance optimization spec.

---

## File-Level Guidance

## `MarkdownMath.tsx`
- integrate chemistry detection/normalization
- keep one canonical rendering path
- use `useMemo`
- support `mode="preview" | "full"`
- avoid duplicated inline regex cleanup

## `RichText.tsx`
- delegate to shared science normalization/rendering
- do not implement a second chemistry parser
- memoize component

## `NodeInsightPanel.tsx`
- full chemistry rendering only when selected/expanded
- preview mode for compact card content
- no raw chemistry syntax leakage

## `StudySpacePage.tsx`
- pass preview/full mode intentionally
- avoid rerendering all nodes unnecessarily
- keep node props stable

---

## Acceptance Criteria

Implementation is complete when all of the following are true:

- chemistry formulas no longer leak as raw text in cards/panels
- reactions render correctly and read naturally
- chemistry formulas in Khmer/English mixed explanations display cleanly
- unit-heavy chemistry expressions are readable and consistent
- current math rendering remains correct
- no duplicated chemistry-fix logic remains across components
- preview cards remain lightweight and readable
- malformed chemistry input fails gracefully without ugly leakage

---

## Non-goals

Do not:
- replace all math with chemistry syntax
- wrap entire prose paragraphs in `\ce{}`
- rewrite correct algebraic math as chemistry
- create multiple competing renderer pipelines
- apply chemistry regex hacks separately in many components

---

## Final Instruction to Agent

Implement chemistry support as a professional extension of the existing math system:

- keep one canonical normalization pipeline
- add chemistry detection
- add mhchem-compatible normalization
- preserve prose outside chemistry fragments
- render formulas/reactions/units consistently
- keep preview mode lightweight
- do not leak raw chemistry syntax to the user

Prioritize correctness, consistency, and maintainability over scattered quick fixes.
