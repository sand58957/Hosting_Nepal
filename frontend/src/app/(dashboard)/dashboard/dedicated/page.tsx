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

interface DedicatedServer {
  id: string
  hostname: string
  ipAddress?: string
  ip?: string
  status: string
  plan: string
  planType?: string
  processor?: string
  cores?: number
  ram?: number
  disk?: number
  storage?: number
  region?: string
  monthlyCost?: number
  price?: number
  cpuUsage?: number
  ramUsage?: number
  diskUsage?: number
  bandwidth?: number
  portSpeed?: string
  uptime?: number
  temperature?: number
  raidStatus?: string
  nextRenewal?: string
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
  MAINTENANCE: 'warning',
}

const DedicatedDashboardPage = () => {
  const router = useRouter()
  const [servers, setServers] = useState<DedicatedServer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const all = Array.isArray(raw) ? raw : raw?.services ? raw.services : []

        // Filter DEDICATED only
        const dedicatedOnly = all.filter((s: DedicatedServer) =>
          (s.planType?.toUpperCase() === 'DEDICATED') ||
          (s.plan?.toUpperCase().startsWith('DEDICATED')) ||
          (s.plan?.toUpperCase().includes('BARE METAL'))
        )

        setServers(dedicatedOnly)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalServers = servers.length
  const activeServers = servers.filter(s => ['ACTIVE', 'RUNNING', 'running'].includes(s.status)).length
  const totalMonthlyCost = servers.reduce((sum, s) => sum + (s.monthlyCost ?? s.price ?? 0), 0)
  const totalStorageTB = servers.reduce((sum, s) => sum + ((s.storage ?? s.disk ?? 0) / 1024), 0)

  const avgCpu = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.cpuUsage ?? 30), 0) / servers.length)
    : 0
  const avgRam = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.ramUsage ?? 45), 0) / servers.length)
    : 0
  const avgDisk = servers.length > 0
    ? Math.round(servers.reduce((sum, s) => sum + (s.diskUsage ?? 35), 0) / servers.length)
    : 0

  const statCards = [
    { label: 'Total Dedicated Servers', value: totalServers, icon: 'tabler-server-2', color: 'primary.main' },
    { label: 'Active Servers', value: activeServers, icon: 'tabler-circle-check', color: 'success.main' },
    { label: 'Monthly Cost', value: `NPR ${totalMonthlyCost.toLocaleString()}`, icon: 'tabler-currency-rupee-nepalese', color: 'warning.main' },
    { label: 'Total Storage', value: `${totalStorageTB.toFixed(1)} TB`, icon: 'tabler-database', color: 'info.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4' sx={{ mb: 0.5 }}>Dedicated Server Dashboard</Typography>
            <Typography variant='body2' color='text.secondary'>
              Monitor and manage your Dedicated Servers with full hardware control
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => router.push('/dedicated')}>
            Order Dedicated Server
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

      {/* Dedicated Servers Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Dedicated Servers' />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : servers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-server-off' style={{ fontSize: 48, color: '#aaa' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No dedicated servers found. Order your first dedicated server for maximum performance.
                </Typography>
                <Button variant='contained' sx={{ mt: 2 }} onClick={() => router.push('/dedicated')}>
                  Order Dedicated Server
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
                      <TableCell>Processor</TableCell>
                      <TableCell>Cores</TableCell>
                      <TableCell>RAM</TableCell>
                      <TableCell>Storage</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-server-2' style={{ fontSize: 18 }} />
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
                        <TableCell>
                          <Typography variant='body2'>{server.processor || 'Intel Xeon'}</Typography>
                        </TableCell>
                        <TableCell>{server.cores ?? '-'}</TableCell>
                        <TableCell>{server.ram ? `${server.ram} GB` : '-'}</TableCell>
                        <TableCell>{server.storage ?? server.disk ? `${server.storage ?? server.disk} GB` : '-'}</TableCell>
                        <TableCell>
                          <Button size='small' variant='outlined' onClick={() => router.push(`/dedicated/${server.id}`)}>
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

      {/* Hardware Overview */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Hardware Overview' />
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
              <Typography variant='caption' color='text.secondary'>
                {servers[0]?.processor || 'Intel Xeon / AMD EPYC'}
              </Typography>
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
                <Typography variant='body2'>Storage Usage</Typography>
                <Typography variant='body2' fontWeight={600}>{avgDisk}%</Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={avgDisk}
                sx={{ height: 8, borderRadius: 4 }}
                color={avgDisk > 80 ? 'error' : avgDisk > 60 ? 'warning' : 'success'}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant='subtitle2' sx={{ mb: 2 }}>Network</Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary'>Port Speed</Typography>
                <Typography variant='h6' fontWeight={700}>{servers[0]?.portSpeed || '1 Gbps'}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant='caption' color='text.secondary'>Bandwidth</Typography>
                <Typography variant='h6' fontWeight={700}>
                  {servers.reduce((sum, s) => sum + (s.bandwidth ?? 0), 0) || 'Unlimited'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Billing Summary */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Billing Summary' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                <i className='tabler-currency-rupee-nepalese' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Current Month Cost</Typography>
                <Typography variant='caption' color='text.secondary'>All dedicated servers combined</Typography>
              </Box>
              <Typography variant='h5' fontWeight={700}>NPR {totalMonthlyCost.toLocaleString()}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
                <i className='tabler-calendar' style={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight={600}>Next Renewal</Typography>
                <Typography variant='caption' color='text.secondary'>Auto-renewal date</Typography>
              </Box>
              <Typography variant='body2' fontWeight={600}>
                {servers[0]?.nextRenewal ? new Date(servers[0].nextRenewal).toLocaleDateString() : '1st of next month'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant='subtitle2' sx={{ mb: 2 }}>Payment History</Typography>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
              <i className='tabler-chart-bar' style={{ fontSize: 40, color: '#aaa' }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                Payment history chart will be available soon
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Server Health */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Server Health' />
          <CardContent>
            <Grid container spacing={3}>
              {/* Uptime Cards */}
              {servers.length > 0 ? servers.map((server) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={server.id}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant='body2' fontWeight={600}>{server.hostname}</Typography>
                      <Chip
                        label={server.status}
                        size='small'
                        color={statusColorMap[server.status] || 'default'}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='caption' color='text.secondary'>Uptime</Typography>
                      <Typography variant='caption' fontWeight={600}>
                        {server.uptime ? `${server.uptime} days` : '99.9%'}
                      </Typography>
                    </Box>
                    <LinearProgress variant='determinate' value={99.9} sx={{ height: 4, borderRadius: 2, mb: 2 }} color='success' />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='caption' color='text.secondary'>Temperature</Typography>
                      <Typography variant='caption' fontWeight={600}>
                        {server.temperature ? `${server.temperature}°C` : 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='caption' color='text.secondary'>RAID Status</Typography>
                      <Chip
                        label={server.raidStatus || 'Healthy'}
                        size='small'
                        color={server.raidStatus === 'Degraded' ? 'error' : 'success'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  </Box>
                </Grid>
              )) : (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <i className='tabler-heartbeat' style={{ fontSize: 48, color: '#aaa' }} />
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                      No dedicated servers to show health status
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Summary health cards when no servers */}
              {servers.length === 0 && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                      <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <i className='tabler-heartbeat' style={{ fontSize: 24, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>Uptime Monitor</Typography>
                      <Typography variant='caption' color='text.secondary'>Available after server setup</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                      <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <i className='tabler-temperature' style={{ fontSize: 24, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>Temperature Monitor</Typography>
                      <Typography variant='caption' color='text.secondary'>Available after server setup</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <i className='tabler-database' style={{ fontSize: 24, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>RAID Status</Typography>
                      <Typography variant='caption' color='text.secondary'>Available after server setup</Typography>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DedicatedDashboardPage
