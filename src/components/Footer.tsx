export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6">
        <p>© {new Date().getFullYear()} Public Data Agents. Built on public UK government data.</p>
        <p className="mt-1">
          Not affiliated with Companies House, the FSA, the NHS, or any UK local authority.
        </p>
      </div>
    </footer>
  )
}
