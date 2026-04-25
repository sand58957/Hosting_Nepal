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
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Post {
  id: string; slug: string; title: string; content: string; excerpt: string | null
  featuredImage: string | null; views: number; readTime: number | null
  publishedAt: string | null; updatedAt: string; seoTitle: string | null
  seoDescription: string | null; ogImage: string | null
  author: {
    name: string; email: string;
    authorSlug?: string | null; authorTitle?: string | null;
    authorBio?: string | null; avatarUrl?: string | null;
  }
  category: { name: string; slug: string } | null
  tags: { name: string; slug: string }[]
  jsonLd: Record<string, any> | Record<string, any>[]
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')

  html = html.replace(/(<li>.*?<\/li>(\n)?)+/gs, (match) => `<ul>${match}</ul>`)

  return `<p>${html}</p>`
}

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

function addHeadingIds(html: string): string {
  return html.replace(/<h([23])>(.+?)<\/h[23]>/g, (_, level, text) => {
    const plainText = text.replace(/<[^>]+>/g, '')
    const id = plainText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

    return `<h${level} id="${id}">${text}</h${level}>`
  })
}

const palette = (isDark: boolean) => isDark ? {
  bg: '#0F1115',
  surface: '#161922',
  surfaceSoft: 'rgba(255,255,255,0.03)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.6)',
  textSubtle: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  brand: '#28C76F',
  brandSoft: 'rgba(40,199,111,0.12)',
  accent: '#A89CF5',
  accentSoft: 'rgba(115,103,240,0.12)',
  navBg: 'rgba(15,17,21,0.85)',
  footerBg: '#0B0D11',
} : {
  bg: '#FBFBFD',
  surface: '#FFFFFF',
  surfaceSoft: '#F4F5F8',
  text: 'rgba(17,20,28,0.92)',
  textMuted: 'rgba(17,20,28,0.62)',
  textSubtle: 'rgba(17,20,28,0.42)',
  border: 'rgba(17,20,28,0.08)',
  borderStrong: 'rgba(17,20,28,0.16)',
  brand: '#1FAF5E',
  brandSoft: 'rgba(31,175,94,0.1)',
  accent: '#5E54D5',
  accentSoft: 'rgba(94,84,213,0.08)',
  navBg: 'rgba(251,251,253,0.85)',
  footerBg: '#F4F5F8',
}

