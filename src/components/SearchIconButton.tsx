'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type SearchAdapter<T> = {
  /** Dialog title */
  title: string
  /** Short helper under the title */
  description?: string
  placeholder: string
  emptyMessage?: string
  /** Called when the user submits / debounced typing settles */
  search: (query: string) => Promise<T[]>
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string
}

/**
 * Shared search pattern for the whole app: a small icon button that opens
 * a modal. The adapter decides what backend to call and how to render rows.
 */
export function SearchIconButton<T>({
  adapter,
  'aria-label': ariaLabel,
  className = '',
}: {
  adapter: SearchAdapter<T>
  'aria-label': string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${className}`}
      >
        <SearchGlyph />
      </button>
      {open && (
        <SearchModal
          adapter={adapter}
          titleId={titleId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function SearchModal<T>({
  adapter,
  titleId,
  onClose,
}: {
  adapter: SearchAdapter<T>
  titleId: string
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const runSearch = useCallback(
    async (value: string) => {
      const q = value.trim()
      if (!q) {
        setResults([])
        setHasSearched(false)
        setError(null)
        return
      }
      setIsLoading(true)
      setError(null)
      setHasSearched(true)
      try {
        const items = await adapter.search(q)
        setResults(items)
      } catch (err) {
        setResults([])
        setError(err instanceof Error ? err.message : 'Search failed.')
      } finally {
        setIsLoading(false)
      }
    },
    [adapter]
  )

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [query, runSearch])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 py-16 sm:py-24"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {adapter.title}
            </h2>
            {adapter.description && (
              <p className="mt-0.5 text-sm text-slate-500">{adapter.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3">
          <label className="sr-only" htmlFor={`${titleId}-input`}>
            {adapter.placeholder}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchGlyph />
            </span>
            <input
              ref={inputRef}
              id={`${titleId}-input`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={adapter.placeholder}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border-t border-slate-100 px-2 py-2">
          {isLoading && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">Searching…</p>
          )}
          {!isLoading && error && (
            <p className="px-2 py-6 text-center text-sm text-red-600">{error}</p>
          )}
          {!isLoading && !error && hasSearched && results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              {adapter.emptyMessage ?? 'No results found.'}
            </p>
          )}
          {!isLoading && !error && !hasSearched && (
            <p className="px-2 py-6 text-center text-sm text-slate-400">
              Start typing to search.
            </p>
          )}
          {!isLoading &&
            results.map((item) => (
              <div
                key={adapter.getKey(item)}
                className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
              >
                {adapter.renderItem(item)}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function SearchGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
