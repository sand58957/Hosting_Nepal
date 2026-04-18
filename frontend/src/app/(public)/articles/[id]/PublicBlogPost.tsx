'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Post {
  id: string; slug: string; title: string; content: string; excerpt: string | null
  featuredImage: string | null; views: number; readTime: number | null
  publishedAt: string | null; updatedAt: string; seoTitle: string | null
  seoDescription: string | null; ogImage: string | null
  author: { name: string; email: string }
  category: { name: string; slug: string } | null
  tags: { name: string; slug: string }[]
  jsonLd: Record<string, any> | Record<string, any>[]
}

// Simple markdown to HTML converter
function renderMarkdown(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')

  // Wrap li groups in ul
  html = html.replace(/(<li>.*?<\/li>(\n)?)+/gs, (match) => `<ul>${match}</ul>`)

  return `<p>${html}</p>`
}

// Extract headings for Table of Contents
function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = []
  const regex = /^(#{2,3}) (.+)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].replace(/\*\*/g, '')
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

    headings.push({ level, text, id })
  }

  return headings
}

// Add IDs to rendered HTML headings
function addHeadingIds(html: string): string {
  return html.replace(/<h([23])>(.+?)<\/h[23]>/g, (_, level, text) => {
    const plainText = text.replace(/<[^>]+>/g, '')
    const id = plainText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

    return `<h${level} id="${id}">${text}</h${level}>`
  })
}

