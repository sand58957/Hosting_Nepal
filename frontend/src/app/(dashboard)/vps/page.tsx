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
import Divider from '@mui/material/Divider'

import api from '@/lib/api'

interface VPSServer {
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

const VPSListPage = () => {
  const router = useRouter()
  const [servers, setServers] = useState<VPSServer[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchServers = async () => {
    try {
      const res = await api.get('/hosting')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
      const vpsList = (Array.isArray(list) ? list : []).filter(
        (h: any) => h.type === 'VPS' || h.type === 'vps'
      )
      setServers(vpsList)
    } catch {
      setServers([])
    } finally {
      setLoading(false)
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

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='h4'>My Servers</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage your VPS servers
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => router.push('/vps/order')}
          >
            Order New VPS
          </Button>
        </Box>
      </Grid>

      {loading ? (
        <>
          {[...Array(3)].map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant='rectangular' height={260} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </>
      ) : servers.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-server-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No VPS servers yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Order your first VPS to get started.
                </Typography>
                <Button variant='contained' onClick={() => router.push('/vps/order')}>
                  Order Your First VPS
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        servers.map((server) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={server.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant='h6' sx={{ mb: 0.5 }}>
                      {server.hostname || 'Unnamed Server'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                      {server.ipAddress || 'Pending IP'}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<i className='tabler-circle-filled' style={{ fontSize: 10 }} />}
                    label={server.status === 'ACTIVE' || server.status === 'RUNNING' || server.status === 'online' ? 'Online' : 'Offline'}
                    color={statusColorMap[server.status] || 'default'}
                    size='small'
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>
                      <i className='tabler-cpu' style={{ fontSize: 14, marginRight: 4 }} />
                      CPU
                    </Typography>
                    <Typography variant='body2' fontWeight={500}>{server.cpu || '-'} vCPU</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>
                      <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 4 }} />
                      RAM
                    </Typography>
                    <Typography variant='body2' fontWeight={500}>{server.ram || '-'} GB</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>
                      <i className='tabler-database' style={{ fontSize: 14, marginRight: 4 }} />
                      Disk
                    </Typography>
                    <Typography variant='body2' fontWeight={500}>{server.disk || '-'} GB SSD</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>
                      <i className='tabler-brand-ubuntu' style={{ fontSize: 14, marginRight: 4 }} />
                      OS
                    </Typography>
                    <Typography variant='body2' fontWeight={500}>{server.os || '-'}</Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    size='small'
                    variant='contained'
                    color='success'
                    disabled={actionLoading === `${server.id}-start`}
                    onClick={() => handlePowerAction(server.id, 'start')}
                    startIcon={<i className='tabler-player-play' />}
                  >
                    Start
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    color='error'
                    disabled={actionLoading === `${server.id}-stop`}
                    onClick={() => handlePowerAction(server.id, 'stop')}
                    startIcon={<i className='tabler-player-stop' />}
                  >
                    Stop
                  </Button>
                  <Button
                    size='small'
                    variant='contained'
                    color='warning'
                    disabled={actionLoading === `${server.id}-restart`}
                    onClick={() => handlePowerAction(server.id, 'restart')}
                    startIcon={<i className='tabler-refresh' />}
                  >
                    Restart
                  </Button>
                </Box>

                <Button
                  variant='outlined'
                  fullWidth
                  onClick={() => router.push(`/vps/${server.id}`)}
                  startIcon={<i className='tabler-settings' />}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  )
}

export default VPSListPage
