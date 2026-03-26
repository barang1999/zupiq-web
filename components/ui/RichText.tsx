import React from 'react';
import katex from 'katex';

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders AI-generated text that may contain:
 * - Markdown: **bold**, *italic*, ## headings, bullet lists (* / - / numbered)
 * - Math: $...$ inline, $$...$$ display
 * - Newlines and paragraph breaks
 * - Stray lone asterisks or hashes (stripped)
 */
export function RichText({ children, className }: Props) {
  if (!children) return null;
  const cleaned = clean(children);
  const blocks = parseBlocks(cleaned);

  // Optional debug: enable manually with `window.__ZUPIQ_RICHTEXT_DEBUG__ = true`.
  const shouldDebug = isRichTextDebugEnabled();
  if (shouldDebug && (cleaned !== children || /(\$[^$\n]+\$\s*\*:)|\\frac|\\\$|\\[a-zA-Z]+/.test(children))) {
    console.log('[RichText debug] raw->cleaned->blocks', {
      raw: children,
      cleaned,
      blocks,
    });
  }

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="font-semibold text-on-surface mt-3 mb-1 break-words">
              {renderInline(block.text!)}
            </p>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="space-y-1 my-2 pl-1">
              {block.items!.map((item, j) => (
                <li key={j} className="flex gap-2 items-start break-words">
                  <span className="text-primary shrink-0 mt-0.5">•</span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'math') {
          return (
            <div
              key={i}
              className="my-2 text-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(block.text!, true) }}
            />
          );
        }
        return (
          <p key={i} className="my-1 leading-relaxed break-words">
            {renderInline(block.text!)}
          </p>
        );
      })}
    </div>
  );
}

function isRichTextDebugEnabled(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as unknown as { __ZUPIQ_RICHTEXT_DEBUG__?: boolean }).__ZUPIQ_RICHTEXT_DEBUG__);
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
  return src.replace(/\\\\(?=[A-Za-z])/g, '\\');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'math'; text: string };

// ─── Pre-clean ────────────────────────────────────────────────────────────────

/** Strip common AI markdown artifacts that shouldn't appear as literals */
function clean(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\\\$/g, '$')            // unescape \$...\$ emitted by model
    .replace(/(\$[^$\n]+\$)\s*\*:\s*/g, '$1: ') // `$a > 0$ *:` -> `$a > 0$:`
    .replace(/\n[ \t]*•[ \t]*\n/g, '\n• ') // normalize isolated bullet marker lines
    .replace(/\n[ \t]*\*[ \t]*\n/g, '\n• ') // normalize isolated * marker lines
    .replace(/\n[ \t]*\*[ \t]+/g, '\n• ')   // normalize markdown bullets with odd spacing
    .replace(/(\$[^$\n]+\$)\s*\*\s*(?=\$[^$\n]+\$)/g, '$1\n• ') // split malformed inline bullet between math chunks
    .replace(/\$(\s*)\*(?!\*)/g, (_m, ws: string) => `$${ws}`) // `$math$*` -> `$math$`, but keep `**` bold markers
    .replace(/\*{3,}/g, ' ')           // `***` → space
    .replace(/[ \t]{2,}/g, ' ')        // collapse multiple spaces
    .trim();
}

