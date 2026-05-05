'use client';

/**
 * Autocomplete combobox for ISO 639-1 language codes.
 *
 * @module
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LANGUAGES as SHARED_LANGUAGES } from '@/components/ui/language-codes';

/**
 * Re-export the comprehensive code list from the shared module so
 * legacy imports of `LANGUAGES` from this file keep working. Prefer
 * importing from `@/components/ui/language-codes` directly.
 */
const LANGUAGES = SHARED_LANGUAGES;


interface LanguageComboboxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  /** DOM id forwarded to the trigger for <Label htmlFor=...> association. */
  readonly id?: string;
  /** Explicit aria-label, used when no adjacent <Label> exists. */
  readonly 'aria-label'?: string;
}

function LanguageCombobox({
  value,
  onChange,
  placeholder = 'Language',
  className,
  disabled,
  id,
  'aria-label': ariaLabel,
}: LanguageComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLanguage = useMemo(() => LANGUAGES.find((l) => l.code === value), [value]);

  const filtered = useMemo(() => {
    if (!search) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter((l) => l.code.startsWith(q) || l.name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code === value ? '' : code);
      setOpen(false);
      setSearch('');
    },
    [onChange, value],
  );

  return (
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
              'justify-between font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        {selectedLanguage ? (
          <span>
            <span className="font-mono text-xs text-muted-foreground mr-1.5">
              {selectedLanguage.code}
            </span>
            {selectedLanguage.name}
          </span>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search languages..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No language found.</p>
          ) : (
            filtered.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm cursor-pointer',
                  'hover:bg-accent hover:text-accent-foreground',
                  value === lang.code && 'bg-accent',
                )}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    value === lang.code ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="font-mono text-xs text-muted-foreground w-6">{lang.code}</span>
                <span>{lang.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { LanguageCombobox, LANGUAGES };
