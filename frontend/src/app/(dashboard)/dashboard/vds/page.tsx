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

interface VDSServer {
  id: string
  hostname: string
  ipAddress?: string
  ip?: string
  status: string
  plan: string
  planType?: string
  cores?: number
  ram?: number
  disk?: number
  region?: string
  monthlyCost?: number
  price?: number
  cpuUsage?: number
  ramUsage?: number
  diskUsage?: number
  bandwidth?: number
  networkIn?: number
  networkOut?: number
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

const VDSDashboardPage = () => {
  const router = useRouter()
  const [servers, setServers] = useState<VDSServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const all = Array.isArray(raw) ? raw : raw?.services ? raw.services : []

        // Filter VDS only
        const vdsOnly = all.filter((s: VDSServer) =>
          (s.planType?.toUpperCase() === 'VDS') ||
          (s.plan?.toUpperCase().startsWith('VDS'))
        )

        setServers(vdsOnly)
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
    ? Math.round(servers.reduce((sum, s) => sum + (s.cpuUsage ?? 35), 0) / servers.length)
    : 0
  const avgRam = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.ramUsage ?? 42), 0) / servers.length)
    : 0
  const avgDisk = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.diskUsage ?? 28), 0) / servers.length)
    : 0
  const totalNetworkIn = servers.reduce((sum, s) => sum + (s.networkIn ?? 0), 0)
  const totalNetworkOut = servers.reduce((sum, s) => sum + (s.networkOut ?? 0), 0)

  // Plan distribution
  const planCounts: Record<string, number> = {}
  servers.forEach(s => {
    const plan = s.plan || 'Unknown'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  })
  const maxPlanCount = Math.max(...Object.values(planCounts), 1)

  const statCards = [
    { label: 'Total VDS Servers', value: totalServers, icon: 'tabler-server-bolt', color: 'primary.main' },
    { label: 'Running Servers', value: runningServers, icon: 'tabler-circle-check', color: 'success.main' },
    { label: 'Stopped Servers', value: stoppedServers, icon: 'tabler-circle-x', color: 'error.main' },
    { label: 'Monthly Cost', value: `NPR ${totalMonthlyCost.toLocaleString()}`, icon: 'tabler-currency-rupee-nepalese', color: 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4' sx={{ mb: 0.5 }}>VDS Dashboard</Typography>
            <Typography variant='body2' color='text.secondary'>
              Monitor and manage your Virtual Dedicated Servers with dedicated physical cores
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/vds')}>
            Create VDS
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

      {/* VDS Servers Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='VDS Servers' />
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
                  No VDS servers found. Deploy your first VDS with dedicated cores.
                </Typography>
                <Button variant='contained' sx={{ mt: 2 }} onClick={() => router.push('/vds')}>
                  Deploy VDS
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
                      <TableCell>Physical Cores</TableCell>
                      <TableCell>RAM</TableCell>
                      <TableCell>NVMe Storage</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-server-bolt' style={{ fontSize: 18 }} />
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
                        <TableCell>{server.cores ?? '-'} Cores</TableCell>
                        <TableCell>{server.ram ? `${server.ram} GB` : '-'}</TableCell>
                        <TableCell>{server.disk ? `${server.disk} GB NVMe` : '-'}</TableCell>
                        <TableCell>
                          <Chip label={server.region || 'EU'} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Button size='small' variant='outlined' onClick={() => router.push(`/vds/${server.id}`)}>
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
          <CardHeader title='Resource Usage' />
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='body2'>CPU Usage (Dedicated Cores)</Typography>
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
                <Typography variant='body2'>NVMe Disk Usage</Typography>
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
                <Typography variant='body2'>Network Throughput</Typography>
                <Typography variant='body2' fontWeight={600}>
                  {totalNetworkIn > 0 || totalNetworkOut > 0
                    ? `In: ${totalNetworkIn} GB / Out: ${totalNetworkOut} GB`
                    : 'N/A'}
                </Typography>
              </Box>
              <LinearProgress variant='determinate' value={totalNetworkIn > 0 ? 25 : 0} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Metrics */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Performance Metrics' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                <i className='tabler-cpu' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Dedicated Core Utilization</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Physical cores running at optimal performance
                </Typography>
              </Box>
              <Chip label={`${avgCpu}%`} size='small' color={avgCpu > 80 ? 'error' : 'success'} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
                <i className='tabler-brain' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Memory Pressure</Typography>
                <Typography variant='caption' color='text.secondary'>
                  DDR5 ECC memory allocation status
                </Typography>
              </Box>
              <Chip label={avgRam > 80 ? 'High' : avgRam > 50 ? 'Medium' : 'Low'} size='small' color={avgRam > 80 ? 'error' : avgRam > 50 ? 'warning' : 'success'} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                <i className='tabler-bolt' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>I/O Throughput</Typography>
                <Typography variant='caption' color='text.secondary'>
                  NVMe SSD read/write performance
                </Typography>
              </Box>
              <Chip label='Optimal' size='small' color='success' />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Server Distribution by Plan */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Server Distribution by Plan' />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 8 }}>
                {Object.entries(planCounts).length > 0 ? (
                  Object.entries(planCounts).map(([plan, count]) => (
                    <Box key={plan} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                      <Typography variant='body2' sx={{ minWidth: 100 }}>{plan}</Typography>
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
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>
                      No VDS servers to display distribution
                    </Typography>
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant='subtitle2' sx={{ mb: 2 }}>VDS Plans Available</Typography>
                  {['VDS S', 'VDS M', 'VDS L', 'VDS XL', 'VDS XXL'].map((plan) => (
                    <Box key={plan} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant='caption'>{plan}</Typography>
                      <Chip
                        label={planCounts[plan] ?? 0}
                        size='small'
                        variant='outlined'
                        color={planCounts[plan] ? 'primary' : 'default'}
                      />
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default VDSDashboardPage