const PublicBlogPost = ({ slug }: { slug: string }) => {
  const router = useRouter()
  const { mode, setMode, systemMode } = useColorScheme()
  const resolved = (mode === 'system' ? systemMode : mode) || 'dark'
  const isDark = resolved === 'dark'
  const c = palette(isDark)

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeHeading, setActiveHeading] = useState('')
  const [progress, setProgress] = useState(0)

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

        const doc = document.documentElement
        const scrollable = doc.scrollHeight - doc.clientHeight
        const pct = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0

        setActiveHeading(prev => prev === current ? prev : current)
        setProgress(pct)
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [post])

  const headings = useMemo(() => post ? extractHeadings(post.content) : [], [post])
  const renderedContent = useMemo(() => post ? addHeadingIds(renderMarkdown(post.content)) : '', [post])

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const ThemeToggle = (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        size='small'
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        sx={{ color: c.textMuted, border: `1px solid ${c.border}`, '&:hover': { color: c.text, borderColor: c.borderStrong } }}
      >
        <i className={isDark ? 'tabler-sun' : 'tabler-moon'} style={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  )

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: c.bg, pt: 10, px: 3 }}>
        <Container maxWidth='lg'>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Skeleton height={50} width='80%' sx={{ bgcolor: c.surfaceSoft }} />
              <Skeleton height={25} width='40%' sx={{ mt: 2, bgcolor: c.surfaceSoft }} />
              <Skeleton variant='rectangular' sx={{ mt: 4, borderRadius: 3, bgcolor: c.surfaceSoft, aspectRatio: '16 / 9' }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Skeleton height={300} sx={{ borderRadius: 3, bgcolor: c.surfaceSoft }} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  if (!post) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <i className='tabler-article-off' style={{ fontSize: 64, color: c.textSubtle }} />
          <Typography variant='h5' sx={{ color: c.text, mt: 2 }}>Post not found</Typography>
          <Button variant='outlined' onClick={() => router.push('/articles')}
            sx={{ mt: 3, color: c.text, borderColor: c.borderStrong, textTransform: 'none' }}>
            Back to Blog
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg, overflowX: 'hidden', color: c.text }}>
      {/* JSON-LD */}
      {post.jsonLd && (Array.isArray(post.jsonLd) ? post.jsonLd : [post.jsonLd]).map((schema, i) => (
        <script key={i} type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Reading progress bar */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 1200, bgcolor: 'transparent' }}>
        <Box sx={{ height: '100%', width: `${progress}%`, bgcolor: c.brand, transition: 'width 0.1s linear' }} />
      </Box>

      {/* Navbar */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: c.navBg, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${c.border}` }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: c.text, display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center' }}>
              <Button size='small' sx={{ color: c.textMuted, textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 }, '&:hover': { color: c.text, bgcolor: 'transparent' } }} onClick={() => router.push('/home')}>Home</Button>
              <Button size='small' sx={{ color: c.textMuted, textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 }, '&:hover': { color: c.text, bgcolor: 'transparent' } }} onClick={() => router.push('/articles')}>Blog</Button>
              {ThemeToggle}
              <Button size='small' variant='contained' disableElevation sx={{ textTransform: 'none', borderRadius: 2, bgcolor: c.brand, color: '#fff', '&:hover': { bgcolor: c.brand, filter: 'brightness(0.92)' }, minWidth: 'auto', px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.8125rem' }, ml: 0.5 }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Header */}
      <Box sx={{ py: { xs: 5, md: 8 } }}>
        <Container maxWidth='lg'>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', gap: 0.8, mb: 3, alignItems: 'center' }}>
            <Typography variant='caption' sx={{ color: c.textSubtle, cursor: 'pointer', '&:hover': { color: c.brand } }}
              onClick={() => router.push('/articles')}>Blog</Typography>
            {post.category && (
              <>
                <i className='tabler-chevron-right' style={{ fontSize: 12, color: c.textSubtle }} />
                <Typography variant='caption' sx={{ color: c.textSubtle }}>
                  {post.category.name}
                </Typography>
              </>
            )}
          </Box>

          {/* Category + Read Time */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {post.category && (
              <Chip label={post.category.name} size='small' sx={{ bgcolor: c.brandSoft, color: c.brand, fontWeight: 700, borderRadius: 1.5 }} />
            )}
            {post.readTime && (
              <Typography variant='caption' sx={{ color: c.textSubtle, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <i className='tabler-clock' style={{ fontSize: 14 }} /> {post.readTime} min read
              </Typography>
            )}
            {post.publishedAt && (
              <Typography variant='caption' sx={{ color: c.textSubtle }}>
                · {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography>
            )}
          </Box>

          {/* Title */}
          <Typography
            component='h1'
            fontWeight={800}
            sx={{
              color: c.text,
              mb: 3,
              lineHeight: 1.15,
              maxWidth: 820,
              letterSpacing: '-0.02em',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.25rem' },
            }}
          >
            {post.title}
          </Typography>

          {/* Excerpt */}
          {post.excerpt && (
            <Typography sx={{ color: c.textMuted, mb: 4, maxWidth: 720, fontWeight: 400, lineHeight: 1.6, fontSize: { xs: '1rem', md: '1.2rem' } }}>
              {post.excerpt}
            </Typography>
          )}

          {/* Author + Share Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: post.author.authorSlug ? 'pointer' : 'default' }}
              onClick={() => post.author.authorSlug && router.push(`/authors/${post.author.authorSlug}`)}
            >
              <Avatar src={post.author.avatarUrl || undefined} sx={{ width: 44, height: 44, bgcolor: c.brand, fontSize: 16, fontWeight: 700 }}>
                {post.author.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant='body2' sx={{ color: c.text, fontWeight: 600 }}>
                  {post.author.name}
                </Typography>
                <Typography variant='caption' sx={{ color: c.textSubtle }}>
                  {post.author.authorTitle || 'Editorial Team'}
                  {post.updatedAt && post.updatedAt !== post.publishedAt ? ` · Updated ${new Date(post.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  {post.views > 0 ? ` · ${post.views.toLocaleString()} views` : ''}
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
                }} sx={{ color: c.textSubtle, border: `1px solid ${c.border}`, '&:hover': { color: c.text, borderColor: c.borderStrong } }}>
                  <i className={s.icon} style={{ fontSize: 16 }} />
                </IconButton>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Featured Image — full bleed, fixed 16/9 */}
      {post.featuredImage && (
        <Container maxWidth='lg' sx={{ mb: { xs: 4, md: 6 } }}>
          <Box sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${c.border}`,
            bgcolor: c.surfaceSoft,
            aspectRatio: '16 / 9',
            position: 'relative',
          }}>
            <Box
              component='img'
              src={post.featuredImage}
              alt={post.title}
              loading='eager'
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        </Container>
      )}

      {/* Main Content Area */}
      <Container maxWidth='lg' sx={{ pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={{ xs: 4, md: 6 }}>
          {/* Article Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Rendered Markdown Content */}
            <Box
              className='blog-content'
              dangerouslySetInnerHTML={{ __html: renderedContent }}
              sx={{
                color: c.textMuted,
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.8,
                maxWidth: '68ch',
                fontFamily: '"Inter", "Helvetica Neue", system-ui, -apple-system, sans-serif',
                '& > *:first-of-type': { mt: 0 },
                '& h1': { color: c.text, fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.2rem' }, fontWeight: 800, mt: 6, mb: 2.5, lineHeight: 1.25, letterSpacing: '-0.015em' },
                '& h2': { color: c.text, fontSize: { xs: '1.35rem', sm: '1.55rem', md: '1.75rem' }, fontWeight: 700, mt: 6, mb: 2, lineHeight: 1.3, letterSpacing: '-0.01em', scrollMarginTop: '90px' },
                '& h3': { color: c.text, fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.3rem' }, fontWeight: 700, mt: 4, mb: 1.5, lineHeight: 1.4, scrollMarginTop: '90px' },
                '& p': { mb: 2.5, color: c.textMuted },
                '& strong': { color: c.text, fontWeight: 600 },
                '& em': { color: c.textMuted, fontStyle: 'italic' },
                '& a': { color: c.accent, textDecoration: 'none', borderBottom: `1px solid ${c.accentSoft}`, transition: '0.2s', wordBreak: 'break-word', '&:hover': { borderBottomColor: c.accent } },
                '& code': { bgcolor: c.accentSoft, color: c.accent, px: 0.8, py: 0.3, borderRadius: 1, fontSize: '0.88em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' },
                '& pre': { bgcolor: c.surfaceSoft, border: `1px solid ${c.border}`, p: { xs: 2, md: 3 }, borderRadius: 2.5, overflow: 'auto', mb: 3, fontSize: { xs: '0.85rem', md: '0.92rem' }, WebkitOverflowScrolling: 'touch' },
                '& blockquote': { borderLeft: `3px solid ${c.brand}`, pl: 3, ml: 0, my: 4, py: 1.5, color: c.textMuted, fontStyle: 'italic', bgcolor: c.brandSoft, borderRadius: '0 8px 8px 0' },
                '& ul, & ol': { pl: 3, mb: 3, '& li': { mb: 1.2, pl: 0.5, color: c.textMuted, '&::marker': { color: c.brand } } },
                '& hr': { border: 'none', borderTop: `1px solid ${c.border}`, my: 5 },
                '& img': { maxWidth: '100%', borderRadius: 2, border: `1px solid ${c.border}`, aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', my: 3 },
              }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${c.border}`, maxWidth: '68ch' }}>
                <Typography variant='overline' sx={{ color: c.textSubtle, letterSpacing: 1.5, mb: 1.5, display: 'block' }}>Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {post.tags.map(t => (
                    <Chip key={t.slug} label={t.name} size='small' sx={{
                      bgcolor: c.surfaceSoft, color: c.textMuted, border: `1px solid ${c.border}`,
                      fontWeight: 500, '&:hover': { borderColor: c.brand, color: c.brand }, cursor: 'pointer', transition: '0.2s',
                    }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Author Card */}
            <Card elevation={0} sx={{ mt: 5, bgcolor: c.surface, border: `1px solid ${c.border}`, borderRadius: 3, maxWidth: '68ch' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, p: 3, flexWrap: 'wrap' }}>
                <Avatar src={post.author.avatarUrl || undefined} sx={{ width: 64, height: 64, bgcolor: c.brand, fontSize: 24, fontWeight: 700 }}>
                  {post.author.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography variant='overline' sx={{ color: c.textSubtle, letterSpacing: 1.5 }}>Written by</Typography>
                  <Typography variant='h6' fontWeight={700} sx={{ color: c.text }}>{post.author.name}</Typography>
                  {post.author.authorTitle && (
                    <Typography variant='caption' sx={{ color: c.brand, fontWeight: 600, display: 'block', mt: 0.25 }}>
                      {post.author.authorTitle}
                    </Typography>
                  )}
                  <Typography variant='body2' sx={{ color: c.textMuted, mt: 1, lineHeight: 1.7 }}>
                    {post.author.authorBio || 'Part of the Hosting Nepal editorial team covering web hosting, domains, VPS, and local payment workflows for Nepali businesses.'}
                  </Typography>
                  {post.author.authorSlug && (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => router.push(`/authors/${post.author.authorSlug}`)}
                      sx={{ mt: 2, color: c.text, borderColor: c.borderStrong, textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: c.brand, color: c.brand } }}
                    >
                      View author profile
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card elevation={0} sx={{ mt: 4, bgcolor: c.brandSoft, border: `1px solid ${c.brandSoft}`, borderRadius: 3, maxWidth: '68ch' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='h6' fontWeight={700} sx={{ color: c.text, mb: 1 }}>Ready to get started?</Typography>
                <Typography variant='body2' sx={{ color: c.textMuted, mb: 3 }}>
                  Launch your website with Hosting Nepal today.
                </Typography>
                <Button variant='contained' disableElevation onClick={() => router.push('/register')}
                  sx={{ bgcolor: c.brand, color: '#fff', '&:hover': { bgcolor: c.brand, filter: 'brightness(0.92)' }, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4 }}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Divider sx={{ display: { xs: 'block', md: 'none' }, borderColor: c.border, my: 2 }} />
            <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 84 }}>
              {/* Table of Contents */}
              {headings.length > 2 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant='overline' sx={{ color: c.textSubtle, letterSpacing: 1.5, mb: 1.5, display: 'block', fontWeight: 700 }}>
                    On this page
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {headings.map(h => (
                      <Typography
                        key={h.id} variant='body2' onClick={() => scrollToHeading(h.id)}
                        sx={{
                          color: activeHeading === h.id ? c.text : c.textSubtle,
                          fontWeight: activeHeading === h.id ? 600 : 400,
                          fontSize: '0.85rem',
                          py: 0.6, cursor: 'pointer', lineHeight: 1.5,
                          borderLeft: `2px solid ${activeHeading === h.id ? c.brand : 'transparent'}`,
                          paddingLeft: h.level === 3 ? 2.5 : 1.5,
                          transition: '0.2s',
                          '&:hover': { color: c.text },
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}
                      >
                        {h.text}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Share */}
              <Box>
                <Typography variant='overline' sx={{ color: c.textSubtle, letterSpacing: 1.5, mb: 1.5, display: 'block', fontWeight: 700 }}>
                  Share
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    { icon: 'tabler-brand-twitter', label: 'Twitter', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}` },
                    { icon: 'tabler-brand-facebook', label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
                    { icon: 'tabler-brand-linkedin', label: 'LinkedIn', url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}` },
                    { icon: 'tabler-brand-whatsapp', label: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(post.title + ' ' + shareUrl)}` },
                  ].map(s => (
                    <Tooltip key={s.icon} title={s.label}>
                      <IconButton size='small' onClick={() => window.open(s.url, '_blank')}
                        sx={{ color: c.textMuted, border: `1px solid ${c.border}`, '&:hover': { color: c.brand, borderColor: c.brand } }}>
                        <i className={s.icon} style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: c.footerBg, py: 5, textAlign: 'center', borderTop: `1px solid ${c.border}` }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
            <Logo />
            <Typography variant='h6' fontWeight={800} sx={{ color: c.text }}>Hosting Nepal</Typography>
          </Box>
          <Typography variant='body2' sx={{ color: c.textSubtle }}>
            {new Date().getFullYear()} &copy; Marketminds Investment Group. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

export default PublicBlogPost
