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

  return (
    <Grid container spacing={6}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

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
