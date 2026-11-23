
// Safe Markdown renderer for AI replies.
// Supports paragraphs, bullet/numbered lists, headings,
// bold, italic and inline code. Never renders raw HTML.

function inline(text, keyBase) {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;

  let last = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      out.push(text.slice(last, match.index));
    }

    const token = match[0];
    const key = `${keyBase}-${i++}`;

    if (token.startsWith('**')) {
      out.push(
        <strong
          key={key}
          className="font-semibold text-[#F2EDE0]"
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      out.push(
        <code
          key={key}
          className="rounded border border-[#343A35] bg-[#101311] px-1.5 py-0.5 font-mono text-[0.85em] text-[#3DD68C]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      out.push(
        <em key={key} className="text-[#D8DCD5]">
          {token.slice(1, -1)}
        </em>
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    out.push(text.slice(last));
  }

  return out;
}

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;

  const flush = () => {
    if (!list) return;

    const Tag = list.ordered ? 'ol' : 'ul';
    const key = `list-${blocks.length}`;

    blocks.push(
      <Tag
        key={key}
        className={`my-3 space-y-2 pl-5 text-[#D8DCD5] ${list.ordered ? 'list-decimal' : 'list-disc'
          } marker:text-[#3DD68C]`}
      >
        {list.items.map((item, i) => (
          <li key={i} className="pl-1 leading-relaxed">
            {inline(item, `${key}-${i}`)}
          </li>
        ))}
      </Tag>
    );

    list = null;
  };

  String(text || '')
    .split('\n')
    .forEach((raw, n) => {
      const line = raw.trimEnd();

      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

      if (bullet || numbered) {
        const ordered = !!numbered;

        if (list && list.ordered !== ordered) {
          flush();
        }

        if (!list) {
          list = {
            ordered,
            items: [],
          };
        }

        list.items.push((bullet || numbered)[1]);
        return;
      }

      flush();

      if (!line.trim()) return;

      const heading = line.match(/^(#{1,4})\s+(.*)$/);

      if (heading) {
        const level = heading[1].length;

        blocks.push(
          <p
            key={`heading-${n}`}
            className={`mt-4 font-semibold text-[#F2EDE0] first:mt-0 ${level === 1
                ? 'text-base'
                : level === 2
                  ? 'text-sm'
                  : 'text-[13px]'
              }`}
          >
            {inline(heading[2], `heading-${n}`)}
          </p>
        );

        return;
      }

      blocks.push(
        <p
          key={`paragraph-${n}`}
          className="my-2 leading-relaxed text-[#D8DCD5] first:mt-0 last:mb-0"
        >
          {inline(line, `paragraph-${n}`)}
        </p>
      );
    });

  flush();

  return (
    <div className="space-y-1 text-[13px] leading-relaxed">
      {blocks}
    </div>
  );
}
