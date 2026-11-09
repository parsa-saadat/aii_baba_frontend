import { useMemo, useRef, useState } from 'react';
import { Marked } from 'marked';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  FileCode2,
  Link2,
  ImagePlus,
  Table,
  Minus,
  Eye,
  PenLine,
  Columns2,
  Undo2,
} from 'lucide-react';
import MarkdownContent from './MarkdownContent';

const lexer = new Marked({ gfm: true, async: false });

// منطبق با src/utils/validators/markdown.validator.js در بک‌اند
export function isValidBackendMarkdown(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  try {
    const tokens = lexer.lexer(text);
    return tokens.some((token) => {
      if (['heading', 'list', 'blockquote', 'code', 'table', 'hr'].includes(token.type)) {
        return true;
      }
      if (token.type === 'paragraph' && token.tokens) {
        const inlineTypes = token.tokens.map((t) => t.type);
        const isFullyMarkdown = inlineTypes.every((t) =>
          ['strong', 'em', 'codespan', 'link', 'text'].includes(t),
        );
        const hasMarkdownInline = inlineTypes.some((t) =>
          ['strong', 'em', 'codespan', 'link'].includes(t),
        );
        return isFullyMarkdown && hasMarkdownInline;
      }
      return false;
    });
  } catch {
    return false;
  }
}

