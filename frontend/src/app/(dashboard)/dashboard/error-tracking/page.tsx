'use client'

import { useState, useEffect, useCallback } from 'react'

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
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'

import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface ErrorIssue {
  id: string
  shortId: string | null
  title: string
  culprit: string | null
  level: string | null
  status: string | null
  count: number
  userCount: number
  firstSeen: string | null
  lastSeen: string | null
  permalink: string | null
  project: { id: string; slug: string; name: string } | null
}

interface Overview {
  configured: boolean
  glitchtipUrl: string | null
  orgSlug?: string
  projectCount?: number
  projects?: Array<{ id: string; slug: string; name: string }>
  issues?: ErrorIssue[]
  stats?: { unresolved: number }
  error?: string
}

const levelColor = (level: string | null): 'error' | 'warning' | 'info' | 'default' => {
  switch ((level || '').toLowerCase()) {
    case 'fatal':
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    default:
      return 'default'
  }
}

const timeAgo = (iso: string | null): string => {
  if (!iso) return '—'
  const ms = new Date(iso).getTime()

  if (Number.isNaN(ms)) return '—'
  const seconds = Math.floor((Date.now() - ms) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`

  return new Date(iso).toLocaleDateString()
}

const ErrorTrackingPage = () => {
  const currentUser = useAuthStore(s => s.user)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  const isSuperAdmin = mounted && currentUser?.role === 'SUPER_ADMIN'

  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/error-tracking/overview')
      const payload = res.data?.data ?? res.data

      setData(payload ?? null)
    } catch {
      setData({ configured: true, glitchtipUrl: null, error: 'Failed to load error-tracking data.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSuperAdmin) fetchOverview()
  }, [isSuperAdmin, fetchOverview])

  if (mounted && !isSuperAdmin) {
    return <Alert severity='error'>You don’t have access to this page (SUPER_ADMIN only).</Alert>
  }

  const issues = data?.issues ?? []
  const glitchtipUrl = data?.glitchtipUrl || undefined

  const statCards = [
    { label: 'Unresolved Issues', value: data?.stats?.unresolved ?? issues.length, icon: 'tabler-bug', color: 'error.main' },
    { label: 'Projects', value: data?.projectCount ?? data?.projects?.length ?? 0, icon: 'tabler-folder', color: 'primary.main' },
    { label: 'Status', value: data?.configured ? (data?.error ? 'Unreachable' : 'Connected') : 'Not set up', icon: 'tabler-activity', color: data?.configured && !data?.error ? 'success.main' : 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant='h4' sx={{ mb: 0.5 }}>Error Tracking</Typography>
            <Typography variant='body2' color='text.secondary'>
              Live errors from the backend &amp; frontend, captured by self-hosted GlitchTip
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant='outlined' startIcon={<i className='tabler-refresh' />} onClick={fetchOverview} disabled={loading}>
              Refresh
            </Button>
            {glitchtipUrl && (
              <Button
                variant='contained'
                component={Link}
                href={glitchtipUrl}
                target='_blank'
                rel='noopener'
                startIcon={<i className='tabler-external-link' />}
              >
                Open GlitchTip
              </Button>
            )}
          </Box>
        </Box>
      </Grid>

      {/* Not configured */}
      {!loading && data && !data.configured && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' sx={{ alignItems: 'center' }}>
            GlitchTip isn’t connected yet. Deploy the <code>glitchtip/</code> stack, then set{' '}
            <code>GLITCHTIP_API_URL</code>, <code>GLITCHTIP_API_TOKEN</code>, and <code>GLITCHTIP_ORG_SLUG</code> in{' '}
            <code>backend/.env.production</code>. See the “Self-host GlitchTip” runbook.
          </Alert>
        </Grid>
      )}

      {/* Reachability error */}
      {!loading && data?.configured && data?.error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>{data.error}</Alert>
        </Grid>
      )}

      {/* Stat cards */}
      {statCards.map(stat => (
        <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {loading ? (
                  <Skeleton width={60} height={40} />
                ) : (
                  <Typography variant='h4' fontWeight={700}>{stat.value}</Typography>
                )}
                <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                <i className={stat.icon} style={{ fontSize: 24, color: '#fff' }} />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Issues table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Unresolved Issues' subheader={glitchtipUrl ? undefined : undefined} />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(5)].map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)}
              </Box>
            ) : issues.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-mood-smile' style={{ fontSize: 48, color: '#4caf50' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  {data?.configured && !data?.error
                    ? 'No unresolved errors. All clear 🎉'
                    : 'No data to show yet.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Issue</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Project</TableCell>
                      <TableCell align='right'>Events</TableCell>
                      <TableCell align='right'>Users</TableCell>
                      <TableCell>Last Seen</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues.map(issue => (
                      <TableRow key={issue.id} hover>
                        <TableCell sx={{ maxWidth: 380 }}>
                          <Typography variant='body2' fontWeight={600} noWrap title={issue.title}>
                            {issue.title}
                          </Typography>
                          {issue.culprit && (
                            <Typography variant='caption' color='text.secondary' noWrap display='block' title={issue.culprit}>
                              {issue.culprit}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={issue.level || 'unknown'} size='small' color={levelColor(issue.level)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{issue.project?.name || issue.project?.slug || '—'}</Typography>
                        </TableCell>
                        <TableCell align='right'>{issue.count.toLocaleString()}</TableCell>
                        <TableCell align='right'>{issue.userCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>{timeAgo(issue.lastSeen)}</Typography>
                        </TableCell>
                        <TableCell>
                          {issue.permalink && (
                            <Button size='small' variant='outlined' component={Link} href={issue.permalink} target='_blank' rel='noopener'>
                              View
                            </Button>
                          )}
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
    </Grid>
  )
}

export default ErrorTrackingPage
