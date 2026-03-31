import katex from 'katex';

interface Props {
  children: string;
  /** If true, render the whole string as a math block (for pure math fields like mathContent) */
  math?: boolean;
  className?: string;
}

/**
 * Renders a string that may contain LaTeX math.
 *
 * - math=true  → render entire string as KaTeX (for pure math fields)
 * - math=false → split on $...$ / $$...$$ delimiters and render inline/block math segments,
 *               plain text segments render as-is. Also handles bare LaTeX (starts with \)
 *               by attempting a full KaTeX render with fallback to plain text.
 */
export function MathText({ children, math = false, className }: Props) {
  if (!children) return null;
  // Normalize double-backslash as newline for better AI output handling
  const preNormalized = children.replace(/\\\\(?![a-zA-Z])/g, '\n');
  const normalizedInput = autoWrapInlineMathForRender(normalizeMultilineInlineMathBlocks(preNormalized));

  // Some model outputs mix narrative text with inline $...$ math even in "math" fields.
  // In that case, use mixed rendering instead of forcing one KaTeX block.
  if (math && (isMixedNarrativeMath(normalizedInput) || isLikelyNarrativeMathWithoutDelimiters(normalizedInput))) {
    const parts = splitMathSegments(normalizedInput);
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.value}</span>
          ) : (
            <span
              key={i}
              className="no-scrollbar"
              style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', verticalAlign: 'middle' }}
              dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, part.type === 'display') }}
            />
          )
        )}
      </span>
    );
  }

  if (math || looksLikePureLaTeX(normalizedInput)) {
    // Strip outer $$ or $ delimiters the AI may include in mathContent fields
    let src = normalizedInput.trim();
    if (src.startsWith('$$') && src.endsWith('$$') && src.length > 4) {
      src = src.slice(2, -2).trim();
    } else if (src.startsWith('$') && src.endsWith('$') && src.length > 2) {
      src = src.slice(1, -1).trim();
    }
    // If caller forced math mode but the content is ordinary text, keep normal text flow.
    if (!looksLikeMathExpression(src)) {
      return (
        <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {normalizedInput}
        </span>
      );
    }
    return (
      <span
        className={`${className || ''} no-scrollbar`}
        style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', verticalAlign: 'middle' }}
        dangerouslySetInnerHTML={{ __html: renderKaTeX(src, false) }}
      />
    );
  }

  // Mixed text — split on $$...$$ and $...$ delimiters
  const parts = splitMathSegments(normalizedInput);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span
            key={i}
            className="no-scrollbar"
            style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', verticalAlign: 'middle' }}
            dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, part.type === 'display') }}
          />
        )
      )}
    </span>
  );
}

function isMathDebugEnabled(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as unknown as { __ZUPIQ_MATH_DEBUG__?: boolean }).__ZUPIQ_MATH_DEBUG__);
}

