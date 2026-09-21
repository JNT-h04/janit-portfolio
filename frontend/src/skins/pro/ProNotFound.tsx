import { Link } from 'react-router-dom'

export default function ProNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-code text-sm tracking-widest text-quiet">404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">That page doesn't exist</h1>
      <p className="mt-3 font-sans text-[15px] text-quiet">The link may be out of date, or the page was renamed.</p>
      <Link
        to="/"
        className="mt-8 rounded-md bg-ink px-5 py-2.5 font-sans text-sm font-medium text-paper transition-colors hover:bg-coral"
      >
        Back to the homepage
      </Link>
    </div>
  )
}
