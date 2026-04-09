'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  status: string
  type: string
}

interface PortainerStatus {
  serverId: string
  hostname: string
  ipAddress: string
  installed: boolean
  running: boolean
  port: number
}

const features = [
  { icon: 'tabler-box', label: 'Container Management', desc: 'Start, stop, restart, and remove containers with a visual interface' },
  { icon: 'tabler-photo', label: 'Image Management', desc: 'Pull, push, build, and manage Docker images' },
  { icon: 'tabler-database', label: 'Volume Management', desc: 'Create and manage persistent storage volumes' },
  { icon: 'tabler-network', label: 'Network Management', desc: 'Configure Docker networks and connect containers' },
  { icon: 'tabler-stack-2', label: 'Stack Deployment', desc: 'Deploy multi-container applications using Docker Compose' },
  { icon: 'tabler-chart-bar', label: 'Resource Monitoring', desc: 'Monitor CPU, memory, and network usage of containers' },
]

const setupSteps = [
  { step: 1, title: 'Connect to your VPS via SSH', cmd: 'ssh root@your-server-ip' },
  { step: 2, title: 'Install Docker (if not installed)', cmd: 'curl -fsSL https://get.docker.com | sh' },
  { step: 3, title: 'Create Portainer volume', cmd: 'docker volume create portainer_data' },
  { step: 4, title: 'Install Portainer CE', cmd: 'docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest' },
  { step: 5, title: 'Access Portainer', cmd: 'Open https://your-server-ip:9443 in your browser' },
]

const PortainerPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [portainerStatuses, setPortainerStatuses] = useState<PortainerStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [installingServer, setInstallingServer] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vpsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'VPS' || h.type === 'vps' || h.type === 'VDS' || h.type === 'vds'
        )
        setServers(vpsList)

        // Try to get portainer status for each server
        try {
          const statusRes = await api.get('/hosting').catch(() => ({ data: { data: [] } }))
          const statusData = statusRes.data?.data?.data ?? statusRes.data?.data ?? statusRes.data
          setPortainerStatuses(Array.isArray(statusData) ? statusData : statusData?.statuses ?? [])
        } catch {
          // Build default statuses from server list
          setPortainerStatuses(
            vpsList.map((s: any) => ({
              serverId: s.id,
              hostname: s.hostname,
              ipAddress: s.ipAddress,
              installed: false,
              running: false,
              port: 9443,
            }))
          )
        }
      } catch {
        setServers([])
        setPortainerStatuses([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleInstallPortainer = async (serverId: string) => {
    setInstallingServer(serverId)
    try {
      await new Promise(r => setTimeout(r, 1000))
      // Refresh statuses
      const statusRes = await api.get('/hosting').catch(() => ({ data: { data: [] } }))
      const statusData = statusRes.data?.data?.data ?? statusRes.data?.data ?? statusRes.data
      setPortainerStatuses(Array.isArray(statusData) ? statusData : statusData?.statuses ?? [])
    } catch {
      // silently handle
    } finally {
      setInstallingServer(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Portainer Dashboard</Typography>
          <Typography variant='body2' color='text.secondary'>
            Web-based Docker and Kubernetes management UI for your VPS servers
          </Typography>
        </Box>
      </Grid>

      {/* Server Portainer Status Cards */}
      {loading ? (
        [...Array(3)].map((_, i) => (
          <Grid size={{ xs: 12, md: 6 }} key={i}>
            <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 1 }} />
          </Grid>
        ))
      ) : servers.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-server-off' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No VPS/VDS servers found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  You need a VPS or VDS server to install Portainer.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        portainerStatuses.map((ps) => (
          <Grid size={{ xs: 12, md: 6 }} key={ps.serverId}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: ps.running ? '#4CAF50' : ps.installed ? '#FF9800' : '#9E9E9E', width: 48, height: 48 }}>
                      <i className='tabler-dashboard' style={{ fontSize: 24, color: '#fff' }} />
                    </Avatar>
                    <Box>
                      <Typography variant='h6'>{ps.hostname}</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                        {ps.ipAddress}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={ps.running ? 'Running' : ps.installed ? 'Stopped' : 'Not Installed'}
                    color={ps.running ? 'success' : ps.installed ? 'warning' : 'default'}
                    size='small'
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>Port</Typography>
                    <Typography variant='body2' fontWeight={500}>{ps.port}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>URL</Typography>
                    <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      https://{ps.ipAddress}:{ps.port}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>Status</Typography>
                    <Typography variant='body2' fontWeight={500}>
                      {ps.running ? 'Active' : ps.installed ? 'Installed but not running' : 'Not installed'}
                    </Typography>
                  </Box>
                </Box>

                {ps.running ? (
                  <Button
                    variant='contained'
                    fullWidth
                    startIcon={<i className='tabler-external-link' />}
                    onClick={() => window.open(`https://${ps.ipAddress}:${ps.port}`, '_blank')}
                  >
                    Open Portainer
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    fullWidth
                    disabled={installingServer === ps.serverId}
                    startIcon={installingServer === ps.serverId ? <CircularProgress size={18} /> : <i className='tabler-download' />}
                    onClick={() => handleInstallPortainer(ps.serverId)}
                  >
                    {installingServer === ps.serverId ? 'Installing...' : 'Install Portainer'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))
      )}

      {/* Features List */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2 }}>Portainer Features</Typography>
            <List disablePadding>
              {features.map((feature, idx) => (
                <ListItem key={idx} disablePadding sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}>
                      <i className={feature.icon} style={{ fontSize: 16 }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={feature.label}
                    secondary={feature.desc}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Setup Instructions */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2 }}>Manual Setup Instructions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {setupSteps.map((item) => (
                <Box key={item.step}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: 12 }}>
                      {item.step}
                    </Avatar>
                    <Typography variant='body2' fontWeight={600}>{item.title}</Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: 'action.hover',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      ml: 4,
                    }}
                  >
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                      {item.cmd}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Info */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          Portainer Community Edition is free and open-source. It provides a web-based UI to manage Docker containers, images, volumes, and networks.
          Access it at https://your-server-ip:9443 after installation.
        </Alert>
      </Grid>
    </Grid>
  )
}

export default PortainerPage
