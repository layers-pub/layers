'use client';

/**
 * Multi-select language picker for BCP-47 language tags.
 *
 * @remarks
 * Covers every ISO 639-1 (2-letter) code plus a curated set of
 * widely-used ISO 639-3 (3-letter) codes for languages without 639-1
 * coverage, then accepts arbitrary BCP-47 input so users can supply
 * region/script subtags (`en-US`, `zh-Hant-HK`) or language varieties
 * the canon does not name.
 *
 * The component returns and consumes a `string[]` of tags. Each tag
 * may be a known code (rendered with its English name) or a free-form
 * tag (rendered as `custom: <tag>`). Tags are de-duplicated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LANGUAGES } from '@/components/ui/language-codes';

interface LanguagesMultiComboboxProps {
  readonly value: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  /** Forwarded to the trigger for a `<Label htmlFor>` association. */
  readonly id?: string;
  /** Used when no adjacent `<Label>` is rendered. */
  readonly 'aria-label'?: string;
}

const BCP47_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function LanguagesMultiCombobox({
  value,
  onChange,
  placeholder = 'Languages',
  className,
  disabled,
  id,
  'aria-label': ariaLabel,
}: LanguagesMultiComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const known = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of LANGUAGES) m.set(l.code, l.name);
    return m;
  }, []);

  const filtered = useMemo(() => {
    if (!search) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter(
      (l) => l.code.toLowerCase().startsWith(q) || l.name.toLowerCase().includes(q),
    );
  }, [search]);

  const toggle = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (value.includes(trimmed)) {
        onChange(value.filter((v) => v !== trimmed));
      } else {
        onChange([...value, trimmed]);
      }
    },
    [onChange, value],
  );

  const remove = useCallback(
    (tag: string) => {
      onChange(value.filter((v) => v !== tag));
    },
    [onChange, value],
  );

  const addCustom = useCallback(() => {
    const t = search.trim();
    if (!t) return;
    if (!BCP47_RE.test(t)) return;
    if (!value.includes(t)) onChange([...value, t]);
    setSearch('');
  }, [search, value, onChange]);

  const customCandidate = search.trim();
  const isValidCustom =
    customCandidate.length > 0 &&
    BCP47_RE.test(customCandidate) &&
    !known.has(customCandidate.toLowerCase());

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={ariaLabel ?? (id ? undefined : placeholder)}
              disabled={disabled}
              className={cn(
                'tap-target justify-between font-normal',
                value.length === 0 && 'text-muted-foreground',
              )}
            />
          }
        >
          <span className="truncate">
            {value.length === 0
              ? placeholder
              : `${value.length} language${value.length === 1 ? '' : 's'} selected`}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length === 1) {
                    toggle(filtered[0]!.code);
                  } else if (isValidCustom) {
                    addCustom();
                  }
                }
              }}
              placeholder="Search or type a BCP-47 tag…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {isValidCustom ? (
            <button
              type="button"
              onClick={addCustom}
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-sm hover:bg-accent"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add custom tag{' '}
              <code className="ml-auto rounded bg-muted px-1 py-0.5 text-xs">
                {customCandidate}
              </code>
            </button>
          ) : null}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {customCandidate
                  ? 'No match. Type a valid BCP-47 tag (e.g. en-US) and press enter.'
                  : 'No language found.'}
              </p>
            ) : (
              filtered.map((lang) => {
                const selected = value.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggle(lang.code)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm cursor-pointer',
                      'hover:bg-accent hover:text-accent-foreground',
                      selected && 'bg-accent',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="font-mono text-xs text-muted-foreground w-10">
                      {lang.code}
                    </span>
                    <span>{lang.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" role="list">
          {value.map((tag) => {
            const label = known.get(tag);
            return (
              <li key={tag}>
                <span className="inline-flex items-center gap-1 rounded-full border bg-secondary/40 py-0.5 pl-2 pr-1 text-xs">
                  <span className="font-mono">{tag}</span>
                  {label ? (
                    <span className="text-muted-foreground">{label}</span>
                  ) : (
                    <span className="text-muted-foreground italic">custom</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(tag)}
                    aria-label={`Remove ${tag}`}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export { LanguagesMultiCombobox };
