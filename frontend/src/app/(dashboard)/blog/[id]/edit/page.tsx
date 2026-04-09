'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Category { id: string; name: string }
interface Tag { id: string; name: string; slug: string }

const BlogEditPage = () => {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postRes, catRes, tagRes] = await Promise.allSettled([
          api.get(`/blog/posts/${postId}`),
          api.get('/blog/categories'),
          api.get('/blog/tags'),
        ])

        if (catRes.status === 'fulfilled') setCategories(Array.isArray(catRes.value.data?.data) ? catRes.value.data.data : [])
        if (tagRes.status === 'fulfilled') setTags(Array.isArray(tagRes.value.data?.data) ? tagRes.value.data.data : [])

        if (postRes.status === 'fulfilled') {
          const p = postRes.value.data?.data ?? postRes.value.data

          setTitle(p.title || '')
          setContent(p.content || '')
          setExcerpt(p.excerpt || '')
          setFeaturedImage(p.featuredImage || '')
          setStatus(p.status || 'DRAFT')
          setCategoryId(p.categoryId || '')
          setSelectedTags(p.tags?.map((t: Tag) => t.id) || [])
          setSeoTitle(p.seoTitle || '')
          setSeoDescription(p.seoDescription || '')
          setSeoKeywords(p.seoKeywords || '')
          setOgImage(p.ogImage || '')
          setSlug(p.slug || '')
        }
      } catch {
        setErrorMsg('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [postId])

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { setErrorMsg('Title and content are required'); return }

    setSaving(true)

    try {
      await api.patch(`/blog/posts/${postId}`, {
        title: title.trim(), content, excerpt: excerpt || undefined,
        featuredImage: featuredImage || undefined, status,
        categoryId: categoryId || undefined,
        tagIds: selectedTags.length ? selectedTags : [],
        seoTitle: seoTitle || undefined, seoDescription: seoDescription || undefined,
        seoKeywords: seoKeywords || undefined, ogImage: ogImage || undefined,
      })

      setSuccessMsg('Post updated!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      const msg = err.response?.data?.message

      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleAiSeo = async () => {
    if (!content) return

    setAiLoading(true)

    try {
      const res = await api.post('/blog/ai/generate-seo', { content, title })
      const d = res.data?.data ?? res.data

      if (d.seoTitle) setSeoTitle(d.seoTitle)
      if (d.seoDescription) setSeoDescription(d.seoDescription)
      if (d.seoKeywords) setSeoKeywords(d.seoKeywords)
      setSuccessMsg('AI generated SEO!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch { setErrorMsg('AI failed') }
    finally { setAiLoading(false) }
  }

  if (loading) return <Grid container spacing={{ xs: 3, md: 6 }}><Grid size={{ xs: 12 }}><Skeleton height={60} /><Skeleton height={400} sx={{ mt: 2 }} /></Grid></Grid>

  return (
    <Grid container spacing={{ xs: 3, md: 6 }}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button size='small' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/blog')} sx={{ mb: 1 }}>Back</Button>
            <Typography variant='h5'>Edit Post</Typography>
            {slug && <Typography variant='caption' color='text.secondary'>Slug: /{slug}</Typography>}
          </Box>
          <Button variant='contained' onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <i className='tabler-device-floppy' />}>
            Save Changes
          </Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField fullWidth label='Title' value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
            <CustomTextField fullWidth label='Content (Markdown)' value={content}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
              multiline rows={20} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader title='Settings' />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label='Status' onChange={e => setStatus(e.target.value)}>
                <MenuItem value='DRAFT'>Draft</MenuItem>
                <MenuItem value='PUBLISHED'>Published</MenuItem>
                <MenuItem value='SCHEDULED'>Scheduled</MenuItem>
                <MenuItem value='ARCHIVED'>Archived</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={categoryId} label='Category' onChange={e => setCategoryId(e.target.value)}>
                <MenuItem value=''>None</MenuItem>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Tags</InputLabel>
              <Select multiple value={selectedTags} label='Tags'
                onChange={e => setSelectedTags(e.target.value as string[])}
                renderValue={sel => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(sel as string[]).map(id => { const t = tags.find(tag => tag.id === id); return t ? <Chip key={id} label={t.name} size='small' /> : null })}
                  </Box>
                )}>
                {tags.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <CustomTextField fullWidth label='Featured Image URL' value={featuredImage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeaturedImage(e.target.value)} />
            <CustomTextField fullWidth label='Excerpt' value={excerpt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExcerpt(e.target.value)} multiline rows={3} />
          </CardContent>
        </Card>

        <Card>
          <Accordion defaultExpanded disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Typography variant='subtitle1' fontWeight={600}>SEO Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button size='small' variant='outlined' onClick={handleAiSeo} disabled={aiLoading || !content}
                  startIcon={aiLoading ? <CircularProgress size={14} /> : <i className='tabler-sparkles' />}>
                  Generate with AI
                </Button>
                <CustomTextField fullWidth label='SEO Title' value={seoTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoTitle(e.target.value)} helperText={`${seoTitle.length}/60`} />
                <CustomTextField fullWidth label='SEO Description' value={seoDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoDescription(e.target.value)} multiline rows={2} helperText={`${seoDescription.length}/160`} />
                <CustomTextField fullWidth label='SEO Keywords' value={seoKeywords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoKeywords(e.target.value)} />
                <CustomTextField fullWidth label='OG Image URL' value={ogImage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOgImage(e.target.value)} />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>
    </Grid>
  )
}

export default BlogEditPage
