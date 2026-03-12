'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, User, AtSign } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Actor suggestion from Bluesky public API.
 */
interface ActorSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

/**
 * Props for the HandleInput component.
 */
interface HandleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (actor: ActorSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Handle input with typeahead autocomplete.
 *
 * Searches the Bluesky public API for matching actors as the user types,
 * showing a dropdown with avatars, display names, and handles.
 */
function HandleInput({
  value,
  onChange,
  onSelect,
  placeholder = 'alice.bsky.social',
  disabled = false,
  className,
}: HandleInputProps) {
  const [suggestions, setSuggestions] = useState<ActorSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  const searchHandles = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(query)}&limit=8`,
      );

      if (response.ok) {
        const data = (await response.json()) as { actors: ActorSuggestion[] };
        setSuggestions(data.actors || []);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setSelectedIndex(-1);
      searchHandles(newValue);
    },
    [onChange, searchHandles],
  );

  const handleSelectSuggestion = useCallback(
    (actor: ActorSuggestion) => {
      justSelectedRef.current = true;
      onChange(actor.handle);
      setShowSuggestions(false);
      setSuggestions([]);
      onSelect?.(actor);
      inputRef.current?.focus();
    },
    [onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (justSelectedRef.current) {
              justSelectedRef.current = false;
              return;
            }
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {suggestions.map((actor, index) => (
              <li
                key={actor.did}
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  'flex cursor-pointer items-center justify-start gap-3 px-3 py-2 hover:bg-accent',
                  index === selectedIndex && 'bg-accent',
                )}
                onClick={() => handleSelectSuggestion(actor)}
              >
                {actor.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={actor.avatar}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="overflow-hidden text-left">
                  {actor.displayName && (
                    <p className="truncate text-sm font-medium">{actor.displayName}</p>
                  )}
                  <p className="truncate text-sm text-muted-foreground">@{actor.handle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showSuggestions && !isLoading && value.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-lg">
          <p className="text-center text-sm text-muted-foreground">No matching accounts found</p>
        </div>
      )}
    </div>
  );
}

export { HandleInput };
export type { HandleInputProps, ActorSuggestion };