function toCodePoints(input: string): string[] {
  return Array.from(input).map((ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
}

function normalizeLatexInput(src: string): string {
  // Some model outputs contain over-escaped commands (e.g. \\circ instead of \circ).
  // Normalize only command-style sequences to avoid touching intended plain backslashes.
  return src
    .replace(/\u200b/g, '')
    .replace(/\\{2,}(?=[A-Za-z])/g, '\\')
    // Fix common OCR/model math-token merge: ln\left(...) -> \ln\left(...).
    .replace(/\bln\\left\b/g, '\\ln\\left')
    // Normalize escaped control-sequence artifacts produced by OCR/model output.
    .replace(/\\+n(?![a-zA-Z])/g, '\n')
    .replace(/\\+r(?![a-zA-Z])/g, ' ')
    .replace(/\\+t(?![a-zA-Z])/g, ' ')
    .replace(/\\+b(?![a-zA-Z])/g, ' ')
    .replace(/\\+f(?![a-zA-Z])/g, ' ')
    .replace(/\\\$/g, '$')
    .replace(/,\s*,/g, '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function containsNonMathUnicode(src: string): boolean {
  return /[\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(src);
}

function latexToPlainText(src: string): string {
  return src
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\^\{?\\circ\}?/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\degree/g, '°')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/_{([^}]*)}/g, ' $1')
    .replace(/\^{([^}]*)}/g, '^$1')
    .replace(/_([^\s{\\])/g, ' $1')
    .replace(/\^([^\s{\\])/g, '^$1')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[a-zA-Z]+\s*/g, '')
    .replace(/[{}]/g, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderKaTeX(src: string, displayMode: boolean): string {
  const normalized = normalizeLatexInput(src)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ');
  const trimmed = normalized.trim();
  const mathDebug = isMathDebugEnabled();
  
  if (mathDebug && (/\\circ|°|\^|_/.test(trimmed) || /\\[a-zA-Z]+/.test(trimmed))) {
    console.debug('[MathText debug] renderKaTeX input', {
      src,
      normalized,
      trimmed,
      displayMode,
      containsNonMathUnicode: containsNonMathUnicode(trimmed),
      codePoints: toCodePoints(trimmed),
    });
  }

  const hasNonMath = containsNonMathUnicode(trimmed);
  
  try {
    // If it contains non-math unicode (like Khmer), KaTeX usually fails to render it
    // unless it's handled very carefully. To prevent console errors and broken renders,
    // we fallback to plain text rendering for any segment containing these characters.
    if (hasNonMath) {
       return `<span class="font-sans">${trimmed.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '')}</span>`;
    }

    return katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode,
      output: 'html',
      trust: true,
      strict: false,
    });
  } catch (err) {
    if (mathDebug) {
      console.warn('[MathText debug] KaTeX render failed', {
        trimmed,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return hasNonMath ? `<span class="font-sans">${trimmed}</span>` : latexToPlainText(trimmed);
  }
}

/** Returns true if the whole string is bare LaTeX (no $ delimiters, but contains \ commands) */
function looksLikePureLaTeX(s: string): boolean {
  const t = s.trim();
  if (!t || t.includes('$')) return false;
  if (!/\\[a-zA-Z{\\]/.test(t)) return false;
  if (containsNonMathUnicode(t)) return false;

  // If there are many long natural-language words, this is likely prose with a math fragment.
  const proseWordCount = (
    t
      .replace(/\\[a-zA-Z]+(?:\s*\{[^{}]*\})?/g, ' ')
      .replace(/[0-9=+\-*/^_{}()[\],.;:<>|]/g, ' ')
      .match(/[A-Za-z]{3,}/g) ?? []
  ).length;

  return proseWordCount <= 2;
}

function looksLikeMathExpression(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/\\[a-zA-Z\\]+/.test(t)) return true;
  if (/[=+\-*/^_{}[\]()]/.test(t)) return true;
  if (/\d/.test(t)) return true;
  if (/[α-ωΑ-Ω∞≈≤≥≠±×÷]/.test(t)) return true;
  return false;
}

function isMixedNarrativeMath(s: string): boolean {
  const hasDelimitedMath = /\$\$[\s\S]+?\$\$/.test(s)
    || /\$[^$\n]+?\$/.test(s)
    || /\\\[[\s\S]+?\\\]/.test(s)
    || /\\\([\s\S]+?\\\)/.test(s);
  if (!hasDelimitedMath) return false;

  const outsideMath = s
    .replace(/\$\$[\s\S]+?\$\$/g, " ")
    .replace(/\$[^$\n]+?\$/g, " ")
    .replace(/\\\[[\s\S]+?\\\]/g, " ")
    .replace(/\\\([\s\S]+?\\\)/g, " ")
    .trim();

  return /[A-Za-z\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(outsideMath);
}

function isLikelyNarrativeMathWithoutDelimiters(s: string): boolean {
  const t = s.trim();
  if (!t || /\$\$?/.test(t)) return false;

  const hasMathSignal = /\\[a-zA-Z]+|[=+\-*/^_]|\d/.test(t);
  if (!hasMathSignal) return false;

  // Non-Latin scripts are frequently OCR narrative text with embedded math snippets.
  if (containsNonMathUnicode(t)) return true;

  // English/Latin prose with math commands, e.g. "initial speed 20 \mathrm{m/s}".
  const proseWords = t.match(/[A-Za-z]{3,}/g) ?? [];
  return proseWords.length >= 3;
}

function normalizeMultilineInlineMathBlocks(text: string): string {
  return (text ?? '').replace(/\$([\s\S]+?)\$/g, (_match, inner: string) => {
    const innerNormalized = (inner ?? '')
      .replace(/\u200b/g, '')
      .replace(/\\+n(?![a-zA-Z])/g, '\n')
      .replace(/\r\n?/g, '\n')
      .trim();

    if (!innerNormalized) return '$$';
    if (!innerNormalized.includes('\n')) return `$${innerNormalized}$`;

    const lines = innerNormalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) return `$${innerNormalized}$`;

    return lines.map((line) => `$$${line}$$`).join('\n');
  });
}

function autoWrapInlineMathForRender(text: string): string {
  const mathDebug = isMathDebugEnabled();
  const mathDelimited = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  const segments = text.split(mathDelimited);

  const result = segments.map((segment) => {
    if (!segment) return segment;
    if (segment.startsWith('$') || segment.startsWith('\\(') || segment.startsWith('\\[')) return segment;

    let next = segment;

    // e.g. 20 \mathrm{m/s}, g = 9.8 \mathrm{m/s}^2
    next = next.replace(
      /(?:\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\s*=\s*)?\d+(?:\.\d+)?\s*(?:\\(?:text|mathrm)\{[^{}]+\})(?:\s*(?:\^\{[^{}]+\}|\^[0-9A-Za-z]+))?/g,
      (match) => `$${match.trim()}$`
    );

    // e.g. g = 9.8 m/s^2
    next = next.replace(
      /\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\s*=\s*\d+(?:\.\d+)?\s*[A-Za-z]+(?:\/[A-Za-z]+)+(?:\^\d+)?\b/g,
      (match) => `$${match.trim()}$`
    );

    // e.g. F_x = F \cos\theta, a = b \times c, F_{acting} = F_g F_{air} = 0, x_1 = 0, \{ F_g \}
    // Matches optional assignment, followed by optional terms, and at least one LaTeX command or subscript/superscript.
    next = next.replace(
      /(?:\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9α-ωΑ-Ω{}]+|\^[a-zA-Z0-9α-ωΑ-Ω{}]+)?\s*=\s*)?[A-Za-z0-9α-ωΑ-Ω\s.+\-*/^_{}()|[\]<>\\≤≥≈≠±×÷\u200b]*(\\[a-zA-Z]+|\\[{}]|\\\\|[_^]\{[^{}]+\}|[_^][a-zA-Z0-9α-ωΑ-Ω])(?:\s*[=+\-*/^_{}()|[\]<>\\≤≥≈≠±×÷\u200b]*\s*[A-Za-z0-9α-ωΑ-Ω{}\\\u200b]+)*/g,
      (match) => {
        const trimmed = match.trim();
        // If it looks like a legitimate math fragment (has a command or sub/sup and some structure)
        if (trimmed.length > 2 && (/\\[a-zA-Z{}]+|\\\\/.test(trimmed) || /[_^]/.test(trimmed))) {
          // Don't wrap if braces are unbalanced — means the regex captured a partial LaTeX
          // command like \text{ whose argument contains non-ASCII characters (e.g. Khmer)
          // that stop the match before the closing brace.
          const openBraces = (trimmed.match(/\{/g) ?? []).length;
          const closeBraces = (trimmed.match(/\}/g) ?? []).length;
          if (openBraces !== closeBraces) return match;
          return `$${trimmed}$`;
        }
        return match;
      }
    );

    return next;
  }).join('');

  if (mathDebug && result !== text) {
    console.debug('[MathText debug] autoWrapInlineMathForRender changed text', {
      original: text,
      wrapped: result
    });
  }
  return result;
}

type Segment = { type: 'text' | 'inline' | 'display'; value: string };

function stripOrphanDollars(s: string): string {
  return s.replace(/\$+/g, '');
}

/**
 * Push a math segment. If the value contains non-math Unicode (e.g. Khmer mixed with LaTeX),
 * split it into text + math sub-segments so renderKaTeX never receives Khmer alongside LaTeX.
 *
 * Strategy:
 *  1. Unwrap \text{…} / \mathrm{…} wrappers whose argument contains non-math Unicode.
 *  2. Split the resulting string on runs of non-math Unicode characters.
 *  3. Non-math-Unicode runs → 'text' segments; everything else → 'inline' math segments.
 */
function pushMathSegment(out: Segment[], value: string, type: 'inline' | 'display'): void {
  if (!containsNonMathUnicode(value)) {
    out.push({ type, value });
    return;
  }

  // Step 1: unwrap \text{…} / \mathrm{…} etc. whose content has non-math Unicode.
  const unwrapped = value.replace(
    /\\(?:text|mathrm|mbox|textrm|textit|textbf)\{([^{}]*)\}/g,
    (_match, inner: string) => (containsNonMathUnicode(inner) ? ` ${inner} ` : _match),
  );

  // Step 2: split on runs of non-math Unicode characters.
  const NON_MATH_RUN = /[\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  NON_MATH_RUN.lastIndex = 0;

  while ((m = NON_MATH_RUN.exec(unwrapped)) !== null) {
    if (m.index > last) {
      const mathPart = unwrapped.slice(last, m.index).trim();
      if (mathPart) out.push({ type: 'inline', value: mathPart });
    }
    out.push({ type: 'text', value: m[0] });
    last = m.index + m[0].length;
  }

  if (last < unwrapped.length) {
    const mathPart = unwrapped.slice(last).trim();
    if (mathPart) out.push({ type: 'inline', value: mathPart });
  }
}

function splitMathSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const mathDebug = isMathDebugEnabled();
  // Match $$...$$ / \[...\] first (display), then $...$ / \(...\) (inline),
  // then bare LaTeX commands (consistent with RichText)
  const regex = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}|(\\[a-zA-Z]+|\\[{}]|\\\\|\\,)(?:\{[^{}]*\})?(?:(?:\^\{[^{}]*\}|\^[^\s{}]+|_\{[^{}]*\}|_[^\s{}]+))*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: stripOrphanDollars(text.slice(last, match.index)) });
    }
    if (match[1] !== undefined) {
      pushMathSegment(segments, match[1], 'display');
    } else if (match[2] !== undefined) {
      pushMathSegment(segments, match[2], 'inline');
    } else if (match[3] !== undefined) {
      pushMathSegment(segments, match[3], 'display');
    } else if (match[4] !== undefined) {
      pushMathSegment(segments, match[4], 'inline');
    } else if (match[5] !== undefined) {
      pushMathSegment(segments, match[5], 'inline');
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    const remaining = text.slice(last);
    // If remaining text has bare LaTeX, render as math; otherwise plain text
    segments.push(
      looksLikePureLaTeX(remaining)
        ? { type: 'inline', value: remaining }
        : { type: 'text', value: stripOrphanDollars(remaining) }
    );
  }

  if (mathDebug) {
    const mathSegments = segments.filter((s) => s.type !== 'text');
    if (mathSegments.length) {
      console.debug('[MathText debug] splitMathSegments', {
        input: text,
        segments: mathSegments.map((s) => ({
          type: s.type,
          value: s.value,
          codePoints: toCodePoints(s.value),
        })),
      });
    }
  }

  return segments;
}
