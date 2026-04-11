'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Post {
  id: string; slug: string; title: string; excerpt: string | null
  featuredImage: string | null; status: string; views: number
  readTime: number | null; publishedAt: string | null
  author: { name: string }; category: { name: string; slug: string } | null
  tags: { name: string; slug: string }[]
}

const PublicBlogList = () => {
  const router = useRouter()
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', overflowX: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, cursor: 'pointer', minWidth: 0 }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 } }}>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none', minWidth: 'auto', px: { xs: 1, sm: 2 } }} onClick={() => router.push('/home')}>Home</Button>
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2, minWidth: 'auto', px: { xs: 1.5, sm: 2 } }} onClick={() => router.push('/login')}>Sign In</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth='md'>
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>Blog</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Insights on web hosting, domains, security, and building your online presence in Nepal.
          </Typography>
        </Container>
      </Box>

      {/* Posts Grid */}
      <Container maxWidth='lg' sx={{ pb: 8 }}>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 3 }} />
                <Skeleton height={30} sx={{ mt: 1 }} />
                <Skeleton height={20} width='60%' />
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <i className='tabler-article-off' style={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
            <Typography variant='h6' sx={{ color: 'rgba(255,255,255,0.4)', mt: 2 }}>No blog posts yet. Check back soon!</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {posts.map(post => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                  <Card onClick={() => router.push(`/blog/${post.slug}`)} sx={{
                    height: '100%', cursor: 'pointer', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', transition: '0.3s',
                    '&:hover': { transform: 'translateY(-6px)', borderColor: '#28C76F', boxShadow: '0 16px 32px rgba(0,0,0,0.3)' },
                  }}>
                    {post.featuredImage && (
                      <CardMedia component='img' height='180' image={post.featuredImage} alt={post.title}
                        sx={{ objectFit: 'cover' }} />
                    )}
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        {post.category && <Chip label={post.category.name} size='small' sx={{ bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', fontWeight: 600 }} />}
                        {post.readTime && <Chip label={`${post.readTime} min read`} size='small' variant='outlined' sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }} />}
                      </Box>
                      <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 1, lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.title}
                      </Typography>
                      {post.excerpt && (
                        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {post.excerpt}
                        </Typography>
                      )}
                      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)' }}>
                          {post.author?.name} &bull; {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)' }}>
                          {post.views > 0 ? `${post.views} views` : ''}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 6 }}>
                <Button variant='outlined' disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.15)', textTransform: 'none' }}>
                  Previous
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)' }}>Page {page} of {totalPages}</Typography>
                </Box>
                <Button variant='outlined' disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.15)', textTransform: 'none' }}>
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#131325', py: 4, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {new Date().getFullYear()} &copy; Marketnminds Investment Group
        </Typography>
      </Box>
    </Box>
  )
}

export default PublicBlogList