// ─── Block parser ─────────────────────────────────────────────────────────────

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  // Split on double+ newlines for paragraph/section breaks
  const rawBlocks = text.split(/\n{2,}/);

  for (const raw of rawBlocks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Display math block $$...$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      blocks.push({ type: 'math', text: trimmed.slice(2, -2).trim() });
      continue;
    }

    const lines = trimmed.split('\n');

    // Classify each line
    const classified = lines.map(line => {
      const t = line.trim();
      if (/^#{1,3}\s/.test(t)) return { kind: 'heading', text: t.replace(/^#{1,3}\s+/, '') };
      if (/^(\*\s*|-\s|•\s*|\d+\.\s)/.test(t)) return { kind: 'bullet', text: t.replace(/^(\*\s*|-\s|•\s*|\d+\.\s)/, '') };
      if (t.startsWith('$$') && t.endsWith('$$') && t.length > 4) return { kind: 'math', text: t.slice(2, -2).trim() };
      return { kind: 'text', text: t };
    });

    // Group consecutive bullets into lists; headings and text into their own blocks
    let i = 0;
    while (i < classified.length) {
      const c = classified[i];

      if (c.kind === 'heading') {
        blocks.push({ type: 'heading', text: c.text });
        i++;
        continue;
      }

      if (c.kind === 'math') {
        blocks.push({ type: 'math', text: c.text });
        i++;
        continue;
      }

      if (c.kind === 'bullet') {
        const items: string[] = [];
        while (i < classified.length && classified[i].kind === 'bullet') {
          items.push(classified[i].text);
          i++;
        }
        blocks.push({ type: 'list', items });
        continue;
      }

      // Accumulate consecutive text lines into a paragraph
      const textLines: string[] = [];
      while (i < classified.length && classified[i].kind === 'text') {
        textLines.push(classified[i].text);
        i++;
      }
      if (textLines.length) {
        blocks.push({ type: 'paragraph', text: textLines.join(' ') });
      }
    }
  }

  return blocks;
}

// ─── Inline renderer ──────────────────────────────────────────────────────────

type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'math'; value: string; display: boolean };

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Order matters: $$, $, **, *, bare LaTeX
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]|\*\*(.+?)\*\*|\*([^*\n]+?)\*|(\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}|\\[a-zA-Z]+(?:\{[^{}]*\})?)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: stripOrphanMarkers(text.slice(last, match.index)) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'math', value: match[1], display: true });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'math', value: match[2], display: false });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'math', value: match[3], display: false });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'math', value: match[4], display: true });
    } else if (match[5] !== undefined) {
      segments.push({ type: 'bold', value: match[5] });
    } else if (match[6] !== undefined) {
      // Only treat as italic if it looks intentional (not a stray *)
      const v = match[6];
      if (v.trim().length > 0) segments.push({ type: 'italic', value: v });
    } else if (match[7] !== undefined) {
      segments.push({ type: 'math', value: match[7], display: false });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: stripOrphanMarkers(text.slice(last)) });
  }

  return segments;
}

