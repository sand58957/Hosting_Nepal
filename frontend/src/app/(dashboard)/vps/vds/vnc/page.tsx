'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VDSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  vncHost: string
  vncPort: number
  vncPassword: string
  vncEnabled: boolean
}

const VDSVncPage = () => {
  const [servers, setServers] = useState<VDSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [vncEnabled, setVncEnabled] = useState(false)
  const [vncInfo, setVncInfo] = useState<{ host: string; port: number; password: string }>({
    host: '',
    port: 5900,
    password: '',
  })

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vdsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'VDS' || h.type === 'vds' || h.planName?.includes('VDS') || h.planType === 'VDS'
        )
        setServers(vdsList)
      } catch {
        setServers([])
      } finally {
        setLoading(false)
      }
    }
    fetchServers()
  }, [])

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    const server = servers.find((s) => s.id === serverId)
    if (server) {
      setVncEnabled(server.vncEnabled ?? true)
      setVncInfo({
        host: server.vncHost || server.ipAddress || '',
        port: server.vncPort || 5900,
        password: server.vncPassword || '',
      })
    }
  }

  const handleToggleVnc = async () => {
    if (!selectedServer) return
    setActionLoading('toggle')
    try {
      await api.post(`/hosting/vps/${selectedServer}/vnc`, { enabled: !vncEnabled })
      setVncEnabled(!vncEnabled)
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetVncPassword = async () => {
    if (!selectedServer) return
    setActionLoading('reset')
    try {
      const res = await api.post(`/hosting/vps/${selectedServer}/vnc/password-reset`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      if (raw?.password) {
        setVncInfo((prev) => ({ ...prev, password: raw.password }))
      }
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const currentServer = servers.find((s) => s.id === selectedServer)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>VDS VNC Console</Typography>
          <Typography variant='body2' color='text.secondary'>
            Remote console access to your VDS with dedicated resources
          </Typography>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loading ? (
              <Skeleton variant='rectangular' height={56} />
            ) : (
              <CustomTextField
                select
                label='Select VDS Server'
                value={selectedServer}
                onChange={(e) => handleServerChange(e.target.value)}
                fullWidth
              >
                {servers.length === 0 ? (
                  <MenuItem disabled>No VDS servers found</MenuItem>
                ) : (
                  servers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.hostname || s.ipAddress} ({s.planName})
                    </MenuItem>
                  ))
                )}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {selectedServer && currentServer && (
        <>
          {/* VNC Connection Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Connection Info</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='body2'>VNC</Typography>
                    <Switch
                      checked={vncEnabled}
                      onChange={handleToggleVnc}
                      disabled={actionLoading === 'toggle'}
                    />
                    <Chip
                      label={vncEnabled ? 'Enabled' : 'Disabled'}
                      color={vncEnabled ? 'success' : 'default'}
                      size='small'
                    />
                  </Box>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant='body2' color='text.secondary'>Host</Typography>
                    <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {vncInfo.host || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant='body2' color='text.secondary'>Port</Typography>
                    <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {vncInfo.port}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body2' color='text.secondary'>Password</Typography>
                    <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {vncInfo.password || '********'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant='contained'
                    fullWidth
                    startIcon={<i className='tabler-external-link' />}
                    disabled={!vncEnabled}
                    onClick={() => window.open(`https://vnc.hostingnepals.com/?host=${vncInfo.host}&port=${vncInfo.port}`, '_blank')}
                  >
                    Open noVNC Console
                  </Button>
                  <Button
                    variant='outlined'
                    fullWidth
                    startIcon={actionLoading === 'reset' ? <CircularProgress size={16} /> : <i className='tabler-refresh' />}
                    onClick={handleResetVncPassword}
                    disabled={actionLoading === 'reset'}
                  >
                    Reset VNC Password
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Instructions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  <i className='tabler-info-circle' style={{ fontSize: 18, marginRight: 8 }} />
                  How to Connect
                </Typography>

                <Typography variant='subtitle2' sx={{ mb: 1 }}>Using noVNC (Browser)</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  Click the "Open noVNC Console" button above to connect directly from your browser. No software installation needed.
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography variant='subtitle2' sx={{ mb: 1 }}>Using TightVNC / RealVNC</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  1. Download and install TightVNC Viewer or RealVNC Viewer.
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  2. Enter the host and port shown above (e.g., {vncInfo.host}:{vncInfo.port}).
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  3. Enter the VNC password when prompted.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  4. You should now see the VDS server console.
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography variant='subtitle2' sx={{ mb: 1 }}>Using macOS Screen Sharing</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Open Finder, press Cmd+K, and enter vnc://{vncInfo.host}:{vncInfo.port}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default VDSVncPage
