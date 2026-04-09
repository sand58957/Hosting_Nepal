'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Avatar from '@mui/material/Avatar'

import api from '@/lib/api'

interface AppTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags?: string[]
}

const defaultTemplates: AppTemplate[] = [
  { id: 'wordpress', name: 'WordPress', description: 'Open-source CMS powering over 40% of the web. Includes PHP, MySQL, and wp-cli.', icon: 'tabler-brand-wordpress', category: 'CMS', tags: ['PHP', 'MySQL'] },
  { id: 'mysql', name: 'MySQL', description: 'Popular open-source relational database management system for structured data storage.', icon: 'tabler-database', category: 'Database', tags: ['SQL', 'RDBMS'] },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Advanced open-source relational database with extensive SQL compliance and features.', icon: 'tabler-database', category: 'Database', tags: ['SQL', 'RDBMS'] },
  { id: 'mongodb', name: 'MongoDB', description: 'NoSQL document database designed for scalability and developer productivity.', icon: 'tabler-database', category: 'Database', tags: ['NoSQL', 'Document'] },
  { id: 'redis', name: 'Redis', description: 'In-memory data structure store used as database, cache, and message broker.', icon: 'tabler-bolt', category: 'Cache', tags: ['In-Memory', 'Key-Value'] },
  { id: 'nginx', name: 'Nginx', description: 'High-performance HTTP server, reverse proxy, and load balancer.', icon: 'tabler-server', category: 'Web Server', tags: ['HTTP', 'Proxy'] },
  { id: 'nodejs', name: 'Node.js', description: 'JavaScript runtime built on V8 engine for building scalable server-side applications.', icon: 'tabler-brand-nodejs', category: 'Runtime', tags: ['JavaScript', 'V8'] },
  { id: 'nextjs', name: 'Next.js', description: 'React framework with server-side rendering, static generation, and API routes.', icon: 'tabler-brand-nextjs', category: 'Framework', tags: ['React', 'SSR'] },
  { id: 'mern-stack', name: 'MERN Stack', description: 'Full-stack bundle: MongoDB, Express.js, React, and Node.js with Nginx reverse proxy.', icon: 'tabler-stack-2', category: 'Full Stack', tags: ['MongoDB', 'React', 'Node.js'] },
  { id: 'lamp-stack', name: 'LAMP Stack', description: 'Classic web stack: Linux, Apache, MySQL, and PHP with phpMyAdmin included.', icon: 'tabler-stack-2', category: 'Full Stack', tags: ['Apache', 'MySQL', 'PHP'] },
]

const categories = ['All', 'CMS', 'Database', 'Cache', 'Web Server', 'Runtime', 'Framework', 'Full Stack']

const categoryColorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' | 'default'> = {
  CMS: 'primary',
  Database: 'info',
  Cache: 'warning',
  'Web Server': 'success',
  Runtime: 'secondary',
  Framework: 'error',
  'Full Stack': 'primary',
}

const AppTemplatesPage = () => {
  const router = useRouter()
  const [templates, setTemplates] = useState<AppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/hosting/containers/templates')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.templates ?? raw?.data ?? []
        setTemplates(list.length > 0 ? list : defaultTemplates)
      } catch {
        setTemplates(defaultTemplates)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const filteredTemplates = activeTab === 'All' ? templates : templates.filter((t) => t.category === activeTab)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>App Templates</Typography>
          <Typography variant='body2' color='text.secondary'>
            1-click deploy popular applications on your VPS servers using Docker
          </Typography>
        </Box>
      </Grid>

      {/* Category Tabs */}
      <Grid size={{ xs: 12 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant='scrollable'
          scrollButtons='auto'
          sx={{ mb: 2 }}
        >
          {categories.map((cat) => (
            <Tab key={cat} label={cat} value={cat} />
          ))}
        </Tabs>
      </Grid>

      {/* Template Cards */}
      {loading ? (
        [...Array(8)].map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
            <Card variant='outlined'>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Skeleton variant='circular' width={56} height={56} sx={{ mx: 'auto', mb: 2 }} />
                <Skeleton width='60%' sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton width='80%' sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton width='80%' sx={{ mx: 'auto', mb: 2 }} />
                <Skeleton width='50%' height={36} sx={{ mx: 'auto' }} />
              </CardContent>
            </Card>
          </Grid>
        ))
      ) : filteredTemplates.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-apps-off' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No templates found in this category
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        filteredTemplates.map((template) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={template.id}>
            <Card
              variant='outlined'
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: 2 },
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, textAlign: 'center', py: 4 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <i className={template.icon} style={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant='h6' sx={{ mb: 0.5 }}>{template.name}</Typography>
                <Chip
                  label={template.category}
                  color={categoryColorMap[template.category] || 'default'}
                  size='small'
                  sx={{ mx: 'auto', mb: 2 }}
                />
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2, flexGrow: 1 }}>
                  {template.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                  {(template.tags || []).map((tag) => (
                    <Chip key={tag} label={tag} size='small' variant='outlined' />
                  ))}
                </Box>
                <Button
                  variant='contained'
                  fullWidth
                  startIcon={<i className='tabler-rocket' />}
                  onClick={() => router.push(`/containers/deploy?template=${template.id}`)}
                >
                  Deploy
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  )
}

export default AppTemplatesPage
