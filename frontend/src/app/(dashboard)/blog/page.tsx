'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface BlogPost {
  id: string
  slug: string
  title: string
  status: string
  views: number
  readTime: number | null
  publishedAt: string | null
  createdAt: string
  author: { id: string; name: string }
  category: { id: string; name: string; slug: string } | null
  tags: { id: string; name: string }[]
}

interface Analytics {
  overview: {
    totalPosts: number
    publishedPosts: number
    draftPosts: number
    scheduledPosts: number
    archivedPosts: number
    totalViews: number
    avgViews: number
    totalAuthors?: number
  }
  topPosts: { id: string; title: string; slug: string; views: number; publishedAt: string; readTime: number | null }[]
  topAuthors?: { id: string; name: string; slug: string | null; title: string | null; avatarUrl: string | null; postCount: number; totalViews: number }[]
  categoryStats: { id: string; name: string; slug: string; postCount: number }[]
  recentPosts: { id: string; title: string; status: string; views: number; createdAt: string; publishedAt: string | null }[]
}

const statusColors: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  SCHEDULED: 'info',
  ARCHIVED: 'warning',
}

const statusTabs = ['All', 'DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']

const BlogPostsPage = () => {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [statusTab, setStatusTab] = useState(0)
  const [search, setSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/blog/posts/analytics')
        setAnalytics(res.data?.data ?? res.data)
      } catch {} finally { setAnalyticsLoading(false) }
    }

    fetchAnalytics()
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)

    try {
      const params: Record<string, any> = { page: page + 1, limit: rowsPerPage }

      if (statusTabs[statusTab] !== 'All') params.status = statusTabs[statusTab]
      if (search) params.search = search

      const res = await api.get('/blog/posts/admin', { params })
      const raw = res.data?.data ?? res.data

      setPosts(raw?.data ?? [])
      setTotal(raw?.meta?.total ?? 0)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, statusTab, search])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/blog/posts/${id}`)
      setSuccessMsg('Post deleted')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchPosts()
    } catch {
      setErrorMsg('Failed to delete')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/blog/posts/${id}/publish`)
      setSuccessMsg('Post published!')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchPosts()
    } catch {
      setErrorMsg('Failed to publish')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const statCards = analytics ? [
    { label: 'Total Posts', value: analytics.overview.totalPosts, icon: 'tabler-article', color: '#7367F0', bg: 'rgba(115,103,240,0.12)' },
    { label: 'Published', value: analytics.overview.publishedPosts, icon: 'tabler-check', color: '#28C76F', bg: 'rgba(40,199,111,0.12)' },
    { label: 'Total Views', value: analytics.overview.totalViews.toLocaleString(), icon: 'tabler-eye', color: '#00CFE8', bg: 'rgba(0,207,232,0.12)' },
    { label: 'Avg Views/Post', value: analytics.overview.avgViews.toLocaleString(undefined, { maximumFractionDigits: 1 }), icon: 'tabler-chart-bar', color: '#FF9F43', bg: 'rgba(255,159,67,0.12)' },
    { label: 'Authors', value: (analytics.overview.totalAuthors ?? analytics.topAuthors?.length ?? 0).toLocaleString(), icon: 'tabler-users', color: '#EA5455', bg: 'rgba(234,84,85,0.12)' },
  ] : []

  return (
    <Grid container spacing={6}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      {/* Analytics Overview Cards */}
      {analyticsLoading ? (
        <>
          {[...Array(4)].map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card><CardContent><Skeleton height={80} /></CardContent></Card>
            </Grid>
          ))}
        </>
      ) : analytics && (
        <>
          {statCards.map(stat => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: '1.25rem !important' }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: stat.bg, color: stat.color }}>
                    <i className={stat.icon} style={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='h5' fontWeight={700}>{stat.value}</Typography>
                    <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Top Posts & Category Breakdown */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardHeader title='Top Performing Posts' titleTypographyProps={{ variant: 'h6' }} />
              <CardContent sx={{ pt: 0 }}>
                {analytics.topPosts.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>No published posts yet</Typography>
                ) : (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Post</TableCell>
                          <TableCell align='right'>Views</TableCell>
                          <TableCell align='right'>Read Time</TableCell>
                          <TableCell align='right'>Published</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.topPosts.map((post, idx) => (
                          <TableRow key={post.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/blog/${post.id}/edit`)}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: idx === 0 ? '#FF9F43' : idx === 1 ? '#7367F0' : idx === 2 ? '#28C76F' : 'action.selected' }}>
                                  {idx + 1}
                                </Avatar>
                                <Typography variant='body2' fontWeight={500} sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {post.title}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2' fontWeight={600}>{post.views.toLocaleString()}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2' color='text.secondary'>{post.readTime ? `${post.readTime} min` : '-'}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='caption' color='text.secondary'>
                                {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title='Posts by Category' titleTypographyProps={{ variant: 'h6' }} />
              <CardContent sx={{ pt: 0 }}>
                {analytics.categoryStats.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>No categories yet</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {analytics.categoryStats
                      .sort((a, b) => b.postCount - a.postCount)
                      .map(cat => {
                        const maxCount = Math.max(...analytics.categoryStats.map(c => c.postCount), 1)

                        return (
                          <Box key={cat.id}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant='body2' fontWeight={500}>{cat.name}</Typography>
                              <Typography variant='body2' color='text.secondary'>{cat.postCount} posts</Typography>
                            </Box>
                            <LinearProgress
                              variant='determinate'
                              value={(cat.postCount / maxCount) * 100}
                              sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#7367F0' } }}
                            />
                          </Box>
                        )
                      })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Authors */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader title='Top Authors' titleTypographyProps={{ variant: 'h6' }} />
              <CardContent sx={{ pt: 0 }}>
                {!analytics.topAuthors || analytics.topAuthors.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>No authors yet</Typography>
                ) : (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Author</TableCell>
                          <TableCell align='right'>Posts</TableCell>
                          <TableCell align='right'>Total Views</TableCell>
                          <TableCell align='right'>Avg Views/Post</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.topAuthors.map(author => {
                          const avg = author.postCount ? Math.round((author.totalViews / author.postCount) * 10) / 10 : 0

                          return (
                            <TableRow
                              key={author.id}
                              hover
                              sx={{ cursor: author.slug ? 'pointer' : 'default' }}
                              onClick={() => author.slug && window.open(`/authors/${author.slug}`, '_blank')}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar src={author.avatarUrl || undefined} sx={{ width: 32, height: 32, fontSize: 14, bgcolor: '#7367F0' }}>
                                    {author.name.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant='body2' fontWeight={600}>{author.name}</Typography>
                                    {author.title && <Typography variant='caption' color='text.secondary'>{author.title}</Typography>}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' fontWeight={600}>{author.postCount.toLocaleString()}</Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2'>{author.totalViews.toLocaleString()}</Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' color='text.secondary'>{avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</Typography>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Post Status Breakdown */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 3, md: 6 }, flexWrap: 'wrap', py: '1.25rem !important' }}>
                {[
                  { label: 'Drafts', value: analytics.overview.draftPosts, color: '#A8AAAE' },
                  { label: 'Published', value: analytics.overview.publishedPosts, color: '#28C76F' },
                  { label: 'Scheduled', value: analytics.overview.scheduledPosts, color: '#00CFE8' },
                  { label: 'Archived', value: analytics.overview.archivedPosts, color: '#FF9F43' },
                ].map(s => (
                  <Box key={s.label} sx={{ textAlign: 'center', minWidth: 80 }}>
                    <Typography variant='h5' fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                    <Typography variant='caption' color='text.secondary'>{s.label}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Blog Posts'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/blog/create')}>
                New Post
              </Button>
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Tabs value={statusTab} onChange={(_, v) => { setStatusTab(v); setPage(0) }}
                sx={{ '& .MuiTab-root': { textTransform: 'none', minHeight: 40 } }}>
                {statusTabs.map(s => <Tab key={s} label={s} />)}
              </Tabs>
              <CustomTextField
                placeholder='Search posts...'
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(0) }}
                sx={{ width: 250 }}
              />
            </Box>

            {loading ? (
              <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}</Box>
            ) : posts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-article-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No blog posts found</Typography>
                <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/blog/create')} sx={{ mt: 2 }}>
                  Create Your First Post
                </Button>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Author</TableCell>
                        <TableCell>Views</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {posts.map(post => (
                        <TableRow key={post.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => router.push(`/blog/${post.id}/edit`)}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{post.title}</Typography>
                            <Typography variant='caption' color='text.secondary'>/{post.slug}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={post.status} size='small' color={statusColors[post.status] || 'default'} />
                          </TableCell>
                          <TableCell>{post.category?.name || '-'}</TableCell>
                          <TableCell>{post.author?.name}</TableCell>
                          <TableCell>{post.views.toLocaleString()}</TableCell>
                          <TableCell>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                              {post.status === 'DRAFT' && (
                                <IconButton size='small' color='success' onClick={() => handlePublish(post.id)} title='Publish'>
                                  <i className='tabler-send' style={{ fontSize: 18 }} />
                                </IconButton>
                              )}
                              <IconButton size='small' onClick={() => router.push(`/blog/${post.id}/edit`)} title='Edit'>
                                <i className='tabler-edit' style={{ fontSize: 18 }} />
                              </IconButton>
                              <IconButton size='small' color='error' onClick={() => handleDelete(post.id)} title='Delete'>
                                <i className='tabler-trash' style={{ fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component='div' count={total} page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0) }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default BlogPostsPage
