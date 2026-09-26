import { useEffect } from 'react'

export const SITE_TITLE = 'Janit B — AI/ML Engineer'

/** The tab (and bookmark, and share) title for a page; back to the site title when it leaves. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Janit B` : SITE_TITLE
    return () => {
      document.title = SITE_TITLE
    }
  }, [title])
}
