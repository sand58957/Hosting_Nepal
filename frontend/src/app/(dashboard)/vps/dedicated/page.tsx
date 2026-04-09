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
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import api from '@/lib/api'

interface DedicatedServer {
  id: string
  hostname: string
  ipAddress: string
  os: string
  status: string
  planName: string
  cpu: number
  ram: number
  disk: number
  type: string
  features?: {
    processor?: string
    cpuThreads?: number
  }
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  RUNNING: 'success',
  online: 'success',
  PENDING: 'warning',
  STOPPED: 'error',
  offline: 'error',
  SUSPENDED: 'error',
}

const dedicatedFeatures = [
  { icon: 'tabler-cpu', text: 'Intel Xeon Processors' },
  { icon: 'tabler-device-desktop-analytics', text: 'ECC Registered RAM' },
  { icon: 'tabler-database', text: 'Enterprise Storage' },
  { icon: 'tabler-shield-check', text: 'DDoS Protection Included' },
  { icon: 'tabler-certificate', text: '99.99% SLA Guarantee' },
  { icon: 'tabler-server', text: 'IPMI / KVM Access' },
]

const DedicatedPage = () => {
  const router = useRouter()

  const [servers, setServers] = useState<DedicatedServer[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchServers = async () => {
    try {
      const res = await api.get('/hosting')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
      const dedicatedList = (Array.isArray(list) ? list : []).filter(
        (h: any) => h.type === 'DEDICATED' || h.type === 'dedicated'
      )
      setServers(dedicatedList)
    } catch {
      setServers([])
    } finally {
      setLoadingServers(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  const handlePowerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(`${serverId}-${action}`)
    try {
      await api.post(`/hosting/vps/${serverId}/${action}`)
      await fetchServers()
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusLabel = (status: string) => {
    const s = status?.toUpperCase()
    if (s === 'ACTIVE' || s === 'RUNNING' || status === 'online') return 'Online'
    if (s === 'PENDING') return 'Pending'
    if (s === 'STOPPED' || status === 'offline') return 'Offline'
    if (s === 'SUSPENDED') return 'Suspended'
    return status || 'Unknown'
  }

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                <i className='tabler-server' style={{ fontSize: 24, color: '#fff' }} />
              </Avatar>
              <Box>
                <Typography variant='h4'>Dedicated Servers</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Bare-metal dedicated servers with full hardware access
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<i className='tabler-plus' />}
              onClick={() => router.push('/vps/dedicated/order')}
            >
              Order New
            </Button>
          </Box>
        </Box>
      </Grid>

      {/* Feature Banner */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(var(--mui-palette-primary-mainChannel) / 0.08) 0%, rgba(var(--mui-palette-primary-mainChannel) / 0.02) 100%)',
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <CardContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <i className='tabler-shield-check' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
              <Typography variant='subtitle1' fontWeight={600} color='primary.main'>
                Why Choose Dedicated Servers?
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {dedicatedFeatures.map((f) => (
                <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className={f.icon} style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
                  <Typography variant='body2' fontWeight={500}>{f.text}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
              Full bare-metal access with dedicated Intel Xeon processors, ECC RAM, and enterprise-grade storage. Ideal for high-performance databases, virtualization, and mission-critical workloads.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Server List */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant='h5'>
              <i className='tabler-server' style={{ fontSize: 22, marginRight: 8, verticalAlign: 'text-bottom' }} />
              My Dedicated Servers
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage your active dedicated servers
            </Typography>
          </Box>
          <Chip
            label={`${servers.length} server${servers.length !== 1 ? 's' : ''}`}
            size='small'
            variant='outlined'
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {loadingServers ? (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Hostname', 'IP Address', 'Processor', 'Status', 'CPU', 'RAM', 'Disk', 'Actions'].map((h) => (
                      <TableCell key={h}>
                        <Typography variant='subtitle2' fontWeight={600}>{h}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <TableCell key={j}><Skeleton width={j === 8 ? 100 : 80} /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ) : servers.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Avatar sx={{ bgcolor: 'action.hover', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <i className='tabler-server-off' style={{ fontSize: 40, opacity: 0.5 }} />
                </Avatar>
                <Typography variant='h6' color='text.secondary' sx={{ mt: 1 }}>
                  No dedicated servers yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Order your first dedicated server to get started with full bare-metal performance.
                </Typography>
                <Button
                  variant='contained'
                  onClick={() => router.push('/vps/dedicated/order')}
                  startIcon={<i className='tabler-plus' />}
                >
                  Order Dedicated Server
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Hostname</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>IP Address</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Processor</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Status</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>CPU</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>RAM</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Disk</Typography></TableCell>
                    <TableCell align='right'><Typography variant='subtitle2' fontWeight={600}>Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {servers.map((server) => (
                    <TableRow key={server.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <i className='tabler-server' style={{ fontSize: 16, color: '#fff' }} />
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={600}>
                              {server.hostname || 'Unnamed Server'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {server.planName || 'Dedicated'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {server.ipAddress || 'Pending'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {server.features?.processor || server.os || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<i className='tabler-circle-filled' style={{ fontSize: 8 }} />}
                          label={getStatusLabel(server.status)}
                          color={statusColorMap[server.status] || 'default'}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.cpu || '-'} Cores</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.ram || '-'} GB</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.disk || '-'} GB</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title='Start'>
                            <span>
                              <IconButton
                                size='small'
                                color='success'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'start')}
                              >
                                {actionLoading === `${server.id}-start` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-player-play' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Stop'>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'stop')}
                              >
                                {actionLoading === `${server.id}-stop` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-player-stop' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Restart'>
                            <span>
                              <IconButton
                                size='small'
                                color='warning'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'restart')}
                              >
                                {actionLoading === `${server.id}-restart` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-refresh' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                          <Button
                            size='small'
                            variant='outlined'
                            onClick={() => router.push(`/vps/${server.id}`)}
                            startIcon={<i className='tabler-settings' style={{ fontSize: 16 }} />}
                          >
                            Manage
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Grid>
    </Grid>
  )
}

export default DedicatedPage
