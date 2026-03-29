
:::writing{variant=“standard” id=“84219”}

Zupiq – Visual Table Detection, Extraction, Rendering & Scoring System

Objective

Enable Zupiq to:
	1.	Detect tables (especially math sign tables) from uploaded images/PDFs
	2.	Extract them into structured JSON
	3.	Store in study_sessions
	4.	Reuse in breakdown UI
	5.	Allow user interaction (edit/fill)
	6.	Grade table cell-by-cell
	7.	Persist scoring analytics

This system must be scalable, modular, and AI-assisted but not AI-dependent.

⸻

1. High-Level Flow

Current Flow
	•	Upload file
	•	OCR → text
	•	Breakdown → explanation

New Flow

Upload File
   ↓
OCR + Image Analysis
   ↓
Table Detection (rule-based + AI)
   ↓
Table Extraction → structured JSON (VisualTable)
   ↓
Save to study_sessions
   ↓
Breakdown (reuse table)
   ↓
Render Table UI
   ↓
User interaction (edit/fill)
   ↓
Submit answer
   ↓
Table Grading (cell-based)
   ↓
Store score + feedback


⸻

2. Data Model

2.1 VisualTable Schema

type VisualTable = {
  type: 'sign_analysis' | 'generic_table';

  parameterName?: string; // e.g. "m"

  columns: string[]; // ["m", "Δ", "P", "S", "conclusion"]

  rows: Array<{
    key: string;
    label: string; // "-∞ → 0", "0", "0 → 1/2"
    rowType: 'interval' | 'critical_point';

    values: {
      delta?: '+' | '-' | '0' | null;
      p?: '+' | '-' | '0' | null;
      s?: '+' | '-' | '0' | null;
    };

    conclusion?: string | null;
  }>;

  derivedPoints?: string[]; // ["0", "1/2", "1", "3/2", "9/2"]

  rawOcrText?: string;

  confidence: number; // 0 → 1
};


⸻

2.2 Table Score Schema

type TableScore = {
  totalScore: number;
  maxScore: number;
  percentage: number;

  sections: {
    criticalPoints: { score: number; max: number };
    deltaColumn: { score: number; max: number };
    pColumn: { score: number; max: number };
    sColumn: { score: number; max: number };
    conclusions: { score: number; max: number };
    finalAnswer: { score: number; max: number };
  };

  cellResults: Array<{
    rowKey: string;
    columnKey: string;
    expected: string | null;
    actual: string | null;
    isCorrect: boolean;
    feedback?: string;
  }>;

  summaryFeedback: string;
};


⸻

2.3 Database Fields (study_sessions)

ALTER TABLE study_sessions ADD COLUMN visual_table_json jsonb;
ALTER TABLE study_sessions ADD COLUMN table_type text;
ALTER TABLE study_sessions ADD COLUMN table_detected boolean DEFAULT false;
ALTER TABLE study_sessions ADD COLUMN table_confidence numeric;
ALTER TABLE study_sessions ADD COLUMN table_score_json jsonb;
ALTER TABLE study_sessions ADD COLUMN table_user_answer_json jsonb;


⸻

3. Backend Implementation

3.1 Update /api/ai/analyze-image

Response Format

type AnalyzeImageResponse = {
  analysis: string;

  analysis_structured?: {
    text?: string;
    plain_text?: string;
  };

  table_detection?: {
    detected: boolean;
    type: 'sign_analysis' | 'generic';
    confidence: number;
  };

  visual_table?: VisualTable | null;
};


⸻

3.2 Table Detection (Hybrid)

Rule-Based Detection

Trigger table_detected = true if:
	•	OCR contains:
	•	“Δ”, “P”, “S”
	•	“∞”, “-∞”
	•	fractions (e.g. 1/2, 3/2)
	•	Multiple aligned columns detected
	•	Repeated row-like patterns

⸻

AI Detection Prompt

Determine if the OCR text represents a mathematical table.

Return:
{
  "detected": boolean,
  "type": "sign_analysis" | "generic",
  "confidence": number
}


⸻

3.3 Table Extraction (STRICT JSON)

Prompt

Extract a structured math table from OCR text.

Rules:
- Return valid JSON only
- Do NOT explain
- Preserve row order
- Use null for unreadable cells
- Detect:
  - parameter name
  - columns
  - rows
  - interval labels
  - sign values

Output:
{
  "visualTable": {...},
  "confidence": number
}


⸻

3.4 Persist Table

In StudySpacePage.tsx:
	•	On analyze response:
	•	if visual_table exists:
	•	store in local state
	•	save to backend immediately

⸻

3.5 Breakdown Integration

Update /api/ai/breakdown input:

{
  problem_text: string,
  visual_table?: VisualTable
}

Rule:
	•	If visual_table exists → DO NOT regenerate table
	•	Reuse it in reasoning

⸻

4. Frontend Implementation

4.1 Table Renderer Component

Create:

components/ai/VisualTableRenderer.tsx

Features:
	•	Dynamic columns
	•	Editable cells
	•	Interval row labels
	•	Sign input: + / - / 0 (tap selection)
	•	Highlight correctness after grading

⸻

4.2 Interaction Modes

Mode A: AI Filled Table
	•	Show complete table
	•	Read-only or editable

Mode B: Practice Mode
	•	Show structure only
	•	Empty cells
	•	User fills table

⸻

4.3 UX Rules
	•	Tap cell → toggle + / - / 0
	•	Long press → clear
	•	Highlight:
	•	correct = green
	•	wrong = red
	•	Show inline feedback per row

⸻

5. Table Grading Engine

5.1 Input

{
  correctTable: VisualTable,
  userTable: VisualTable
}


⸻

5.2 Scoring Logic

Check:
	1.	Critical points (derivedPoints)
	2.	Row ordering
	3.	Δ column
	4.	P column
	5.	S column
	6.	Conclusions
	7.	Final solution set

⸻

5.3 Output

Return TableScore

⸻

5.4 Example Rule

if (userCell === correctCell) {
  score += 1;
} else {
  feedback = "Sign is incorrect. Check factor behavior around this interval.";
}


⸻

6. API Endpoints

POST /api/ai/analyze-image
	•	returns OCR + table

POST /api/ai/breakdown
	•	accepts visual_table

POST /api/ai/grade-table
	•	input:
	•	correctTable
	•	userTable
	•	output:
	•	TableScore

⸻

7. Error Handling
	•	If confidence < 0.6:
	•	show warning
	•	allow manual correction
	•	If extraction fails:
	•	fallback to OCR-only mode

⸻

8. Future Improvements
	•	Train model on Khmer handwritten tables
	•	Auto-detect table type (probability, truth table, matrix)
	•	Voice explanation of table logic
	•	Auto-generate practice tables from patterns

⸻

9. Key Design Principles
	•	Table = first-class structured object
	•	Never rely on raw OCR for logic
	•	Reuse table across entire session
	•	Score granularly (cell-level)
	•	Always allow user correction

⸻

10. Expected Outcome

After implementation:
	•	Zupiq can intelligently read student notebook tables
	•	Convert them into interactive UI
	•	Guide learning step-by-step
	•	Provide detailed grading and feedback
	•	Create a strong differentiation vs generic AI tutors

⸻

END
:::
