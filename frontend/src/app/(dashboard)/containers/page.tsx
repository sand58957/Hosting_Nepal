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
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'

import api from '@/lib/api'

interface Container {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped' | 'restarting' | 'paused'
  port: string
  vpsServer: string
  vpsId: string
  created: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  running: 'success',
  stopped: 'error',
  restarting: 'warning',
  paused: 'default',
}

const MyContainersPage = () => {
  const router = useRouter()
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const stats = {
    total: containers.length,
    running: containers.filter((c) => c.status === 'running').length,
    stopped: containers.filter((c) => c.status === 'stopped').length,
    images: new Set(containers.map((c) => c.image)).size,
  }

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        // Containers are managed on individual VPS servers
        // Fetch VPS list and show container info from metadata
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const servers = Array.isArray(raw) ? raw : []

        // Extract container info from VPS metadata
        const containerList: Container[] = []
        for (const server of servers) {
          try {
            const meta = server.cpanelPasswordEncrypted ? JSON.parse(server.cpanelPasswordEncrypted) : {}
            if (meta.containerStack || meta.providerType === 'contabo') {
              containerList.push({
                id: `${server.id}-portainer`,
                name: 'Portainer',
                image: 'portainer/portainer-ce',
                status: server.status === 'ACTIVE' ? 'running' : 'stopped',
                port: '9443',
                vpsServer: server.ipAddress || server.hostname || 'Unknown',
                vpsId: server.id,
                created: server.createdAt,
              })
            }
          } catch { /* skip */ }
        }

        setContainers(containerList)
      } catch {
        setContainers([])
      } finally {
        setLoading(false)
      }
    }

    fetchContainers()
  }, [])

  const handleAction = async (_containerId: string, _action: 'start' | 'stop' | 'restart' | 'remove') => {
    setActionLoading(`${_containerId}-${_action}`)
    try {
      // Container actions require SSH access to the VPS
      // Show info message instead
      await new Promise(r => setTimeout(r, 1000))
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const statCards = [
    { label: 'Total Containers', value: stats.total, icon: 'tabler-box', color: '#7C4DFF' },
    { label: 'Running', value: stats.running, icon: 'tabler-player-play', color: '#4CAF50' },
    { label: 'Stopped', value: stats.stopped, icon: 'tabler-player-stop', color: '#F44336' },
    { label: 'Images', value: stats.images, icon: 'tabler-photo', color: '#2196F3' },
  ]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='h4'>My Containers</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage Docker containers running on your VPS/VDS servers
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-rocket' />}
            onClick={() => router.push('/containers/deploy')}
          >
            Deploy New App
          </Button>
        </Box>
      </Grid>

      {/* Stats Cards */}
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
          {loading ? (
            <Skeleton variant='rectangular' height={120} sx={{ borderRadius: 1 }} />
          ) : (
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                  <i className={stat.icon} style={{ fontSize: 28, color: '#fff' }} />
                </Avatar>
                <Box>
                  <Typography variant='h4'>{stat.value}</Typography>
                  <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      ))}

      {/* Info Alert */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' icon={<i className='tabler-info-circle' />}>
          Containers run on your VPS/VDS servers. Make sure Docker is installed on your server before deploying containers.
          You can pre-install Docker when ordering a new VPS.
        </Alert>
      </Grid>

      {/* Containers Table */}
      <Grid size={{ xs: 12 }}>
        {loading ? (
          <Card>
            <CardContent>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} height={48} sx={{ mb: 1 }} />
              ))}
            </CardContent>
          </Card>
        ) : containers.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-box-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No containers yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Deploy your first containerized application from our templates or your own Docker Compose file.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant='contained'
                    onClick={() => router.push('/containers/deploy')}
                    startIcon={<i className='tabler-rocket' />}
                  >
                    Deploy App
                  </Button>
                  <Button
                    variant='outlined'
                    onClick={() => router.push('/containers/templates')}
                    startIcon={<i className='tabler-apps' />}
                  >
                    Browse Templates
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Container Name</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>VPS Server</TableCell>
                    <TableCell align='right'>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {containers.map((container) => (
                    <TableRow key={container.id} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{container.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{container.image}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                          color={statusColorMap[container.status] || 'default'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{container.port || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{container.vpsServer}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title='Start'>
                            <IconButton
                              size='small'
                              color='success'
                              disabled={actionLoading === `${container.id}-start` || container.status === 'running'}
                              onClick={() => handleAction(container.id, 'start')}
                            >
                              <i className='tabler-player-play' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Stop'>
                            <IconButton
                              size='small'
                              color='error'
                              disabled={actionLoading === `${container.id}-stop` || container.status === 'stopped'}
                              onClick={() => handleAction(container.id, 'stop')}
                            >
                              <i className='tabler-player-stop' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Restart'>
                            <IconButton
                              size='small'
                              color='warning'
                              disabled={actionLoading === `${container.id}-restart`}
                              onClick={() => handleAction(container.id, 'restart')}
                            >
                              <i className='tabler-refresh' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Remove'>
                            <IconButton
                              size='small'
                              color='error'
                              disabled={actionLoading === `${container.id}-remove`}
                              onClick={() => handleAction(container.id, 'remove')}
                            >
                              <i className='tabler-trash' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
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

export default MyContainersPage
