'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface AuthorData {
  author: {
    id: string; name: string; slug: string
    title: string | null; bio: string | null; avatarUrl: string | null
    joinedAt: string
  }
  posts: Array<{
    id: string; slug: string; title: string; excerpt: string | null
    featuredImage: string | null; readTime: number | null; publishedAt: string | null
    views: number; category: { name: string; slug: string } | null
  }>
  totalPosts: number
}

const AuthorProfile = ({ slug }: { slug: string }) => {
  const router = useRouter()
  const [data, setData] = useState<AuthorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/blog/authors/${slug}`)
        const json = await res.json()

        setData(json?.data ?? null)
      } catch {} finally { setLoading(false) }
    }

    run()
  }, [slug])

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', pt: 10 }}>
        <Container maxWidth='lg'>
          <Skeleton variant='circular' width={120} height={120} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Skeleton height={40} width={300} sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Skeleton height={20} width={200} sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
        </Container>
      </Box>
    )
  }

  if (!data?.author) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <i className='tabler-user-off' style={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
          <Typography variant='h5' sx={{ color: '#fff', mt: 2 }}>Author not found</Typography>
          <Button variant='outlined' onClick={() => router.push('/authors')} sx={{ mt: 3, color: '#fff', borderColor: 'rgba(255,255,255,0.15)', textTransform: 'none' }}>
            Browse all authors
          </Button>
        </Box>
      </Box>
    )
  }

  const { author, posts, totalPosts } = data

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a', overflowX: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/articles')}>Blog</Button>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/authors')}>Authors</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Breadcrumb */}
      <Container maxWidth='lg' sx={{ pt: 4 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#28C76F' } }} onClick={() => router.push('/home')}>
            Home
          </Typography>
          <i className='tabler-chevron-right' style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }} />
          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', '&:hover': { color: '#28C76F' } }} onClick={() => router.push('/authors')}>
            Authors
          </Typography>
          <i className='tabler-chevron-right' style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }} />
          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.5)' }}>{author.name}</Typography>
        </Box>
      </Container>

      {/* Profile hero */}
      <Container maxWidth='lg' sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar src={author.avatarUrl || undefined} sx={{ width: 120, height: 120, bgcolor: '#28C76F', fontSize: 48, fontWeight: 700 }}>
            {author.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>Author</Typography>
            <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.8rem', md: '2.5rem' }, lineHeight: 1.2 }}>
              {author.name}
            </Typography>
            {author.title && (
              <Typography variant='body1' sx={{ color: '#28C76F', fontWeight: 600, mt: 0.5 }}>
                {author.title}
              </Typography>
            )}
            {author.bio && (
              <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.55)', mt: 2.5, lineHeight: 1.7, maxWidth: 720 }}>
                {author.bio}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, flexWrap: 'wrap' }}>
              <Chip label={`${totalPosts} ${totalPosts === 1 ? 'article' : 'articles'}`} size='small' sx={{ bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', fontWeight: 600 }} />
              <Chip label={`Joined ${new Date(author.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`} size='small' variant='outlined' sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }} />
            </Box>
          </Box>
        </Box>
      </Container>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Posts grid */}
      <Container maxWidth='lg' sx={{ py: { xs: 5, md: 8 } }}>
        <Typography variant='h5' fontWeight={700} sx={{ color: '#fff', mb: 4 }}>
          Articles by {author.name}
        </Typography>
        {posts.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.4)' }}>
            No published articles yet.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {posts.map(post => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                <Card
                  onClick={() => router.push(`/articles/${post.slug}`)}
                  sx={{
                    height: '100%', cursor: 'pointer', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', transition: '0.3s',
                    '&:hover': { transform: 'translateY(-6px)', borderColor: '#28C76F', boxShadow: '0 16px 32px rgba(0,0,0,0.3)' },
                  }}
                >
                  {post.featuredImage && (
                    <CardMedia component='img' height='160' image={post.featuredImage} alt={post.title} sx={{ objectFit: 'cover' }} />
                  )}
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      {post.category && <Chip label={post.category.name} size='small' sx={{ bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', fontWeight: 600 }} />}
                      {post.readTime && <Chip label={`${post.readTime} min`} size='small' variant='outlined' sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }} />}
                    </Box>
                    <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 1, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.title}
                    </Typography>
                    {post.excerpt && (
                      <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.excerpt}
                      </Typography>
                    )}
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mt: 2 }}>
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      {post.views > 0 ? ` · ${post.views} views` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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

export default AuthorProfile
