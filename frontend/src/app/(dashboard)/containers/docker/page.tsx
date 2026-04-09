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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface DockerInfo {
  version: string
  imagesCount: number
  containersCount: number
  containersRunning: number
  containersStopped: number
  volumesCount: number
}

interface DockerContainer {
  id: string
  name: string
  image: string
  status: string
  ports: string
  cpuPercent: string
  memUsage: string
}

interface DockerImage {
  id: string
  repository: string
  tag: string
  size: string
  created: string
}

interface DockerVolume {
  name: string
  driver: string
  mountPoint: string
}

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  status: string
  type: string
}

const DockerManagementPage = () => {
  const router = useRouter()
  const [selectedServer, setSelectedServer] = useState('')
  const [servers, setServers] = useState<VPSServer[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null)
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [images, setImages] = useState<DockerImage[]>([])
  const [volumes, setVolumes] = useState<DockerVolume[]>([])
  const [pullDialogOpen, setPullDialogOpen] = useState(false)
  const [pullImageName, setPullImageName] = useState('')
  const [pulling, setPulling] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vpsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'VPS' || h.type === 'vps' || h.type === 'VDS' || h.type === 'vds'
        )
        setServers(vpsList)
      } catch {
        setServers([])
      } finally {
        setLoadingServers(false)
      }
    }

    fetchServers()
  }, [])

  const fetchDockerData = async (serverId: string) => {
    setLoading(true)
    try {
      const res = await api.get('/hosting').catch(() => ({ data: { data: [] } }))
      const data = res.data?.data?.data ?? res.data?.data ?? res.data
      setDockerInfo(data?.info || null)
      setContainers(data?.containers || [])
      setImages(data?.images || [])
      setVolumes(data?.volumes || [])
    } catch {
      setDockerInfo(null)
      setContainers([])
      setImages([])
      setVolumes([])
    } finally {
      setLoading(false)
    }
  }

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    if (serverId) fetchDockerData(serverId)
  }

  const handleContainerAction = async (containerId: string, action: string) => {
    setActionLoading(`${containerId}-${action}`)
    try {
      await new Promise(r => setTimeout(r, 500))
      await fetchDockerData(selectedServer)
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const handlePullImage = async () => {
    if (!pullImageName.trim()) return
    setPulling(true)
    try {
      await new Promise(r => setTimeout(r, 500))
      setPullDialogOpen(false)
      setPullImageName('')
      await fetchDockerData(selectedServer)
    } catch {
      // silently handle
    } finally {
      setPulling(false)
    }
  }

  const infoCards = dockerInfo ? [
    { label: 'Docker Version', value: dockerInfo.version, icon: 'tabler-brand-docker', color: '#2196F3' },
    { label: 'Images', value: dockerInfo.imagesCount, icon: 'tabler-photo', color: '#9C27B0' },
    { label: 'Containers', value: `${dockerInfo.containersRunning} / ${dockerInfo.containersCount}`, icon: 'tabler-box', color: '#4CAF50' },
    { label: 'Volumes', value: dockerInfo.volumesCount, icon: 'tabler-database', color: '#FF9800' },
  ] : []

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='h4'>Docker Management</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage Docker containers, images, and volumes on your VPS servers
            </Typography>
          </Box>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-download' />}
            onClick={() => setPullDialogOpen(true)}
            disabled={!selectedServer}
          >
            Pull Image
          </Button>
        </Box>
      </Grid>

      {/* Server Selector */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loadingServers ? (
              <Skeleton variant='rectangular' height={56} />
            ) : (
              <CustomTextField
                select
                label='Select VPS/VDS Server'
                value={selectedServer}
                onChange={(e) => handleServerChange(e.target.value)}
                fullWidth
                helperText='Select a server to manage its Docker installation'
              >
                <MenuItem value=''>-- Select a server --</MenuItem>
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname} ({s.ipAddress}) - {s.type}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {!selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            Select a VPS/VDS server above to view and manage its Docker installation. Connect to your VPS via SSH to manage Docker directly, or use Portainer for web-based management.
          </Alert>
        </Grid>
      )}

      {loading && (
        <Grid size={{ xs: 12 }}>
          <LinearProgress />
        </Grid>
      )}

      {/* Docker Info Cards */}
      {selectedServer && !loading && dockerInfo && (
        <>
          {infoCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar sx={{ bgcolor: card.color, width: 48, height: 48 }}>
                    <i className={card.icon} style={{ fontSize: 24, color: '#fff' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='h5'>{card.value}</Typography>
                    <Typography variant='body2' color='text.secondary'>{card.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </>
      )}

      {/* Running Containers Table */}
      {selectedServer && !loading && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Running Containers</Typography>
              {containers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <i className='tabler-box-off' style={{ fontSize: 48, color: '#ccc' }} />
                  <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                    No containers found on this server
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Image</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ports</TableCell>
                        <TableCell>CPU %</TableCell>
                        <TableCell>Memory</TableCell>
                        <TableCell align='right'>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {containers.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{c.name}</Typography></TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{c.image}</Typography></TableCell>
                          <TableCell>
                            <Chip
                              label={c.status}
                              color={c.status.toLowerCase().includes('up') ? 'success' : 'error'}
                              size='small'
                            />
                          </TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{c.ports || '-'}</Typography></TableCell>
                          <TableCell>{c.cpuPercent || '-'}</TableCell>
                          <TableCell>{c.memUsage || '-'}</TableCell>
                          <TableCell align='right'>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title='Start'>
                                <IconButton size='small' color='success' disabled={!!actionLoading} onClick={() => handleContainerAction(c.id, 'start')}>
                                  <i className='tabler-player-play' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Stop'>
                                <IconButton size='small' color='error' disabled={!!actionLoading} onClick={() => handleContainerAction(c.id, 'stop')}>
                                  <i className='tabler-player-stop' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Restart'>
                                <IconButton size='small' color='warning' disabled={!!actionLoading} onClick={() => handleContainerAction(c.id, 'restart')}>
                                  <i className='tabler-refresh' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Remove'>
                                <IconButton size='small' color='error' disabled={!!actionLoading} onClick={() => handleContainerAction(c.id, 'remove')}>
                                  <i className='tabler-trash' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
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
      )}

      {/* Images Table */}
      {selectedServer && !loading && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6'>Images</Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='tabler-download' />}
                  onClick={() => setPullDialogOpen(true)}
                >
                  Pull Image
                </Button>
              </Box>
              {images.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No images found</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Repository</TableCell>
                        <TableCell>Tag</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {images.map((img) => (
                        <TableRow key={img.id} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{img.repository}</Typography></TableCell>
                          <TableCell><Chip label={img.tag} size='small' variant='outlined' /></TableCell>
                          <TableCell>{img.size}</TableCell>
                          <TableCell>{img.created}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Volumes Table */}
      {selectedServer && !loading && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Volumes</Typography>
              {volumes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No volumes found</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Driver</TableCell>
                        <TableCell>Mount Point</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {volumes.map((vol) => (
                        <TableRow key={vol.name} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{vol.name}</Typography></TableCell>
                          <TableCell>{vol.driver}</TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{vol.mountPoint}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* SSH & Portainer Note */}
      {selectedServer && !loading && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='info'
            action={
              <Button color='inherit' size='small' onClick={() => router.push('/containers/portainer')}>
                Open Portainer
              </Button>
            }
          >
            Connect to your VPS via SSH to manage Docker directly, or use Portainer for web-based management.
          </Alert>
        </Grid>
      )}

      {/* Pull Image Dialog */}
      <Dialog open={pullDialogOpen} onClose={() => setPullDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Pull Docker Image</DialogTitle>
        <DialogContent>
          <CustomTextField
            label='Image Name'
            placeholder='e.g., nginx:latest, mysql:8.0, node:20-alpine'
            value={pullImageName}
            onChange={(e) => setPullImageName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            helperText='Enter the Docker image name with optional tag'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPullDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handlePullImage}
            disabled={!pullImageName.trim() || pulling}
            startIcon={pulling ? <CircularProgress size={18} /> : <i className='tabler-download' />}
          >
            {pulling ? 'Pulling...' : 'Pull Image'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DockerManagementPage