const PublicBlogPost = ({ slug }: { slug: string }) => {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeHeading, setActiveHeading] = useState('')
  const [showToc, setShowToc] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_URL}/blog/posts/${slug}`)
        const json = await res.json()

        setPost(json?.data ?? null)
      } catch {} finally { setLoading(false) }
    }

    fetchPost()
  }, [slug])

  // Scroll spy for TOC (throttled with rAF + change guard)
  useEffect(() => {
    if (!post) return

    let ticking = false

    const handleScroll = () => {
      if (ticking) return

      ticking = true
      requestAnimationFrame(() => {
        const headings = document.querySelectorAll('h2[id], h3[id]')
        let current = ''

        headings.forEach(h => {
          if (h.getBoundingClientRect().top < 120) current = h.id
        })

        setActiveHeading(prev => prev === current ? prev : current)
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [post])

  const headings = useMemo(() => post ? extractHeadings(post.content) : [], [post])
  const renderedContent = useMemo(() => post ? addHeadingIds(renderMarkdown(post.content)) : '', [post])

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', pt: 10, px: 3 }}>
        <Container maxWidth='lg'>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Skeleton height={50} width='80%' sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
              <Skeleton height={25} width='40%' sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
              <Skeleton height={500} sx={{ mt: 4, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Skeleton height={300} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  if (!post) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <i className='tabler-article-off' style={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
          <Typography variant='h5' sx={{ color: '#fff', mt: 2 }}>Post not found</Typography>
          <Button variant='outlined' onClick={() => router.push('/articles')} sx={{ mt: 3, color: '#fff', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none' }}>
            Back to Blog
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', overflowX: 'hidden' }}>
      {/* JSON-LD */}
      {post.jsonLd && (Array.isArray(post.jsonLd) ? post.jsonLd : [post.jsonLd]).map((schema, i) => (
        <script key={i} type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Navbar */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
              <Button size='small' sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 } }} onClick={() => router.push('/home')}>Home</Button>
              <Button size='small' sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 } }} onClick={() => router.push('/articles')}>Blog</Button>
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#28C76F', '&:hover': { bgcolor: '#1FAF5E' }, minWidth: 'auto', px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Header */}
      <Box sx={{ py: { xs: 5, md: 8 }, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth='lg'>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', gap: 0.8, mb: 3, alignItems: 'center' }}>
            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#28C76F' } }}
              onClick={() => router.push('/articles')}>Blog</Typography>
            {post.category && (
              <>
                <i className='tabler-chevron-right' style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }} />
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#28C76F' } }}>
                  {post.category.name}
                </Typography>
              </>
            )}
          </Box>

          {/* Category + Read Time */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
            {post.category && (
              <Chip label={post.category.name} size='small' sx={{ bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', fontWeight: 700, borderRadius: 1.5 }} />
            )}
            {post.readTime && (
              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <i className='tabler-clock' style={{ fontSize: 14 }} /> {post.readTime} min read
              </Typography>
            )}
          </Box>

          {/* Title */}
          <Typography variant='h2' fontWeight={800} sx={{ color: '#fff', mb: 3, lineHeight: 1.2, maxWidth: 800, fontSize: { xs: '1.75rem', sm: '2.2rem', md: '2.8rem' } }}>
            {post.title}
          </Typography>

          {/* Excerpt */}
          {post.excerpt && (
            <Typography variant='h6' sx={{ color: 'rgba(255,255,255,0.5)', mb: 4, maxWidth: 700, fontWeight: 400, lineHeight: 1.6, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
              {post.excerpt}
            </Typography>
          )}

          {/* Author + Share Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#28C76F', fontSize: 16, fontWeight: 700 }}>
                {post.author.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant='body2' sx={{ color: '#fff', fontWeight: 600 }}>{post.author.name}</Typography>
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)' }}>
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  {post.updatedAt && post.updatedAt !== post.publishedAt ? ` | Updated ${new Date(post.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  {post.views > 0 ? ` | ${post.views.toLocaleString()} views` : ''}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[
                { icon: 'tabler-brand-twitter', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}` },
                { icon: 'tabler-brand-facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
                { icon: 'tabler-brand-linkedin', url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(post.title)}` },
                { icon: 'tabler-link', url: '' },
              ].map(s => (
                <IconButton key={s.icon} size='small' onClick={() => {
                  if (s.url) window.open(s.url, '_blank')
                  else { navigator.clipboard.writeText(shareUrl); }
                }} sx={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { color: '#fff', borderColor: 'rgba(255,255,255,0.2)' } }}>
                  <i className={s.icon} style={{ fontSize: 16 }} />
                </IconButton>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container maxWidth='lg' sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          {/* Article Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Featured Image */}
            {post.featuredImage && (
              <Box sx={{ mb: 5, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={post.featuredImage} alt={post.title} style={{ width: '100%', display: 'block' }} />
              </Box>
            )}

            {/* Rendered Markdown Content */}
            <Box
              className='blog-content'
              dangerouslySetInnerHTML={{ __html: renderedContent }}
              sx={{
                color: 'rgba(255,255,255,0.78)', fontSize: { xs: '0.95rem', md: '1.06rem' }, lineHeight: 1.9,
                '& h1': { color: '#fff', fontSize: { xs: '1.4rem', sm: '1.7rem', md: '2rem' }, fontWeight: 800, mt: 4, mb: 2, lineHeight: 1.3 },
                '& h2': { color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' }, fontWeight: 700, mt: 4, mb: 2, pt: 2, lineHeight: 1.35, borderTop: '1px solid rgba(255,255,255,0.06)', scrollMarginTop: '80px' },
                '& h3': { color: '#fff', fontSize: { xs: '1.05rem', sm: '1.1rem', md: '1.2rem' }, fontWeight: 600, mt: 3, mb: 1.5, lineHeight: 1.4, scrollMarginTop: '80px' },
                '& p': { mb: 2, letterSpacing: '0.01em' },
                '& strong': { color: '#fff', fontWeight: 600 },
                '& em': { color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' },
                '& a': { color: '#7367F0', textDecoration: 'none', borderBottom: '1px solid rgba(115,103,240,0.3)', transition: '0.2s', wordBreak: 'break-word', '&:hover': { color: '#A89CF5', borderColor: '#A89CF5' } },
                '& code': { bgcolor: 'rgba(115,103,240,0.1)', color: '#A89CF5', px: 0.8, py: 0.3, borderRadius: 1, fontSize: '0.85em', fontFamily: 'monospace', wordBreak: 'break-all' },
                '& pre': { bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', p: { xs: 2, md: 3 }, borderRadius: 2.5, overflow: 'auto', mb: 3, fontSize: { xs: '0.8rem', md: '0.9rem' }, WebkitOverflowScrolling: 'touch' },
                '& blockquote': { borderLeft: '3px solid #28C76F', pl: 3, ml: 0, my: 3, py: 1, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', bgcolor: 'rgba(40,199,111,0.04)', borderRadius: '0 8px 8px 0' },
                '& ul': { pl: 3, mb: 2.5, '& li': { mb: 1, pl: 0.5, '&::marker': { color: '#28C76F' } } },
                '& ol': { pl: 3, mb: 2.5, '& li': { mb: 1, pl: 0.5, '&::marker': { color: '#28C76F', fontWeight: 600 } } },
                '& hr': { border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', my: 5 },
                '& img': { maxWidth: '100%', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' },
              }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <Box sx={{ mt: 5, pt: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, mb: 1.5, display: 'block' }}>Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {post.tags.map(t => (
                    <Chip key={t.slug} label={t.name} size='small' sx={{
                      bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                      fontWeight: 500, '&:hover': { borderColor: '#28C76F', color: '#28C76F' }, cursor: 'pointer', transition: '0.2s',
                    }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Author Card */}
            <Card sx={{ mt: 5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, p: 3 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: '#28C76F', fontSize: 24, fontWeight: 700 }}>
                  {post.author.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>Written by</Typography>
                  <Typography variant='h6' fontWeight={700} sx={{ color: '#fff' }}>{post.author.name}</Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                    Hosting Nepal Team
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card sx={{ mt: 4, bgcolor: 'rgba(40,199,111,0.06)', border: '1px solid rgba(40,199,111,0.15)', borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 1 }}>Ready to get started?</Typography>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
                  Launch your website with Hosting Nepal today.
                </Typography>
                <Button variant='contained' disableElevation onClick={() => router.push('/register')}
                  sx={{ bgcolor: '#28C76F', '&:hover': { bgcolor: '#1FAF5E' }, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4 }}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar — below content on mobile, sticky on desktop */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Divider sx={{ display: { xs: 'block', md: 'none' }, borderColor: 'rgba(255,255,255,0.06)', my: 2 }} />
            <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 72 }}>
              {/* Table of Contents */}
              {headings.length > 3 && (
                <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant='subtitle2' fontWeight={700} sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='tabler-list' style={{ fontSize: 16, color: '#28C76F' }} /> Table of Contents
                      </Typography>
                      <IconButton size='small' onClick={() => setShowToc(!showToc)} sx={{ color: 'rgba(255,255,255,0.3)' }}>
                        <i className={showToc ? 'tabler-chevron-up' : 'tabler-chevron-down'} style={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    {showToc && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        {headings.map(h => (
                          <Typography
                            key={h.id} variant='caption' onClick={() => scrollToHeading(h.id)}
                            sx={{
                              color: activeHeading === h.id ? '#28C76F' : 'rgba(255,255,255,0.45)',
                              fontWeight: activeHeading === h.id ? 600 : 400,
                              pl: h.level === 3 ? 2 : 0,
                              py: 0.5, cursor: 'pointer', lineHeight: 1.5,
                              borderLeft: activeHeading === h.id ? '2px solid #28C76F' : '2px solid transparent',
                              paddingLeft: h.level === 3 ? 2.5 : 1,
                              transition: '0.2s',
                              '&:hover': { color: '#fff' },
                              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}
                          >
                            {h.text}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Post Info */}
              <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant='subtitle2' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>Post Info</Typography>
                  {[
                    { icon: 'tabler-calendar', label: 'Published', value: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-' },
                    { icon: 'tabler-refresh', label: 'Updated', value: new Date(post.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    { icon: 'tabler-clock', label: 'Read Time', value: `${post.readTime || '?'} min` },
                    { icon: 'tabler-eye', label: 'Views', value: post.views.toLocaleString() },
                    { icon: 'tabler-category', label: 'Category', value: post.category?.name || '-' },
                  ].map(item => (
                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <i className={item.icon} style={{ fontSize: 14 }} /> {item.label}
                      </Typography>
                      <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item.value}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Share */}
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant='subtitle2' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>Share This Post</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {[
                      { icon: 'tabler-brand-twitter', color: '#1DA1F2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}` },
                      { icon: 'tabler-brand-facebook', color: '#4267B2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
                      { icon: 'tabler-brand-linkedin', color: '#0077B5', url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}` },
                      { icon: 'tabler-brand-whatsapp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(post.title + ' ' + shareUrl)}` },
                    ].map(s => (
                      <IconButton key={s.icon} size='small' onClick={() => window.open(s.url, '_blank')}
                        sx={{ bgcolor: `${s.color}15`, color: s.color, '&:hover': { bgcolor: `${s.color}25` } }}>
                        <i className={s.icon} style={{ fontSize: 18 }} />
                      </IconButton>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#131325', py: 5, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
            <Logo />
            <Typography variant='h6' fontWeight={800} sx={{ color: '#fff' }}>Hosting Nepal</Typography>
          </Box>
          <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}>
            {new Date().getFullYear()} &copy; Marketnminds Investment Group. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

export default PublicBlogPost
