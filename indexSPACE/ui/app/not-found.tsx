import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-ix-shell flex items-center justify-center">
      <div className="text-center">
        <div className="text-[11px] font-mono tracking-[0.25em] text-ix-text-faint uppercase mb-4">404 / NOT FOUND</div>
        <div className="text-[10px] font-mono text-ix-text-muted mb-6">This route does not exist on the instrument panel.</div>
        <Link
          href="/"
          className="inline-block px-5 py-3 text-[10px] font-mono uppercase tracking-widest bg-ix-blue text-ix-shell hover:bg-ix-blue-dim transition-colors"
        >
          RETURN TO TERMINAL
        </Link>
      </div>
    </div>
  )
}
