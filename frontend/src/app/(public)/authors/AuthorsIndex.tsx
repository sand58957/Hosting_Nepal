'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

import Logo from '@core/svg/Logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

interface Author {
  id: string; name: string; slug: string; title: string | null
  bio: string | null; avatarUrl: string | null; postCount: number
}

const AuthorsIndex = () => {
  const router = useRouter()
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/blog/authors`)
        const json = await res.json()

        setAuthors(json?.data ?? [])
      } catch {} finally { setLoading(false) }
    }

    run()
  }, [])

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
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2 }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth='md'>
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
            Authors
          </Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)' }}>
            The Hosting Nepal editorial team writes guides on hosting, domains, VPS, and security for Nepali websites.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth='lg' sx={{ pb: 10 }}>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant='rectangular' height={220} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : authors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant='h6' sx={{ color: 'rgba(255,255,255,0.4)' }}>No authors yet.</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {authors.map(a => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a.id}>
                <Card
                  onClick={() => router.push(`/authors/${a.slug}`)}
                  sx={{
                    cursor: 'pointer', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', transition: '0.3s', height: '100%',
                    '&:hover': { transform: 'translateY(-6px)', borderColor: '#28C76F', boxShadow: '0 16px 32px rgba(0,0,0,0.3)' },
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Avatar src={a.avatarUrl || undefined} sx={{ width: 72, height: 72, bgcolor: '#28C76F', fontSize: 28, fontWeight: 700 }}>
                      {a.name.charAt(0)}
                    </Avatar>
                    <Typography variant='h6' fontWeight={700} sx={{ color: '#fff' }}>{a.name}</Typography>
                    {a.title && (
                      <Typography variant='caption' sx={{ color: '#28C76F', fontWeight: 600 }}>{a.title}</Typography>
                    )}
                    {a.bio && (
                      <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {a.bio}
                      </Typography>
                    )}
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', mt: 'auto' }}>
                      {a.postCount} {a.postCount === 1 ? 'article' : 'articles'}
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

export default AuthorsIndex
