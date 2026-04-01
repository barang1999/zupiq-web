import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { createSciencePreview, detectChemistryContent } from '../../lib/aiContent/normalizeScienceContent';

interface Props {
  content: string;
  className?: string;
  /** If true, remove standard block margins and use smaller text sizes for tight spaces like tables */
  discreet?: boolean;
  /** 'full' for complete math rendering, 'preview' for simplified view in cards */
  mode?: 'full' | 'preview';
}

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [
  [rehypeKatex, {
    strict: false,
    trust: true,
  }]
];

function MarkdownMathInner({ content, className, discreet = false, mode = 'full' }: Props) {
  if (import.meta.env.DEV) {
    const isChem = detectChemistryContent(content);
    console.debug('[MarkdownMath render]', { contentLength: content?.length, mode, isChem });
  }
  if (!content?.trim()) return null;

  const displayContent = useMemo(() => {
    if (mode === 'preview') return createSciencePreview(content);
    return content;
  }, [mode, content]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS as any}
        components={{
          p: ({ children }) => (
            <p className={`${discreet ? 'mb-0' : 'mb-3'} leading-relaxed last:mb-0`}>
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className={`list-disc pl-5 ${discreet ? 'mb-1' : 'mb-3'} space-y-1`}>{children}</ul>,
          ol: ({ children }) => <ol className={`list-decimal pl-5 ${discreet ? 'mb-1' : 'mb-3'} space-y-1`}>{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className={`${discreet ? 'text-base' : 'text-xl'} font-bold mb-3 mt-4`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`${discreet ? 'text-sm' : 'text-lg'} font-bold mb-2 mt-3`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`${discreet ? 'text-xs' : 'text-base'} font-bold mb-2 mt-2`}>{children}</h3>,
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownMath = React.memo(MarkdownMathInner);
export default MarkdownMath;
