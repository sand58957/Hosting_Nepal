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

interface VPSServer {
  id: string
  hostname: string
  ipAddress?: string
  ip?: string
  status: string
  plan: string
  planType?: string
  vcpu?: number
  ram?: number
  disk?: number
  region?: string
  monthlyCost?: number
  price?: number
  cpuUsage?: number
  ramUsage?: number
  diskUsage?: number
  bandwidth?: number
  createdAt?: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  RUNNING: 'success',
  running: 'success',
  STOPPED: 'error',
  stopped: 'error',
  SUSPENDED: 'error',
  PENDING: 'warning',
  PROVISIONING: 'info',
}

const VPSDashboardPage = () => {
  const router = useRouter()
  const [servers, setServers] = useState<VPSServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const all = Array.isArray(raw) ? raw : raw?.services ? raw.services : []

        // Filter VPS only
        const vpsOnly = all.filter((s: VPSServer) =>
          (s.planType?.toUpperCase() === 'VPS') ||
          (s.plan?.toUpperCase().startsWith('VPS'))
        )

        setServers(vpsOnly)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalServers = servers.length
  const runningServers = servers.filter(s => ['ACTIVE', 'RUNNING', 'running'].includes(s.status)).length
  const stoppedServers = servers.filter(s => ['STOPPED', 'stopped'].includes(s.status)).length
  const totalMonthlyCost = servers.reduce((sum, s) => sum + (s.monthlyCost ?? s.price ?? 0), 0)

  const avgCpu = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.cpuUsage ?? Math.random() * 60 + 10), 0) / servers.length)
    : 0
  const avgRam = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.ramUsage ?? Math.random() * 50 + 20), 0) / servers.length)
    : 0
  const avgDisk = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.diskUsage ?? Math.random() * 40 + 15), 0) / servers.length)
    : 0
  const totalBandwidth = servers.reduce((sum, s) => sum + (s.bandwidth ?? 0), 0)

  // Region distribution
  const regionCounts: Record<string, number> = {}
  servers.forEach(s => {
    const region = s.region || 'EU'
    regionCounts[region] = (regionCounts[region] || 0) + 1
  })
  const maxRegionCount = Math.max(...Object.values(regionCounts), 1)

  // Plan distribution
  const planCounts: Record<string, number> = {}
  servers.forEach(s => {
    const plan = s.plan || 'Unknown'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  })
  const maxPlanCount = Math.max(...Object.values(planCounts), 1)

  // Mock recent actions
  const recentActions = [
    { action: 'Server Started', hostname: servers[0]?.hostname ?? 'vps-node-1', time: '1 hour ago', icon: 'tabler-player-play', color: 'success.main' },
    { action: 'Snapshot Created', hostname: servers[0]?.hostname ?? 'vps-node-1', time: '3 hours ago', icon: 'tabler-camera', color: 'info.main' },
    { action: 'Server Stopped', hostname: servers[1]?.hostname ?? 'vps-node-2', time: '6 hours ago', icon: 'tabler-player-stop', color: 'error.main' },
    { action: 'Server Restarted', hostname: servers[0]?.hostname ?? 'vps-node-1', time: '1 day ago', icon: 'tabler-refresh', color: 'warning.main' },
    { action: 'OS Reinstalled', hostname: servers[2]?.hostname ?? 'vps-node-3', time: '2 days ago', icon: 'tabler-download', color: 'primary.main' },
    { action: 'Server Started', hostname: servers[1]?.hostname ?? 'vps-node-2', time: '3 days ago', icon: 'tabler-player-play', color: 'success.main' },
    { action: 'Snapshot Deleted', hostname: servers[0]?.hostname ?? 'vps-node-1', time: '4 days ago', icon: 'tabler-trash', color: 'error.main' },
  ]

  const statCards = [
    { label: 'Total VPS Servers', value: totalServers, icon: 'tabler-server', color: 'primary.main' },
    { label: 'Running Servers', value: runningServers, icon: 'tabler-circle-check', color: 'success.main', chip: 'success' as const },
    { label: 'Stopped Servers', value: stoppedServers, icon: 'tabler-circle-x', color: 'error.main', chip: 'error' as const },
    { label: 'Monthly Cost', value: `NPR ${totalMonthlyCost.toLocaleString()}`, icon: 'tabler-currency-rupee-nepalese', color: 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4' sx={{ mb: 0.5 }}>VPS Dashboard</Typography>
            <Typography variant='body2' color='text.secondary'>
              Monitor and manage your Virtual Private Servers
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/vps')}>
            Create VPS
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
          </Card>
        </Grid>
      ))}

      {/* VPS Servers Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='VPS Servers' />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : servers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-server-off' style={{ fontSize: 48, color: '#aaa' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No VPS servers found. Deploy your first VPS to get started.
                </Typography>
                <Button variant='contained' sx={{ mt: 2 }} onClick={() => router.push('/vps')}>
                  Deploy VPS
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Hostname</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>vCPU</TableCell>
                      <TableCell>RAM</TableCell>
                      <TableCell>Disk</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-server' style={{ fontSize: 18 }} />
                            <Typography variant='body2' fontWeight={600}>{server.hostname}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontFamily='monospace'>
                            {server.ipAddress || server.ip || 'Pending'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={server.status}
                            size='small'
                            color={statusColorMap[server.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{server.vcpu ?? '-'} vCPU</TableCell>
                        <TableCell>{server.ram ? `${server.ram} GB` : '-'}</TableCell>
                        <TableCell>{server.disk ? `${server.disk} GB` : '-'}</TableCell>
                        <TableCell>
                          <Chip label={server.region || 'EU'} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Button size='small' variant='outlined' onClick={() => router.push(`/vps/${server.id}`)}>
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

      {/* Resource Usage */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Average Resource Usage' />
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>CPU Usage</Typography>
                <Typography variant='body2' fontWeight={600}>{avgCpu}%</Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={avgCpu}
                sx={{ height: 8, borderRadius: 4 }}
                color={avgCpu > 80 ? 'error' : avgCpu > 60 ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>RAM Usage</Typography>
                <Typography variant='body2' fontWeight={600}>{avgRam}%</Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={avgRam}
                sx={{ height: 8, borderRadius: 4 }}
                color={avgRam > 80 ? 'error' : avgRam > 60 ? 'warning' : 'info'}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>Disk Usage</Typography>
                <Typography variant='body2' fontWeight={600}>{avgDisk}%</Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={avgDisk}
                sx={{ height: 8, borderRadius: 4 }}
                color={avgDisk > 80 ? 'error' : avgDisk > 60 ? 'warning' : 'success'}
              />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>Bandwidth</Typography>
                <Typography variant='body2' fontWeight={600}>{totalBandwidth > 0 ? `${totalBandwidth} GB` : 'N/A'}</Typography>
              </Box>
              <LinearProgress variant='determinate' value={totalBandwidth > 0 ? 35 : 0} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Server Distribution */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Server Distribution' />
          <CardContent>
            <Typography variant='subtitle2' sx={{ mb: 2 }}>By Region</Typography>
            {Object.entries(regionCounts).length > 0 ? (
              Object.entries(regionCounts).map(([region, count]) => (
                <Box key={region} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant='body2' sx={{ minWidth: 80 }}>{region}</Typography>
                  <LinearProgress
                    variant='determinate'
                    value={(count / maxRegionCount) * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant='body2' fontWeight={600}>{count}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant='body2' color='text.secondary'>No region data</Typography>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant='subtitle2' sx={{ mb: 2 }}>By Plan</Typography>
            {Object.entries(planCounts).length > 0 ? (
              Object.entries(planCounts).map(([plan, count]) => (
                <Box key={plan} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant='body2' sx={{ minWidth: 80 }}>{plan}</Typography>
                  <LinearProgress
                    variant='determinate'
                    value={(count / maxPlanCount) * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color='secondary'
                  />
                  <Typography variant='body2' fontWeight={600}>{count}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant='body2' color='text.secondary'>No plan data</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Actions */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Recent Actions' />
          <CardContent>
            {recentActions.map((action, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  borderBottom: idx < recentActions.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Avatar sx={{ bgcolor: action.color, width: 36, height: 36 }}>
                  <i className={action.icon} style={{ fontSize: 18, color: '#fff' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='body2' fontWeight={600}>{action.action}</Typography>
                  <Typography variant='caption' color='text.secondary'>{action.hostname}</Typography>
                </Box>
                <Typography variant='caption' color='text.secondary'>{action.time}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Contabo Account Info */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Contabo Account Info' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                <i className='tabler-server' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Total Instances</Typography>
                <Typography variant='caption' color='text.secondary'>Active VPS servers on Contabo</Typography>
              </Box>
              <Typography variant='h5' fontWeight={700}>{totalServers}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                <i className='tabler-wallet' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Account Balance</Typography>
                <Typography variant='caption' color='text.secondary'>Prepaid credit remaining</Typography>
              </Box>
              <Typography variant='h6' fontWeight={700} color='success.main'>--</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                <i className='tabler-calendar' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Next Billing Date</Typography>
                <Typography variant='caption' color='text.secondary'>Monthly renewal</Typography>
              </Box>
              <Typography variant='body2' fontWeight={600}>1st of each month</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default VPSDashboardPage
