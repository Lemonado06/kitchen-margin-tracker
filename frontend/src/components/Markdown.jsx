// Tiny Markdown renderer for AI replies: paragraphs, bullet/numbered lists, headings, **bold**, *italic*, `code`.
// Builds React elements (no raw HTML), so model output can never inject markup.

function inline(text, keyBase) {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith('**')) out.push(<strong key={key} className="font-semibold text-ink">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) out.push(<code key={key} className="rounded bg-subtle px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>);
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`my-1.5 space-y-1 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'} marker:text-muted`}>
        {list.items.map((item, i) => <li key={i}>{inline(item, `li${blocks.length}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };

  String(text || '').split('\n').forEach((raw, n) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)[1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      <p key={`p${n}`} className={heading ? 'mt-2 font-semibold text-ink first:mt-0' : 'my-1 first:mt-0 last:mb-0'}>
        {inline(heading ? heading[1] : line, `p${n}`)}
      </p>,
    );
  });
  flush();
  return <div className="space-y-1">{blocks}</div>;
}
