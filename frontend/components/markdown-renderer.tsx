import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (text: string) => {
    // Split by code blocks first to protect them
    return text.split(/(\n|```[\s\S]*?```)/g).map((segment, i) => {
      // Handle code blocks
      if (segment.startsWith('```')) {
        const language = segment.match(/^```(\w+)?/)?.[1] || 'text';
        const code = segment.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        return (
          <pre key={i} className="bg-zinc-900 rounded p-3 my-2 overflow-x-auto border border-zinc-800">
            <code className={`text-sm font-mono text-zinc-300 language-${language}`}>
              {code}
            </code>
          </pre>
        );
      }

      if (segment === '\n') {
        return <br key={i} />;
      }

      // Handle Lists
      if (segment.trim().startsWith('- ') || segment.trim().startsWith('* ')) {
        const items = segment.split('\n').filter(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));
        return (
          <ul key={i} className="list-disc list-inside my-2 space-y-1">
            {items.map((item, idx) => (
              <li key={idx} className="text-zinc-300">
                {parseInlineElements(item.replace(/^[-*]\s/, ''))}
              </li>
            ))}
          </ul>
        );
      }

      return <span key={i}>{parseInlineElements(segment)}</span>;
    });
  };

  const parseInlineElements = (text: string) => {
    let elements: (string | React.ReactNode)[] = [text];

    // 1. Parse Bold (**text**)
    elements = elements.flatMap(el => {
      if (typeof el !== 'string') return el;
      const parts = el.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    });

    // 2. Parse Inline Code (`code`)
    elements = elements.flatMap(el => {
      if (typeof el !== 'string') return el;
      const parts = el.split(/(`[^`]+`)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={idx} className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    });

    // 3. Parse Citations ([1], [Source])
    elements = elements.flatMap(el => {
      if (typeof el !== 'string') return el;
      const parts = el.split(/(\[[\d\w\s]+\])/g);
      return parts.map((part, idx) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const content = part.slice(1, -1);
          // Only treat as citation if it's a number or common source term
          if (/^\d+$/.test(content) || content.toLowerCase().includes('source') || content.toLowerCase().includes('ref')) {
            return (
              <button
                key={idx}
                className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/80 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all text-[10px] font-bold text-emerald-400 align-top mt-0.5 cursor-pointer shadow-sm active:scale-90"
              >
                {content}
              </button>
            );
          }
        }
        return part;
      });
    });

    return elements;
  };

  return (
    <div className="prose prose-invert prose-sm max-w-none break-words text-zinc-300 selection:bg-emerald-500/20">
      {parseMarkdown(content)}
    </div>
  );
}