export default function MarkdownEditor({ value = '', onChange, onUploadImage }) {
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState('split'); // write | split | preview
  const [history, setHistory] = useState([]);

  const valid = useMemo(() => isValidBackendMarkdown(value), [value]);
  const words = useMemo(
    () => (value.trim() ? value.trim().split(/\s+/).length : 0),
    [value],
  );

  const commit = (next) => {
    setHistory((prev) => [...prev.slice(-19), value]);
    onChange(next);
  };

  const wrap = (before, after = '', placeholder = 'متن') => {
    const el = textareaRef.current;
    if (!el) {
      commit(`${value}${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    commit(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      el.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  const linePrefix = (prefix, fallback = 'عنوان بخش') => {
    const el = textareaRef.current;
    if (!el) {
      commit(`${value ? `${value}\n` : ''}${prefix}${fallback}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const lines = selected
      .split('\n')
      .map((line, idx) =>
        prefix === '1. ' ? `${idx + 1}. ${line}` : `${prefix}${line}`,
      )
      .join('\n');
    const needNewline = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const needAfter = end < value.length && value[end] !== '\n' ? '\n' : '';
    const next = `${value.slice(0, start)}${needNewline}${lines}${needAfter}${value.slice(end)}`;
    commit(next);
    requestAnimationFrame(() => el.focus());
  };

  const insertBlock = (block) => {
    const prefix = value && !value.endsWith('\n') ? '\n\n' : '';
    commit(`${value}${prefix}${block}\n`);
  };

  const insertLink = () => {
    const url = window.prompt('آدرس لینک (https://...):', 'https://');
    if (!url) return;
    wrap('[', `](${url})`, 'متن لینک');
  };

  const insertImageByUrl = () => {
    const url = window.prompt('آدرس تصویر یا شناسه فایل:');
    if (!url) return;
    insertBlock(`![توضیح تصویر](${url})`);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    const src = await onUploadImage(file);
    if (src) insertBlock(`![${file.name}](${src})`);
    e.target.value = '';
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onChange(prev);
  };

  const tools = [
    { icon: Heading1, label: 'تیتر ۱', action: () => linePrefix('# ', 'عنوان اصلی') },
    { icon: Heading2, label: 'تیتر ۲', action: () => linePrefix('## ', 'عنوان بخش') },
    { icon: Heading3, label: 'تیتر ۳', action: () => linePrefix('### ', 'زیرعنوان') },
    { divider: true },
    { icon: Bold, label: 'ضخیم (Bold)', action: () => wrap('**', '**', 'متن مهم') },
    { icon: Italic, label: 'مورب (Italic)', action: () => wrap('*', '*', 'متن') },
    { icon: Quote, label: 'نقل‌قول', action: () => linePrefix('> ', 'متن نقل‌قول') },
    { divider: true },
    { icon: List, label: 'لیست نقطه‌ای', action: () => linePrefix('- ', 'ویژگی محصول') },
    { icon: ListOrdered, label: 'لیست شماره‌دار', action: () => linePrefix('1. ', 'گام اول') },
    {
      icon: Table,
      label: 'درج جدول',
      action: () =>
        insertBlock(
          '| ویژگی | مقدار |\n| --- | --- |\n| جنس بدنه | آلومینیوم |\n| گارانتی | ۱۲ ماه |',
        ),
    },
    { icon: Minus, label: 'خط جداکننده', action: () => insertBlock('---') },
    { divider: true },
    { icon: Code, label: 'کد خطی', action: () => wrap('`', '`', 'code') },
    { icon: FileCode2, label: 'بلوک کد', action: () => insertBlock('```\nکد یا مشخصات\n```') },
    { icon: Link2, label: 'درج لینک', action: insertLink },
    {
      icon: ImagePlus,
      label: onUploadImage ? 'آپلود تصویر در متن' : 'درج تصویر',
      action: () => (onUploadImage ? fileRef.current?.click() : insertImageByUrl()),
    },
    { divider: true },
    { icon: Undo2, label: 'بازگشت', action: undo, disabled: !history.length },
  ];

  return (
    <div className="rounded-2xl border border-theme overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* نوار بالای ادیتور (شبیه وردپرس) */}
      <div
        className="px-3 py-2 border-b border-theme flex items-center justify-between gap-2 flex-wrap"
        style={{ background: 'var(--card)' }}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {tools.map((tool, index) =>
            tool.divider ? (
              <span key={`d-${index}`} className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
            ) : (
              <button
                key={tool.label}
                type="button"
                disabled={tool.disabled}
                onClick={tool.action}
                title={tool.label}
                aria-label={tool.label}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-35 transition-colors"
              >
                <tool.icon size={15} />
              </button>
            ),
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl p-1 card2 text-xs">
          {[
            ['write', 'نوشتار', PenLine],
            ['split', 'دوتایی', Columns2],
            ['preview', 'پیش‌نمایش', Eye],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-colors ${
                mode === key ? 'bg-[#ffd60a] text-[#0a1736]' : 'muted hover:opacity-100'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* بخش ویرایش و پیش‌نمایش */}
      <div className={mode === 'split' ? 'grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[var(--border)]' : ''}>
        {mode !== 'preview' && (
          <div className="p-3">
            <textarea
              ref={textareaRef}
              rows={10}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={'## معرفی محصول\nتوضیحات کامل، ویژگی‌ها و **مزایای محصول** را به صورت Markdown بنویسید...\n\n- ویژگی اول\n- ویژگی دوم'}
              className="w-full bg-transparent outline-none resize-y text-sm leading-7 min-h-[230px]"
            />
          </div>
        )}

        {mode !== 'write' && (
          <div className="p-4 min-h-[250px] max-h-[420px] overflow-y-auto">
            {value.trim() ? (
              <MarkdownContent content={value} />
            ) : (
              <div className="text-xs muted py-8 text-center">
                پیش‌نمایش توضیحات محصول اینجا نمایش داده می‌شود…
              </div>
            )}
          </div>
        )}
      </div>

      {/* فوتر ادیتور */}
      <div
        className="px-3 py-2 border-t border-theme flex items-center justify-between gap-2 text-[11px] flex-wrap"
        style={{ background: 'var(--card)' }}
      >
        <div className="muted flex items-center gap-3">
          <span>کلمات: {words}</span>
          <span>کاراکتر: {value.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {value.trim() && !valid ? (
            <>
              <span className="text-amber-400">
                برای تایید بک‌اند حداقل یک تیتر (##)، لیست (-) یا متن **ضخیم** اضافه کنید
              </span>
              <button
                type="button"
                onClick={() => commit(`## معرفی محصول\n\n${value.trim()}`)}
                className="px-2 py-0.5 rounded bg-[#ffd60a] text-[#0a1736] font-bold"
              >
                تبدیل خودکار به تیتر
              </button>
            </>
          ) : valid ? (
            <span className="text-emerald-400 font-bold">ساختار Markdown معتبر است ✓</span>
          ) : (
            <span className="muted">پشتیبانی کامل از تیتر، لیست، جدول، لینک و تصویر</span>
          )}
        </div>
      </div>
    </div>
  );
}
