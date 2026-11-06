'use client'
export function QueryFailure({ retry }: { retry: () => void }) {
  return <div className="page-body" role="alert"><h2 style={{marginBottom:12}}>We couldn’t load this page</h2><p style={{marginBottom:16}}>Check your connection and try again. Your saved records have not changed.</p><button className="btn-primary" onClick={retry}>Try again</button></div>
}
