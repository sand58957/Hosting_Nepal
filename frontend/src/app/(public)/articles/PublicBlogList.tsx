'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Post {
  id: string; slug: string; title: string; excerpt: string | null
  featuredImage: string | null; status: string; views: number
  readTime: number | null; publishedAt: string | null
  author: { name: string; authorSlug?: string | null; avatarUrl?: string | null }
  category: { name: string; slug: string } | null
  tags: { name: string; slug: string }[]
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
  navBg: 'rgba(15,17,21,0.85)',
  footerBg: '#0B0D11',
  cardHoverShadow: '0 16px 32px rgba(0,0,0,0.35)',
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
  navBg: 'rgba(251,251,253,0.85)',
  footerBg: '#F4F5F8',
  cardHoverShadow: '0 16px 32px rgba(17,20,28,0.08)',
}

const PublicBlogList = () => {
  const router = useRouter()
  const { mode, setMode, systemMode } = useColorScheme()
  const resolved = (mode === 'system' ? systemMode : mode) || 'dark'
  const isDark = resolved === 'dark'
  const c = palette(isDark)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  const fetchPosts = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/blog/posts?page=${page}&limit=9`)
      const json = await res.json()
      const data = json?.data

      setPosts(data?.data ?? [])
      setTotalPages(data?.meta?.totalPages ?? 0)
    } catch {} finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchPosts() }, [fetchPosts])

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: c.bg, overflowX: 'hidden', color: c.text }}>
      {/* Header */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: c.navBg, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${c.border}`, py: 1.5 }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, cursor: 'pointer', minWidth: 0 }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: c.text, display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center' }}>
              <Button size='small' sx={{ color: c.textMuted, textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 }, '&:hover': { color: c.text, bgcolor: 'transparent' } }} onClick={() => router.push('/home')}>Home</Button>
              {ThemeToggle}
              <Button size='small' variant='contained' disableElevation
                sx={{ textTransform: 'none', borderRadius: 2, minWidth: 'auto', px: { xs: 1.5, sm: 2 }, bgcolor: c.brand, color: '#fff', '&:hover': { bgcolor: c.brand, filter: 'brightness(0.92)' } }}
                onClick={() => router.push('/login')}>Sign In</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth='md'>
          <Typography
            component='h1'
            fontWeight={800}
            sx={{ color: c.text, mb: 1.5, fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-0.02em', lineHeight: 1.15 }}
          >
            The Hosting Nepal Blog
          </Typography>
          <Typography sx={{ color: c.textMuted, fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 620, mx: 'auto', lineHeight: 1.6 }}>
            Insights on web hosting, domains, security, and building your online presence in Nepal.
          </Typography>
        </Container>
      </Box>

      {/* Posts Grid */}
      <Container maxWidth='lg' sx={{ pb: 10 }}>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant='rectangular' sx={{ borderRadius: 3, aspectRatio: '16 / 9', bgcolor: c.surfaceSoft }} />
                <Skeleton height={28} sx={{ mt: 1.5, bgcolor: c.surfaceSoft }} />
                <Skeleton height={20} width='60%' sx={{ bgcolor: c.surfaceSoft }} />
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <i className='tabler-article-off' style={{ fontSize: 64, color: c.textSubtle }} />
            <Typography variant='h6' sx={{ color: c.textMuted, mt: 2 }}>No blog posts yet. Check back soon!</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {posts.map(post => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                  <Card
                    elevation={0}
                    onClick={() => router.push(`/articles/${post.slug}`)}
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      borderRadius: 3,
                      bgcolor: c.surface,
                      border: `1px solid ${c.border}`,
                      transition: '0.25s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      '&:hover': { transform: 'translateY(-4px)', borderColor: c.brand, boxShadow: c.cardHoverShadow },
                    }}
                  >
                    {/* Image — fixed 16/9 aspect ratio for equality */}
                    <Box sx={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      bgcolor: c.surfaceSoft,
                      borderBottom: `1px solid ${c.border}`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {post.featuredImage ? (
                        <Box
                          component='img'
                          src={post.featuredImage}
                          alt={post.title}
                          loading='lazy'
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease', '.MuiCard-root:hover &': { transform: 'scale(1.04)' } }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSubtle }}>
                          <i className='tabler-photo' style={{ fontSize: 40 }} />
                        </Box>
                      )}
                    </Box>

                    <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        {post.category && <Chip label={post.category.name} size='small' sx={{ bgcolor: c.brandSoft, color: c.brand, fontWeight: 600, height: 22, fontSize: '0.72rem' }} />}
                        {post.readTime && <Chip label={`${post.readTime} min read`} size='small' variant='outlined' sx={{ borderColor: c.border, color: c.textSubtle, height: 22, fontSize: '0.72rem' }} />}
                      </Box>
                      <Typography
                        variant='h6'
                        fontWeight={700}
                        sx={{
                          color: c.text,
                          mb: 1,
                          lineHeight: 1.35,
                          fontSize: '1.1rem',
                          letterSpacing: '-0.01em',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          minHeight: '2.7em',
                        }}
                      >
                        {post.title}
                      </Typography>
                      {post.excerpt && (
                        <Typography variant='body2' sx={{
                          color: c.textMuted, lineHeight: 1.65, fontSize: '0.875rem',
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          flex: 1,
                        }}>
                          {post.excerpt}
                        </Typography>
                      )}
                      <Divider sx={{ my: 2, borderColor: c.border }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='caption' sx={{ color: c.textSubtle }}>
                          {post.author?.authorSlug ? (
                            <Box
                              component='span'
                              onClick={e => { e.stopPropagation(); router.push(`/authors/${post.author.authorSlug}`) }}
                              sx={{ cursor: 'pointer', '&:hover': { color: c.brand } }}
                            >
                              {post.author.name}
                            </Box>
                          ) : (
                            post.author?.name
                          )} &bull; {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </Typography>
                        {post.views > 0 && (
                          <Typography variant='caption' sx={{ color: c.textSubtle }}>
                            {post.views} views
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 6 }}>
                <Button variant='outlined' disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  sx={{ color: c.text, borderColor: c.borderStrong, textTransform: 'none', '&:hover': { borderColor: c.brand, bgcolor: 'transparent' } }}>
                  Previous
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  <Typography variant='body2' sx={{ color: c.textMuted }}>Page {page} of {totalPages}</Typography>
                </Box>
                <Button variant='outlined' disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  sx={{ color: c.text, borderColor: c.borderStrong, textTransform: 'none', '&:hover': { borderColor: c.brand, bgcolor: 'transparent' } }}>
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: c.footerBg, py: 4, textAlign: 'center', borderTop: `1px solid ${c.border}` }}>
        <Typography variant='body2' sx={{ color: c.textSubtle }}>
          {new Date().getFullYear()} &copy; Marketminds Investment Group
        </Typography>
      </Box>
    </Box>
  )
}

export default PublicBlogList