/** Remove lone * or # or $ characters that aren't part of markdown/math syntax */
function stripOrphanMarkers(s: string): string {
  return s
    .replace(/(?<!\*)\*(?!\*)/g, ' ')  // lone * → space (preserve word boundary)
    .replace(/#{1,3}(?!\s)/g, ' ')     // # not followed by space → space
    .replace(/\$+/g, '')               // orphan $ signs (regex already consumed valid pairs)
    .replace(/[ \t]{2,}/g, ' ');       // collapse any double spaces created above
}

function renderInline(text: string): React.ReactNode[] {
  const segs = parseInline(text);
  const nodes: React.ReactNode[] = [];
  const mathDebug = isMathDebugEnabled();

  if (mathDebug) {
    const mathSegments = segs.filter((s): s is Extract<InlineSegment, { type: 'math' }> => s.type === 'math');
    if (mathSegments.length) {
      console.debug('[RichText math debug] inline segments', {
        input: text,
        segments: mathSegments.map((s) => ({
          value: s.value,
          display: s.display,
          codePoints: toCodePoints(s.value),
        })),
      });
    }
  }

  segs.forEach((seg, i) => {
    // Inject a space between adjacent segments when the boundary has no space.
    // e.g. `about**turning**` → `about` + `turning` collide without this.
    if (i > 0) {
      const prev = segs[i - 1];
      const prevEndsWithSpace = segTail(prev).endsWith(' ') || segTail(prev) === '';
      const currStartsWithSpace = segHead(seg).startsWith(' ') || segHead(seg) === '';
      if (!prevEndsWithSpace && !currStartsWithSpace && shouldInsertBoundarySpace(segTail(prev), segHead(seg))) {
        nodes.push(<span key={`sp-${i}`}> </span>);
      }
    }

    if (seg.type === 'bold') {
      nodes.push(
        <strong key={i} className="font-semibold text-on-surface">
          {renderInline(seg.value)}
        </strong>
      );
    } else if (seg.type === 'italic') {
      nodes.push(<em key={i} className="italic opacity-90">{seg.value}</em>);
    } else if (seg.type === 'math') {
      nodes.push(
        <span
          key={i}
          style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', verticalAlign: 'middle' }}
          dangerouslySetInnerHTML={{ __html: renderKaTeX(seg.value, seg.display) }}
        />
      );
    } else {
      nodes.push(<span key={i}>{seg.value}</span>);
    }
  });

  return nodes;
}

/** Last visible character of a segment (used for space detection) */
function segTail(seg: InlineSegment): string {
  if (seg.type === 'math') return 'M';
  return seg.value.slice(-1);
}

/** First visible character of a segment */
function segHead(seg: InlineSegment): string {
  if (seg.type === 'math') return 'M';
  return seg.value.slice(0, 1);
}

function isWordLikeBoundaryChar(ch: string): boolean {
  return /[A-Za-z0-9\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(ch);
}

function shouldInsertBoundarySpace(prevTail: string, currHead: string): boolean {
  const prevWordLike = prevTail === 'M' || isWordLikeBoundaryChar(prevTail) || prevTail === ')' || prevTail === ']';
  const currWordLike = currHead === 'M' || isWordLikeBoundaryChar(currHead) || currHead === '(' || currHead === '[';
  return prevWordLike && currWordLike;
}

// ─── KaTeX ────────────────────────────────────────────────────────────────────

/** True if the string contains characters outside ASCII + common math Unicode ranges.
 *  Used to skip KaTeX for text like Khmer/Arabic/CJK that Gemini mistakenly wraps in $...$. */
function containsNonMathUnicode(src: string): boolean {
  return /[\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(src);
}

/**
 * Convert LaTeX markup to readable plain text.
 * Used when a math block contains non-Latin script that KaTeX can't render.
 * e.g. "A_{បន្ទប់} = 8 \text{ m} \times 5 \text{ m}" → "A បន្ទប់ = 8 m × 5 m"
 */
function latexToPlainText(src: string): string {
  return src
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')  // \frac{a}{b} → a/b
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')              // \sqrt{x} → √(x)
    .replace(/\^\{?\\circ\}?/g, '°')                     // ^\circ / ^{\circ} → °
    .replace(/\\circ/g, '°')                             // \circ → °
    .replace(/\\degree/g, '°')                           // \degree → °
    .replace(/\\text\{([^}]*)\}/g, '$1')                 // \text{word} → word
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/_{([^}]*)}/g, ' $1')                       // _{sub} → sub
    .replace(/\^{([^}]*)}/g, '^$1')                      // ^{sup} → ^sup
    .replace(/_([^\s{\\])/g, ' $1')                      // _x → x
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
    .replace(/\\[a-zA-Z]+\s*/g, '')                      // remaining commands → remove
    .replace(/[{}]/g, '')                                 // stray braces → remove
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderKaTeX(src: string, displayMode: boolean): string {
  const normalized = normalizeLatexInput(src);
  const trimmed = normalized.trim();
  const mathDebug = isMathDebugEnabled();
  if (mathDebug && (/\\circ|°|\^|_/.test(trimmed) || /\\[a-zA-Z]+/.test(trimmed))) {
    console.debug('[RichText math debug] renderKaTeX input', {
      src,
      normalized,
      trimmed,
      displayMode,
      containsNonMathUnicode: containsNonMathUnicode(trimmed),
      codePoints: toCodePoints(trimmed),
    });
  }
  if (containsNonMathUnicode(trimmed)) {
    return `<span class="font-sans">${latexToPlainText(trimmed)}</span>`;
  }
  try {
    return katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode,
      output: 'html',
      trust: false,
    });
  } catch (err) {
    if (mathDebug) {
      console.warn('[RichText math debug] KaTeX render failed', {
        trimmed,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return latexToPlainText(trimmed);
  }
}
