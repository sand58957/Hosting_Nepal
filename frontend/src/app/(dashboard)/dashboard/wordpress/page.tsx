'use client'

import { useState, useEffect } from 'react'
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
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'

import api from '@/lib/api'

interface WordPressSite {
  id: string
  domain: string
  plan: string
  status: string
  wpVersion?: string
  phpVersion?: string
  diskUsage?: number
  diskLimit?: number
  createdAt?: string
  sslStatus?: string
  updatesAvailable?: boolean
  outdatedPlugins?: number
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  RUNNING: 'success',
  SUSPENDED: 'error',
  EXPIRED: 'error',
  PENDING: 'warning',
  CREATING: 'info',
}

const WordPressDashboardPage = () => {
  const router = useRouter()
  const [sites, setSites] = useState<WordPressSite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sitesRes] = await Promise.allSettled([
          api.get('/hosting/websites'),
        ])

        if (sitesRes.status === 'fulfilled') {
          const raw = sitesRes.value.data?.data?.data ?? sitesRes.value.data?.data ?? sitesRes.value.data
          setSites(Array.isArray(raw) ? raw : raw?.websites ? raw.websites : [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalSites = sites.length
  const activeSites = sites.filter(s => s.status === 'ACTIVE' || s.status === 'RUNNING').length
  const totalDiskUsed = sites.reduce((sum, s) => sum + (s.diskUsage ?? 0), 0)
  const totalDiskLimit = sites.reduce((sum, s) => sum + (s.diskLimit ?? 0), 0)
  const storageUsedGB = (totalDiskUsed / 1024).toFixed(1)
  const storageLimitGB = totalDiskLimit > 0 ? (totalDiskLimit / 1024).toFixed(1) : '0'
  const storagePercent = totalDiskLimit > 0 ? Math.min((totalDiskUsed / totalDiskLimit) * 100, 100) : 0

  const sitesNeedingUpdates = sites.filter(s => s.updatesAvailable).length
  const sitesWithOutdatedPlugins = sites.filter(s => (s.outdatedPlugins ?? 0) > 0).length
  const sslActiveCount = sites.filter(s => s.sslStatus === 'ACTIVE' || s.sslStatus === 'active').length

  // Count sites by plan
  const planCounts: Record<string, number> = {}
  sites.forEach(s => {
    const plan = s.plan || 'Unknown'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  })
  const maxPlanCount = Math.max(...Object.values(planCounts), 1)

  // Mock recent activity
  const recentActivities = [
    { action: 'Site Created', domain: sites[0]?.domain ?? 'example.com', time: '2 hours ago', icon: 'tabler-plus' },
    { action: 'WordPress Updated', domain: sites[0]?.domain ?? 'example.com', time: '5 hours ago', icon: 'tabler-refresh' },
    { action: 'Backup Created', domain: sites[1]?.domain ?? 'site2.com', time: '1 day ago', icon: 'tabler-database' },
    { action: 'Plugin Updated', domain: sites[0]?.domain ?? 'example.com', time: '1 day ago', icon: 'tabler-puzzle' },
    { action: 'SSL Renewed', domain: sites[1]?.domain ?? 'site2.com', time: '2 days ago', icon: 'tabler-lock' },
    { action: 'Site Created', domain: sites[2]?.domain ?? 'site3.com', time: '3 days ago', icon: 'tabler-plus' },
    { action: 'Theme Updated', domain: sites[0]?.domain ?? 'example.com', time: '4 days ago', icon: 'tabler-brush' },
    { action: 'Backup Created', domain: sites[0]?.domain ?? 'example.com', time: '5 days ago', icon: 'tabler-database' },
    { action: 'WordPress Updated', domain: sites[2]?.domain ?? 'site3.com', time: '6 days ago', icon: 'tabler-refresh' },
    { action: 'DNS Updated', domain: sites[1]?.domain ?? 'site2.com', time: '1 week ago', icon: 'tabler-world' },
  ]

  const statCards = [
    { label: 'Total WordPress Sites', value: totalSites, icon: 'tabler-brand-wordpress', color: 'primary.main' },
    { label: 'Active Sites', value: activeSites, icon: 'tabler-circle-check', color: 'success.main' },
    { label: 'Storage Used', value: `${storageUsedGB} GB`, icon: 'tabler-database', color: 'info.main' },
    { label: 'Monthly Bandwidth', value: `${(totalSites * 25).toFixed(0)} GB`, icon: 'tabler-activity', color: 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4' sx={{ mb: 0.5 }}>WordPress Dashboard</Typography>
            <Typography variant='body2' color='text.secondary'>
              Monitor and manage all your WordPress hosting sites
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/hosting')}>
            New WordPress Site
          </Button>
        </Box>
      </Grid>

      {/* Stat Cards */}
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
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
            {stat.label === 'Storage Used' && !loading && (
              <Box sx={{ px: 2, pb: 2 }}>
                <LinearProgress
                  variant='determinate'
                  value={storagePercent}
                  sx={{ height: 6, borderRadius: 3 }}
                  color={storagePercent > 80 ? 'error' : storagePercent > 60 ? 'warning' : 'primary'}
                />
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
                  {storageUsedGB} / {storageLimitGB} GB
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      ))}

      {/* WordPress Sites Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='WordPress Sites' />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : sites.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-brand-wordpress' style={{ fontSize: 48, color: '#aaa' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No WordPress sites found. Create your first WordPress site to get started.
                </Typography>
                <Button variant='contained' sx={{ mt: 2 }} onClick={() => router.push('/hosting')}>
                  Create WordPress Site
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>WP Version</TableCell>
                      <TableCell>PHP Version</TableCell>
                      <TableCell>Disk Usage</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sites.map((site) => (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-brand-wordpress' style={{ fontSize: 18, color: '#21759B' }} />
                            <Typography variant='body2' fontWeight={600}>{site.domain}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={site.plan || 'Basic'} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={site.status}
                            size='small'
                            color={statusColorMap[site.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{site.wpVersion || '6.4'}</TableCell>
                        <TableCell>{site.phpVersion || '8.2'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                            <LinearProgress
                              variant='determinate'
                              value={site.diskLimit ? ((site.diskUsage ?? 0) / site.diskLimit) * 100 : 30}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant='caption'>
                              {site.diskUsage ? `${(site.diskUsage / 1024).toFixed(1)}GB` : 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button size='small' variant='outlined' onClick={() => router.push(`/hosting/${site.id}`)}>
                            Manage
                          </Button>
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

      {/* Performance Section */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Performance Overview' />
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>Average Page Load Time</Typography>
                <Typography variant='body2' fontWeight={600}>1.8s</Typography>
              </Box>
              <LinearProgress variant='determinate' value={36} sx={{ height: 8, borderRadius: 4 }} color='success' />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>Uptime</Typography>
                <Typography variant='body2' fontWeight={600}>99.9%</Typography>
              </Box>
              <LinearProgress variant='determinate' value={99.9} sx={{ height: 8, borderRadius: 4 }} color='success' />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle2' sx={{ mb: 2 }}>Sites by Plan</Typography>
            {Object.entries(planCounts).length > 0 ? (
              Object.entries(planCounts).map(([plan, count]) => (
                <Box key={plan} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant='body2' sx={{ minWidth: 100 }}>{plan}</Typography>
                  <LinearProgress
                    variant='determinate'
                    value={(count / maxPlanCount) * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant='body2' fontWeight={600}>{count}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant='body2' color='text.secondary'>No plan data available</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* WordPress Health */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='WordPress Health' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: sitesNeedingUpdates > 0 ? 'warning.main' : 'success.main', width: 40, height: 40 }}>
                <i className='tabler-refresh' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>WordPress Updates</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {sitesNeedingUpdates > 0 ? `${sitesNeedingUpdates} site(s) need updates` : 'All sites up to date'}
                </Typography>
              </Box>
              <Chip label={sitesNeedingUpdates} size='small' color={sitesNeedingUpdates > 0 ? 'warning' : 'success'} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: sitesWithOutdatedPlugins > 0 ? 'error.main' : 'success.main', width: 40, height: 40 }}>
                <i className='tabler-puzzle' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Outdated Plugins</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {sitesWithOutdatedPlugins > 0 ? `${sitesWithOutdatedPlugins} site(s) with outdated plugins` : 'All plugins current'}
                </Typography>
              </Box>
              <Chip label={sitesWithOutdatedPlugins} size='small' color={sitesWithOutdatedPlugins > 0 ? 'error' : 'success'} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                <i className='tabler-lock' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>SSL Certificates</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {sslActiveCount} of {totalSites} sites have active SSL
                </Typography>
              </Box>
              <Chip label={`${sslActiveCount}/${totalSites}`} size='small' color='success' />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='body2' color='text.secondary'>Overall Health Score</Typography>
              <Chip
                label={sitesNeedingUpdates === 0 && sitesWithOutdatedPlugins === 0 ? 'Excellent' : 'Needs Attention'}
                size='small'
                color={sitesNeedingUpdates === 0 && sitesWithOutdatedPlugins === 0 ? 'success' : 'warning'}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Recent Activity' />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} height={40} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : (
              <Box>
                {recentActivities.map((activity, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1.5,
                      borderBottom: idx < recentActivities.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'action.hover', width: 36, height: 36 }}>
                      <i className={activity.icon} style={{ fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='body2' fontWeight={600}>{activity.action}</Typography>
                      <Typography variant='caption' color='text.secondary'>{activity.domain}</Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>{activity.time}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default WordPressDashboardPage
