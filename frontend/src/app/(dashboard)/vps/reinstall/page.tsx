'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Switch from '@mui/material/Switch'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  planName: string
  planType: string
  status: string
  ipAddress: string | null
}

interface OsImage {
  imageId: string
  name: string
  osType: string
  version: string
}

// Fallback if the live image list can't be fetched (slugs the backend also accepts)
const fallbackImages: OsImage[] = [
  { imageId: 'ubuntu-24.04', name: 'ubuntu-24.04', osType: 'Linux', version: '24.04' },
  { imageId: 'ubuntu-22.04', name: 'ubuntu-22.04', osType: 'Linux', version: '22.04' },
  { imageId: 'debian-12', name: 'debian-12', osType: 'Linux', version: '12' },
  { imageId: 'debian-11', name: 'debian-11', osType: 'Linux', version: '11' },
  { imageId: 'almalinux-9', name: 'almalinux-9', osType: 'Linux', version: '9' },
  { imageId: 'rocky-9', name: 'rockylinux-9', osType: 'Linux', version: '9' },
  { imageId: 'centos-9', name: 'centos-9-stream', osType: 'Linux', version: '9' },
]

const osIcon = (name: string, osType: string): string => {
  const n = name.toLowerCase()
  if (n.includes('ubuntu')) return 'tabler-brand-ubuntu'
  if (n.includes('debian')) return 'tabler-brand-debian'
  if (n.includes('centos')) return 'tabler-brand-centos'
  if (n.includes('fedora') || n.includes('redhat')) return 'tabler-brand-redhat'
  if (osType === 'Windows' || n.includes('windows')) return 'tabler-brand-windows'
  return 'tabler-server'
}

const stackOptions = [
  { value: 'none', label: 'None (plain OS)' },
  { value: 'docker', label: 'Docker + Docker Compose' },
  { value: 'docker-portainer', label: 'Docker + Portainer (Web UI)' },
  { value: 'k3s', label: 'k3s (Lightweight Kubernetes)' },
  { value: 'k3s-portainer', label: 'k3s + Portainer' },
  { value: 'full-stack', label: 'Full Stack (Docker + k3s + Portainer)' },
]

const VPSReinstallPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [images, setImages] = useState<OsImage[]>(fallbackImages)
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedOs, setSelectedOs] = useState('')
  const [containerStack, setContainerStack] = useState('none')
  const [newPassword, setNewPassword] = useState('')
  const [confirmErase, setConfirmErase] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reinstalling, setReinstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [hostingRes, imagesRes] = await Promise.allSettled([
          api.get('/hosting'),
          api.get('/hosting/vps-images'),
        ])

        if (hostingRes.status === 'fulfilled') {
          const raw = hostingRes.value.data?.data?.data ?? hostingRes.value.data?.data ?? hostingRes.value.data
          const list = Array.isArray(raw) ? raw : raw?.data ?? []
          setServers(
            (Array.isArray(list) ? list : []).filter(
              (h: any) => h.planType === 'VPS' && (h.status === 'ACTIVE' || h.status === 'PROVISIONING'),
            ),
          )
        }

        if (imagesRes.status === 'fulfilled') {
          const raw = imagesRes.value.data?.data ?? imagesRes.value.data
          const list = Array.isArray(raw) ? raw : []
          if (list.length > 0) setImages(list)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const currentServer = servers.find((s) => s.id === selectedServer)
  const selectedImage = images.find((i) => i.imageId === selectedOs)

  const handleReinstall = async () => {
    if (!selectedServer || !selectedOs || !confirmErase) return
    setError(null)
    setReinstalling(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/reinstall`, {
        osTemplate: selectedOs,
        containerStack: containerStack !== 'none' ? containerStack : undefined,
        rootPassword: newPassword || undefined,
      })
      setSuccessMsg(`Reinstall started with ${selectedImage?.name}. This takes a few minutes — your server will come back online automatically.`)
      setConfirmErase(false)
      setSelectedOs('')
      setNewPassword('')
      setContainerStack('none')
    } catch (e: any) {
      const msg = e?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Reinstall failed. Please try again.')
    } finally {
      setReinstalling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Reinstall OS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Reinstall the operating system on your VPS — all Contabo images available
          </Typography>
        </Box>
      </Grid>

      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {error && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setError(null)}>{error}</Alert></Grid>}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loading ? (
              <Skeleton variant='rectangular' height={56} />
            ) : servers.length === 0 ? (
              <Alert severity='info'>You don’t have any active VPS yet.</Alert>
            ) : (
              <CustomTextField
                select
                label='Select Server'
                value={selectedServer}
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedOs(''); setConfirmErase(false); setSuccessMsg(null) }}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.planName} {s.ipAddress ? `— ${s.ipAddress}` : ''} ({s.status})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {currentServer && (
        <>
          <Grid size={{ xs: 12 }}>
            <Alert severity='error' variant='filled'>
              WARNING: This will ERASE all data on the server! Create a snapshot first if you need to preserve your data.
            </Alert>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Select New Operating System
              <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                ({images.length} images available)
              </Typography>
            </Typography>
            <Grid container spacing={3}>
              {images.map((os) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={os.imageId}>
                  <Card
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      border: selectedOs === os.imageId ? 2 : 1,
                      borderColor: selectedOs === os.imageId ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedOs(os.imageId)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ bgcolor: selectedOs === os.imageId ? 'primary.main' : 'action.hover', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <i className={osIcon(os.name, os.osType)} style={{ fontSize: 24, color: selectedOs === os.imageId ? '#fff' : undefined }} />
                      </Avatar>
                      <Typography variant='body2' fontWeight={500}>{os.name}</Typography>
                      <Typography variant='caption' color='text.secondary'>{os.osType}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {selectedOs && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Grid container spacing={3} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <CustomTextField
                        select fullWidth
                        label='Container Stack (Optional)'
                        value={containerStack}
                        onChange={(e) => setContainerStack(e.target.value)}
                        helperText='Pre-install Docker, Kubernetes, or Portainer during reinstall (Linux images only)'
                      >
                        {stackOptions.map((s) => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <CustomTextField
                        fullWidth type='password'
                        label='New Root Password (Optional)'
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        helperText='Set a fresh root password during reinstall — useful if you lost access'
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Switch
                      checked={confirmErase}
                      onChange={(e) => setConfirmErase(e.target.checked)}
                      color='error'
                    />
                    <Typography variant='body1'>
                      I understand all data will be lost and want to reinstall with <strong>{selectedImage?.name}</strong>
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    color='error'
                    size='large'
                    fullWidth
                    onClick={handleReinstall}
                    disabled={!confirmErase || reinstalling}
                    startIcon={reinstalling ? <CircularProgress size={20} /> : <i className='tabler-refresh' />}
                  >
                    {reinstalling ? 'Reinstalling...' : 'Reinstall OS'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

export default VPSReinstallPage
