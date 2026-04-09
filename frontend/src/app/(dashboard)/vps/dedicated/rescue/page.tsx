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
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  planName: string
  status: string
  type: string
  rescueMode?: boolean
}

const DedicatedRescuePage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [rescueActive, setRescueActive] = useState(false)
  const [rescueCredentials, setRescueCredentials] = useState<{ ip: string; user: string; password: string } | null>(null)
  const [toggling, setToggling] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const dedicated = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'DEDICATED' || h.type === 'dedicated'
        )
        setServers(dedicated)
      } catch {
        setServers([])
      } finally {
        setLoadingServers(false)
      }
    }

    fetchServers()
  }, [])

  const currentServer = servers.find((s) => s.id === selectedServer)

  useEffect(() => {
    if (currentServer) {
      setRescueActive(!!currentServer.rescueMode)
      setRescueCredentials(null)
    }
  }, [selectedServer])

  const handleToggleRescue = async () => {
    if (!selectedServer) return
    setToggling(true)
    setError('')
    setSuccess('')
    try {
      const action = rescueActive ? 'disable' : 'enable'
      const res = await api.post(`/hosting/vps/${selectedServer}/rescue`, { action })
      const data = res.data?.data ?? res.data

      if (!rescueActive) {
        setRescueCredentials({
          ip: data?.ip || currentServer?.hostname || 'See email',
          user: data?.user || 'root',
          password: data?.password || 'Check email for credentials',
        })
        setSuccess('Rescue mode enabled. Your server will reboot into rescue system.')
      } else {
        setRescueCredentials(null)
        setSuccess('Rescue mode disabled. Your server will reboot into normal mode.')
      }
      setRescueActive(!rescueActive)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to toggle rescue mode. Please try again.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'error.main', width: 44, height: 44 }}>
            <i className='tabler-lifebuoy' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Rescue System</Typography>
            <Typography variant='body2' color='text.secondary'>
              Boot your server into a rescue system for troubleshooting and data recovery
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Server Selection */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>Select Server</Typography>
            {loadingServers ? (
              <Skeleton height={56} />
            ) : servers.length === 0 ? (
              <Alert severity='info'>No dedicated servers found.</Alert>
            ) : (
              <CustomTextField
                select
                label='Dedicated Server'
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname || s.id} - {s.planName || 'Dedicated'}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Rescue Mode Status */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Rescue Mode Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label={rescueActive ? 'Active' : 'Inactive'}
                  color={rescueActive ? 'error' : 'default'}
                  size='small'
                />
                <Typography variant='body2' color='text.secondary'>
                  {rescueActive
                    ? 'Server is booted into rescue system'
                    : 'Server is running in normal mode'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Toggle Rescue */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              {!rescueActive ? (
                <Alert severity='warning' sx={{ mb: 3 }}>
                  Enabling rescue mode will reboot your server into a minimal Linux rescue environment. You can then SSH into the server to troubleshoot issues, recover data, or fix configuration problems.
                </Alert>
              ) : (
                <Alert severity='info' sx={{ mb: 3 }}>
                  Disabling rescue mode will reboot your server back into its normal operating system.
                </Alert>
              )}

              <Button
                variant='contained'
                color={rescueActive ? 'success' : 'error'}
                size='large'
                fullWidth
                onClick={handleToggleRescue}
                disabled={toggling}
                startIcon={toggling ? <CircularProgress size={20} /> : <i className={rescueActive ? 'tabler-power' : 'tabler-lifebuoy'} />}
              >
                {toggling
                  ? (rescueActive ? 'Disabling Rescue Mode...' : 'Enabling Rescue Mode...')
                  : (rescueActive ? 'Disable Rescue Mode & Reboot' : 'Enable Rescue Mode & Reboot')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Rescue Credentials */}
      {rescueCredentials && (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3, color: 'error.main' }}>
                <i className='tabler-key' style={{ fontSize: 20, marginRight: 8, verticalAlign: 'text-bottom' }} />
                Rescue System Credentials
              </Typography>
              <Alert severity='warning' sx={{ mb: 3 }}>
                Save these credentials now. The password will not be shown again.
              </Alert>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, fontFamily: 'monospace' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>SSH Host</Typography>
                  <Typography variant='body2' fontWeight={600}>{rescueCredentials.ip}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>Username</Typography>
                  <Typography variant='body2' fontWeight={600}>{rescueCredentials.user}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Password</Typography>
                  <Typography variant='body2' fontWeight={600}>{rescueCredentials.password}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Recovery Instructions */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                <i className='tabler-book' style={{ fontSize: 20, marginRight: 8, verticalAlign: 'text-bottom' }} />
                Recovery Instructions
              </Typography>
              <Box component='ol' sx={{ pl: 3, '& li': { mb: 1.5 } }}>
                <li>
                  <Typography variant='body2'>
                    <strong>Enable Rescue Mode</strong> - Click the button above to reboot your server into rescue mode.
                  </Typography>
                </li>
                <li>
                  <Typography variant='body2'>
                    <strong>Connect via SSH</strong> - Use the provided credentials to SSH into the rescue system:
                    <Box component='code' sx={{ display: 'block', bgcolor: 'action.hover', p: 1, mt: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                      ssh root@your-server-ip
                    </Box>
                  </Typography>
                </li>
                <li>
                  <Typography variant='body2'>
                    <strong>Mount your drives</strong> - Your server drives are available for mounting:
                    <Box component='code' sx={{ display: 'block', bgcolor: 'action.hover', p: 1, mt: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                      mount /dev/sda1 /mnt
                    </Box>
                  </Typography>
                </li>
                <li>
                  <Typography variant='body2'>
                    <strong>Troubleshoot / Recover</strong> - Fix configuration files, recover data, repair filesystems, or chroot into your installation.
                  </Typography>
                </li>
                <li>
                  <Typography variant='body2'>
                    <strong>Disable Rescue Mode</strong> - Once done, disable rescue mode to reboot back into your normal OS.
                  </Typography>
                </li>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedRescuePage
