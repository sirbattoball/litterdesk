import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blogPosts'

export const metadata = {
  title: 'From The Kennel — LitterDesk Blog',
  description: 'Practical, no-fluff guides for the 1–4 litter breeder — buyer screening, contracts, and running a serious breeding program without an ops team.',
}

export default function BlogIndexPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <style>{`
        .blog-nav { display:flex; align-items:center; justify-content:space-between; max-width:1100px; margin:0 auto; padding:24px 24px; }
        .blog-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .blog-logomark { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,var(--forest-l),var(--forest)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .blog-logomark svg { width:17px; height:17px; fill:#fff; }
        .blog-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:1100px; margin:0 auto; padding:0 24px 80px; }
        @media(max-width:860px){ .blog-cards{ grid-template-columns:1fr; } }
        .blog-card { background:var(--white); border:1px solid rgba(230,223,212,.8); border-radius:16px; padding:26px; text-decoration:none; display:flex; flex-direction:column; gap:12px; transition:box-shadow .15s, transform .15s; }
        .blog-card:hover { box-shadow:0 8px 24px rgba(26,71,48,.1); transform:translateY(-2px); }
      `}</style>

      <nav className="blog-nav">
        <Link href="/" className="blog-logo">
          <div className="blog-logomark"><svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>LitterDesk</span>
        </Link>
        <Link href="/" style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500, textDecoration: 'none' }}>← Back to site</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '20px 24px 56px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--forest-ll)', marginBottom: 10 }}>From The Kennel</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--ink)', letterSpacing: '-.3px', marginBottom: 14 }}>Guides for the 1–4 litter breeder</h1>
        <p style={{ fontSize: 16, color: 'var(--ink-4)', lineHeight: 1.6 }}>Practical, no-fluff advice on contracts, buyer chaos, and running a serious breeding program without an ops team.</p>
      </div>

      <div className="blog-cards">
        {BLOG_POSTS.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
            <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--forest)', background: 'rgba(26,71,48,.08)', padding: '3px 10px', borderRadius: 20 }}>{post.category}</span>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)', lineHeight: 1.4 }}>{post.title}</div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6, flex: 1 }}>{post.excerpt}</p>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-4)' }}>{post.phase} · Read more →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
