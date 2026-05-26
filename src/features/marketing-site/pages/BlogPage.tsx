import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { articleSchema, blogPosts, coreKeywords, organizationSchema } from '../config/seo.config'
import '../styles/blog.scss'
import '../styles/global.scss'

export function BlogIndexPage() {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="blog-root">
      <SEO
        title="Salon Software Blog | Billing, Appointments & Marketing"
        description="SEO resources for salons on billing software, appointment management, WhatsApp marketing, staff operations and salon growth."
        path="/blog"
        keywords={coreKeywords}
        jsonLd={organizationSchema}
      />
      <Navbar />
      <main className="sx-section blog-main">
        <div className="sx-eyebrow">SalonOx Blog</div>
        <h1 className="blog-h1">Salon software guides for growing businesses</h1>
        <p className="blog-sub">Practical articles on salon management software, billing, appointments, staff, CRM and WhatsApp marketing.</p>
        <div className="blog-grid">
          {blogPosts.map(post => (
            <button key={post.slug} className="blog-card" onClick={() => navigate(`/blog/${post.slug}`)}>
              <span>{post.readTime}</span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <strong>Read article</strong>
            </button>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const post = blogPosts.find(item => item.slug === slug)
  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!post) {
    return (
      <div className="blog-root">
        <Navbar />
        <main className="sx-section blog-main">
          <h1 className="blog-h1">Article not found</h1>
          <button className="sx-btn-primary" onClick={() => navigate('/blog')}>Back to Blog</button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="blog-root">
      <SEO
        title={`${post.title} | SalonOx`}
        description={post.description}
        path={`/blog/${post.slug}`}
        keywords={coreKeywords}
        jsonLd={articleSchema(post)}
      />
      <Navbar />
      <article className="sx-section blog-article">
        <button className="blog-back" onClick={() => navigate('/blog')}>Back to Blog</button>
        <div className="sx-eyebrow">{post.readTime}</div>
        <h1 className="blog-h1">{post.title}</h1>
        <p className="blog-sub">{post.description}</p>

        <section>
          <h2>Start with the workflows your salon uses every day</h2>
          <p>Good salon management software should connect appointments, billing, staff, customers and marketing. When these workflows live in separate tools, front-desk teams spend more time fixing data than serving clients.</p>
          <p>SalonOx is designed around the daily salon flow: a client books, staff are assigned, the visit is completed, the bill is generated, and the client can be re-engaged through CRM or WhatsApp campaigns.</p>
        </section>

        <section>
          <h2>What to check before choosing salon software</h2>
          <ul>
            <li>Appointment calendar with staff availability and reminders.</li>
            <li>Salon billing software with GST-ready invoices and payment tracking.</li>
            <li>Salon POS software for services, products, memberships and inventory.</li>
            <li>Salon CRM software that tracks visits, preferences and repeat revenue.</li>
            <li>WhatsApp marketing tools for reminders, offers and reactivation campaigns.</li>
          </ul>
        </section>

        <section>
          <h2>Use reporting to improve conversion and retention</h2>
          <p>Reports should show revenue, appointments, staff performance, repeat clients and campaign results. The best systems turn those numbers into clear actions, such as which services to promote or which clients need follow-up.</p>
        </section>

        <div className="blog-cta">
          <h2>See SalonOx in action</h2>
          <p>Start a free trial or book a demo to see billing, appointments, staff, CRM and WhatsApp marketing in one salon software platform.</p>
          <div>
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>Start Free Trial</button>
            <button className="sx-btn-outline" onClick={() => navigate('/contact-sales')}>Book Demo</button>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  )
}

