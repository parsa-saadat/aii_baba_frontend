import { useMemo } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';

const marked = new Marked({ gfm: true, breaks: true, async: false });

export default function MarkdownContent({ content }) {
  const html = useMemo(() => {
    if (typeof content !== 'string' || !content.trim()) return '';
    const rendered = marked.parse(content);
    // Seller descriptions are untrusted HTML. Never insert them before sanitizing.
    return DOMPurify.sanitize(rendered, {
      USE_PROFILES: { html: true },
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
      FORBID_ATTR: ['style', 'id', 'name'],
    });
  }, [content]);

  if (!html) return <p className="muted">توضیحاتی برای این محصول ثبت نشده است.</p>;
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
