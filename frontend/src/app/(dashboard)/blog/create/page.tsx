'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

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
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Category { id: string; name: string }
interface Tag { id: string; name: string; slug: string }

const BlogCreatePage = () => {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // Form state
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

  // AEO
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([])
  const [tldrSummary, setTldrSummary] = useState('')
  const [featuredSnippet, setFeaturedSnippet] = useState('')

  // GEO
  const [targetRegion, setTargetRegion] = useState('np')
  const [localKeywords, setLocalKeywords] = useState('')
  const [contentLanguage, setContentLanguage] = useState('en')

  // AIO
  const [aiSummaryShort, setAiSummaryShort] = useState('')
  const [aiSummaryLong, setAiSummaryLong] = useState('')
  const [entities, setEntities] = useState('')

  // Content Score (derived, not stored)

  useEffect(() => {
    Promise.allSettled([api.get('/blog/categories'), api.get('/blog/tags')]).then(([catRes, tagRes]) => {
      if (catRes.status === 'fulfilled') {
        const d = catRes.value.data?.data ?? catRes.value.data
        setCategories(Array.isArray(d) ? d : [])
      }

      if (tagRes.status === 'fulfilled') {
        const d = tagRes.value.data?.data ?? tagRes.value.data
        setTags(Array.isArray(d) ? d : [])
      }
    })
  }, [])

  const handleSave = async (publishNow = false) => {
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Title and content are required')
      setTimeout(() => setErrorMsg(null), 4000)

      return
    }

    setSaving(true)

    try {
      const body: any = {
        title: title.trim(), content, excerpt: excerpt || undefined,
        featuredImage: featuredImage || undefined,
        status: publishNow ? 'PUBLISHED' : status,
        categoryId: categoryId || undefined,
        tagIds: selectedTags.length ? selectedTags : undefined,
        seoTitle: seoTitle || undefined, seoDescription: seoDescription || undefined,
        seoKeywords: seoKeywords || undefined, ogImage: ogImage || undefined,
      }

      await api.post('/blog/posts', body)
      setSuccessMsg(publishNow ? 'Post published!' : 'Post saved as draft!')
      setTimeout(() => router.push('/blog'), 1500)
    } catch (err: any) {
      const msg = err.response?.data?.message
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save')
      setTimeout(() => setErrorMsg(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleAiSeo = async () => {
    if (!content.trim()) { setErrorMsg('Write some content first'); return }

    setAiLoading(true)

    try {
      const res = await api.post('/blog/ai/generate-seo', { content, title })
      const data = res.data?.data ?? res.data

      if (data.seoTitle) setSeoTitle(data.seoTitle)
      if (data.seoDescription) setSeoDescription(data.seoDescription)
      if (data.seoKeywords) setSeoKeywords(data.seoKeywords)
      setSuccessMsg('AI generated SEO metadata!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setErrorMsg('AI generation failed')
      setTimeout(() => setErrorMsg(null), 4000)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiExcerpt = async () => {
    if (!content.trim()) return

    setAiLoading(true)

    try {
      const res = await api.post('/blog/ai/generate-excerpt', { content })
      const data = res.data?.data ?? res.data

      if (data.excerpt) setExcerpt(data.excerpt)
    } catch { /* ignore */ }
    finally { setAiLoading(false) }
  }

  const contentScore = useMemo(() => {
    const seo = Math.min([seoTitle, seoDescription, seoKeywords, ogImage, title, excerpt].filter(Boolean).length * 16, 100)
    const aeo = Math.min([tldrSummary, featuredSnippet].filter(Boolean).length * 25 + faqItems.length * 10, 100)
    const geo = Math.min([targetRegion, localKeywords].filter(Boolean).length * 30 + (contentLanguage !== 'en' ? 20 : 0), 100)
    const aio = Math.min([aiSummaryShort, aiSummaryLong, entities].filter(Boolean).length * 25, 100)
    return { seo, aeo, geo, aio }
  }, [seoTitle, seoDescription, seoKeywords, ogImage, title, excerpt, tldrSummary, featuredSnippet, faqItems, targetRegion, localKeywords, contentLanguage, aiSummaryShort, aiSummaryLong, entities])

  const handleAiAeo = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const res = await api.post('/blog/ai/generate-summary', { content })
      const data = res.data?.data ?? res.data
      if (data.summary) { setTldrSummary(data.summary); setFeaturedSnippet(data.summary.split('.')[0] + '.') }
      setSuccessMsg('AEO content generated!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch { setErrorMsg('AI generation failed') ; setTimeout(() => setErrorMsg(null), 4000) }
    finally { setAiLoading(false) }
  }

  const handleAiAio = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const res = await api.post('/blog/ai/generate-summary', { content })
      const data = res.data?.data ?? res.data
      if (data.summary) { setAiSummaryShort(data.summary); setAiSummaryLong(content.substring(0, 500) + '...') }
      setSuccessMsg('AIO content generated!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch { setErrorMsg('AI generation failed'); setTimeout(() => setErrorMsg(null), 4000) }
    finally { setAiLoading(false) }
  }

  const addFaqItem = () => setFaqItems([...faqItems, { q: '', a: '' }])
  const updateFaq = (idx: number, field: 'q' | 'a', val: string) => {
    const updated = [...faqItems]; updated[idx][field] = val; setFaqItems(updated)
  }
  const removeFaq = (idx: number) => setFaqItems(faqItems.filter((_, i) => i !== idx))

  // Slug preview
  const slugPreview = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-')

  return (
    <Grid container spacing={{ xs: 3, md: 6 }}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button size='small' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/blog')} sx={{ mb: 1 }}>
              Back to Posts
            </Button>
            <Typography variant='h5'>Create New Post</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant='outlined' onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <CircularProgress size={16} /> : 'Save Draft'}
            </Button>
            <Button variant='contained' onClick={() => handleSave(true)} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <i className='tabler-send' />}>
              Publish
            </Button>
          </Box>
        </Box>
      </Grid>

      {/* Main Content */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField fullWidth label='Title' value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder='Enter blog post title...' />
            {title && (
              <Typography variant='caption' color='text.secondary'>
                Slug: /{slugPreview}
              </Typography>
            )}
            <CustomTextField fullWidth label='Content (Markdown)' value={content}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
              multiline rows={20} placeholder='Write your blog post content here... Markdown is supported.' />
          </CardContent>
        </Card>
      </Grid>

      {/* Sidebar */}
      <Grid size={{ xs: 12, md: 4 }}>
        {/* Status & Category */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title='Settings' />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label='Status' onChange={e => setStatus(e.target.value)}>
                <MenuItem value='DRAFT'>Draft</MenuItem>
                <MenuItem value='PUBLISHED'>Published</MenuItem>
                <MenuItem value='SCHEDULED'>Scheduled</MenuItem>
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
                    {(sel as string[]).map(id => {
                      const t = tags.find(tag => tag.id === id)

                      return t ? <Chip key={id} label={t.name} size='small' /> : null
                    })}
                  </Box>
                )}>
                {tags.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <CustomTextField fullWidth label='Featured Image URL' value={featuredImage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeaturedImage(e.target.value)}
              placeholder='https://...' />
            <CustomTextField fullWidth label='Excerpt' value={excerpt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExcerpt(e.target.value)}
              multiline rows={3} placeholder='Short summary...' />
            <Button size='small' variant='text' onClick={handleAiExcerpt} disabled={aiLoading || !content}
              startIcon={<i className='tabler-sparkles' />}>
              AI Generate Excerpt
            </Button>
          </CardContent>
        </Card>

        {/* SEO */}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoTitle(e.target.value)}
                  placeholder='SEO optimized title' helperText={`${seoTitle.length}/60`} />
                <CustomTextField fullWidth label='SEO Description' value={seoDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoDescription(e.target.value)}
                  multiline rows={2} placeholder='Meta description' helperText={`${seoDescription.length}/160`} />
                <CustomTextField fullWidth label='SEO Keywords' value={seoKeywords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeoKeywords(e.target.value)}
                  placeholder='keyword1, keyword2, ...' />
                <CustomTextField fullWidth label='OG Image URL' value={ogImage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOgImage(e.target.value)}
                  placeholder='https://...' />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>

        {/* Content Score */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title='Content Score' titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
          <CardContent sx={{ pt: 0 }}>
            {[
              { label: 'SEO', score: contentScore.seo, color: '#7367F0', icon: 'tabler-search' },
              { label: 'AEO', score: contentScore.aeo, color: '#28C76F', icon: 'tabler-message-question' },
              { label: 'GEO', score: contentScore.geo, color: '#00BAD1', icon: 'tabler-map-pin' },
              { label: 'AIO', score: contentScore.aio, color: '#FF9F43', icon: 'tabler-robot' },
            ].map(item => (
              <Box key={item.label} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <i className={item.icon} style={{ fontSize: 14, color: item.color }} />
                    <Typography variant='caption' fontWeight={600}>{item.label}</Typography>
                  </Box>
                  <Typography variant='caption' fontWeight={700} sx={{ color: item.score >= 70 ? '#28C76F' : item.score >= 40 ? '#FF9F43' : '#FF4C51' }}>
                    {item.score}%
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 6, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Box sx={{ width: `${item.score}%`, height: '100%', borderRadius: 3, bgcolor: item.color, transition: 'width 0.5s ease' }} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* AEO — Answer Engine Optimization */}
        <Card sx={{ mb: 3 }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-message-question' style={{ fontSize: 18, color: '#28C76F' }} />
                <Typography variant='subtitle1' fontWeight={600}>AEO — Answer Engine</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button size='small' variant='outlined' color='success' onClick={handleAiAeo} disabled={aiLoading || !content}
                  startIcon={aiLoading ? <CircularProgress size={14} /> : <i className='tabler-sparkles' />}>
                  AI Generate AEO Content
                </Button>
                <CustomTextField fullWidth label='TL;DR Summary' value={tldrSummary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTldrSummary(e.target.value)}
                  multiline rows={2} placeholder='Short summary for voice search & featured snippets' />
                <CustomTextField fullWidth label='Featured Snippet Answer' value={featuredSnippet}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeaturedSnippet(e.target.value)}
                  multiline rows={2} placeholder='Direct answer to the main question (40-60 words)' />
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='subtitle2' fontWeight={600}>FAQ Schema (Q&A)</Typography>
                  <Button size='small' onClick={addFaqItem} startIcon={<i className='tabler-plus' />}>Add FAQ</Button>
                </Box>
                {faqItems.map((faq, idx) => (
                  <Box key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='caption' fontWeight={600}>FAQ #{idx + 1}</Typography>
                      <IconButton size='small' onClick={() => removeFaq(idx)}><i className='tabler-x' style={{ fontSize: 14 }} /></IconButton>
                    </Box>
                    <CustomTextField fullWidth label='Question' value={faq.q} sx={{ mb: 1.5 }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFaq(idx, 'q', e.target.value)}
                      placeholder='What is...? How to...?' />
                    <CustomTextField fullWidth label='Answer' value={faq.a} multiline rows={2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFaq(idx, 'a', e.target.value)}
                      placeholder='Direct, concise answer...' />
                  </Box>
                ))}
                {faqItems.length === 0 && (
                  <Typography variant='caption' color='text.secondary'>Add FAQ items to generate Q&A structured data for search engines.</Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>

        {/* GEO — Geographic Optimization */}
        <Card sx={{ mb: 3 }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-map-pin' style={{ fontSize: 18, color: '#00BAD1' }} />
                <Typography variant='subtitle1' fontWeight={600}>GEO — Geographic Targeting</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Target Region</InputLabel>
                  <Select value={targetRegion} label='Target Region' onChange={e => setTargetRegion(e.target.value)}>
                    <MenuItem value='np'>Nepal (NP)</MenuItem>
                    <MenuItem value='in'>India (IN)</MenuItem>
                    <MenuItem value='us'>United States (US)</MenuItem>
                    <MenuItem value='gb'>United Kingdom (GB)</MenuItem>
                    <MenuItem value='global'>Global</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Content Language</InputLabel>
                  <Select value={contentLanguage} label='Content Language' onChange={e => setContentLanguage(e.target.value)}>
                    <MenuItem value='en'>English</MenuItem>
                    <MenuItem value='ne'>Nepali (नेपाली)</MenuItem>
                    <MenuItem value='hi'>Hindi (हिन्दी)</MenuItem>
                    <MenuItem value='en-ne'>Bilingual (English + Nepali)</MenuItem>
                  </Select>
                </FormControl>
                <CustomTextField fullWidth label='Local Keywords' value={localKeywords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalKeywords(e.target.value)}
                  multiline rows={2} placeholder='nepal hosting, kathmandu web hosting, nepali domain...'
                  helperText='Region-specific keywords for local SEO targeting' />
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant='caption' fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                    <i className='tabler-info-circle' style={{ fontSize: 14, marginRight: 4 }} />
                    GEO Schema Preview
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {`"contentLocation": { "@type": "Country", "name": "${targetRegion === 'np' ? 'Nepal' : targetRegion === 'in' ? 'India' : targetRegion === 'us' ? 'United States' : 'Global'}" }`}
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>

        {/* AIO — AI Optimization */}
        <Card sx={{ mb: 3 }}>
          <Accordion disableGutters sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-robot' style={{ fontSize: 18, color: '#FF9F43' }} />
                <Typography variant='subtitle1' fontWeight={600}>AIO — AI Optimization</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button size='small' variant='outlined' color='warning' onClick={handleAiAio} disabled={aiLoading || !content}
                  startIcon={aiLoading ? <CircularProgress size={14} /> : <i className='tabler-sparkles' />}>
                  AI Generate Summaries
                </Button>
                <CustomTextField fullWidth label='AI Summary (Short)' value={aiSummaryShort}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiSummaryShort(e.target.value)}
                  multiline rows={2} placeholder='2-3 sentence summary for AI assistants and chatbots'
                  helperText='Used by ChatGPT, Gemini, Perplexity when citing your content' />
                <CustomTextField fullWidth label='AI Summary (Long)' value={aiSummaryLong}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiSummaryLong(e.target.value)}
                  multiline rows={3} placeholder='Detailed paragraph for AI indexing and knowledge graphs' />
                <CustomTextField fullWidth label='Entity Extraction' value={entities}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntities(e.target.value)}
                  multiline rows={2} placeholder='People: ..., Organizations: ..., Places: ..., Products: ...'
                  helperText='Key entities for semantic search and knowledge graph indexing' />
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant='caption' fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                    <i className='tabler-info-circle' style={{ fontSize: 14, marginRight: 4 }} />
                    AIO Readiness
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {aiSummaryShort ? '✅ Short summary ready' : '⬜ Short summary needed'} &bull;{' '}
                    {aiSummaryLong ? '✅ Long summary ready' : '⬜ Long summary needed'} &bull;{' '}
                    {entities ? '✅ Entities extracted' : '⬜ Entities needed'}
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>
    </Grid>
  )
}

export default BlogCreatePage
