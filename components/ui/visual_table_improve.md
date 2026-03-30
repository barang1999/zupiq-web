
:::writing{variant=“standard” id=“48291”}

Sign Table Rendering Standard (Zupiq)

Purpose

Define a mathematically correct and visually professional way to render sign tables for expressions (Δ, P, S, etc.) in Zupiq.

This standard ensures:
	•	Correct mathematical interpretation
	•	Consistent UI/UX across devices
	•	Clear learning experience for students

⸻

Core Principles

1. Separate Intervals vs Points

A sign table must distinguish between:
	•	Intervals → where signs apply
	•	Critical points → where value = 0 or undefined

Rule:
	•	Intervals = main rows
	•	Critical points = separators (NOT full rows)

⸻

2. Do NOT Render “0” Inside Cells

❌ Incorrect:
| (0, 1/2) | 0 |

✅ Correct:
	•	The value 0 must NOT appear inside a row cell
	•	It must be represented at the boundary between intervals

⸻

3. Critical Points Rendering

Critical points include:
	•	Zeros of expressions
	•	Undefined points (e.g., denominator = 0)

Visual Rules:
	•	Render as thin horizontal separator rows
	•	No background fill (or lighter opacity)
	•	Smaller height than interval rows
	•	Optional: label centered (e.g., m = 1/2)

Example:

(0, 1/2)
────────────  ← m = 1/2
(1/2, 1)


⸻

4. Interval Rows (Main Rows)

Each interval row must:
	•	Represent ONLY open intervals (e.g., (0, 1/2))
	•	Contain ONLY signs: + or −
	•	Never contain 0 or undefined

⸻

5. Handling Undefined Values

For expressions like:
	•	P = (2m - 1) / m
	•	S = …

At m = 0:
	•	Do NOT show 0
	•	Do NOT show + or −

Instead:
	•	Leave cell empty OR show subtle indicator:
	•	∅ or — (preferred minimal UI)

⸻

Table Structure

Columns

| m (interval) | Δ | P | S | Conclusion |


⸻

Rendering Model

Example Structure:

(-∞, 0)        |  +  |  +  |  -  |
──────────────  m = 0 (undefined)
(0, 1/2)       |  +  |  -  |  +  |
──────────────  m = 1/2 (zero of P)
(1/2, 1)       |  +  |  +  |  +  |
──────────────  m = 1 (zero of Δ)
(1, 3/2)       |  -  |  +  |  +  |
──────────────  m = 3/2 (zero of S)
(3/2, 9/2)     |  -  |  +  |  -  |
──────────────  m = 9/2 (zero of Δ)
(9/2, +∞)      |  +  |  +  |  -  |


⸻

UI / Design Guidelines

1. Visual Hierarchy
	•	Interval rows → primary (full height)
	•	Critical rows → secondary (thin divider)

⸻

2. Sign Styling
	•	+ → green (success)
	•	− → red (danger)
	•	Must be centered

⸻

3. Critical Point Styling
	•	Smaller font
	•	Muted color (gray / low opacity)
	•	Optional italic

Example:

m = 1/2


⸻

4. Spacing
	•	Interval row height: 44–56px
	•	Critical row height: 16–24px

⸻

5. Alignment
	•	Signs aligned vertically across columns
	•	Critical points aligned with column grid

⸻

Logic Rules for AI Generation

Step 1: Detect Critical Points

Collect:
	•	Roots of numerator
	•	Roots of denominator
	•	Roots of Δ (if present)

⸻

Step 2: Sort Points

Sort all critical values in ascending order

⸻

Step 3: Build Intervals

Construct:

(-∞, a)
(a, b)
(b, c)
...
(c, +∞)


⸻

Step 4: Evaluate Signs Per Interval

Pick a test value in each interval and evaluate:
	•	Δ
	•	P
	•	S

Assign:
	•	+ if positive
	•	− if negative

⸻

Step 5: Render Table
	•	Intervals → rows
	•	Critical points → separators
	•	NEVER render 0 inside cells

⸻

Strict Rules (Must Follow)
	•	❌ No “0” inside interval rows
	•	❌ No mixing point rows with interval rows
	•	❌ No signs on undefined points
	•	✅ Always separate boundaries visually
	•	✅ Always maintain consistent spacing

⸻

Optional Enhancements (Zupiq)
	•	Animate sign transitions across intervals
	•	Highlight active interval during explanation
	•	Tap on boundary → show why it’s zero/undefined
	•	Tooltip: “m = 1/2 → makes P = 0”

⸻

Final Goal

The table must feel:
	•	Like a textbook standard
	•	With Apple-level UI clarity
	•	And zero ambiguity for students

⸻

:::
