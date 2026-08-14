import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS } from '@/lib/blogPosts'

export function generateStaticParams() {
  return BLOG_POSTS.map(post => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find(p => p.slug === params.slug)
  if (!post) return {}
  return { title: `${post.title} — LitterDesk`, description: post.excerpt }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find(p => p.slug === params.slug)
  if (!post) notFound()

  const otherPosts = BLOG_POSTS.filter(p => p.slug !== post.slug)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <style>{`
        .post-nav { display:flex; align-items:center; justify-content:space-between; max-width:760px; margin:0 auto; padding:24px 24px; }
        .post-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .post-logomark { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,var(--forest-l),var(--forest)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .post-logomark svg { width:17px; height:17px; fill:#fff; }
        .post-body h3 { font-family:var(--serif); font-size:22px; color:var(--ink); margin:32px 0 12px; letter-spacing:-.2px; }
        .post-body p { font-size:16px; color:var(--ink-2); line-height:1.8; margin-bottom:16px; }
        .post-body ul { margin:0 0 16px; padding-left:22px; }
        .post-body li { font-size:16px; color:var(--ink-2); line-height:1.8; margin-bottom:6px; }
        .post-body strong { color:var(--ink); }
        .other-card { display:block; text-decoration:none; background:var(--white); border:1px solid rgba(230,223,212,.8); border-radius:14px; padding:20px; transition:box-shadow .15s; }
        .other-card:hover { box-shadow:0 6px 18px rgba(26,71,48,.08); }
      `}</style>

      <nav className="post-nav">
        <Link href="/" className="post-logo">
          <div className="post-logomark"><svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>LitterDesk</span>
        </Link>
        <Link href="/blog" style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500, textDecoration: 'none' }}>← All guides</Link>
      </nav>

      <article style={{ maxWidth: 700, margin: '0 auto', padding: '20px 24px 40px' }}>
        <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--forest)', background: 'rgba(26,71,48,.08)', padding: '3px 10px', borderRadius: 20, marginBottom: 14 }}>{post.category}</span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, color: 'var(--ink)', letterSpacing: '-.3px', lineHeight: 1.15, marginBottom: 10 }}>{post.title}</h1>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-4)', marginBottom: 32 }}>{post.phase} of the LitterDesk system</div>
        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

        <div style={{ marginTop: 40, padding: 24, borderRadius: 16, background: 'linear-gradient(160deg,var(--forest-l) 0%,var(--forest) 100%)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: '#fff', marginBottom: 8 }}>See the whole system</div>
          <p style={{ fontSize: 14, color: 'rgba(250,248,243,.8)', marginBottom: 18, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>Plan, Protect, and Place — the same three phases every LitterDesk breeder runs their litters through.</p>
          <Link href="/#pricing" style={{ display: 'inline-block', background: 'var(--cream)', color: 'var(--forest)', fontWeight: 600, fontSize: 14, padding: '11px 24px', borderRadius: 10, textDecoration: 'none' }}>Start free for 7 days →</Link>
        </div>
      </article>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-4)', marginBottom: 14 }}>More guides</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {otherPosts.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="other-card">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', marginBottom: 6 }}>{p.category}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>{p.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
