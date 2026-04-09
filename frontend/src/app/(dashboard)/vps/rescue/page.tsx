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
import Divider from '@mui/material/Divider'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  rescueMode: boolean
  rescuePassword?: string
}

const VPSRescuePage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [rescueActive, setRescueActive] = useState(false)
  const [rescuePassword, setRescuePassword] = useState('')

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vpsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'VPS' || h.type === 'vps' || h.type === 'vds'
        )
        setServers(vpsList)
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
    setRescueActive(server?.rescueMode || false)
    setRescuePassword(server?.rescuePassword || '')
  }

  const currentServer = servers.find((s) => s.id === selectedServer)

  const handleToggleRescue = async () => {
    if (!selectedServer) return
    setToggling(true)
    try {
      const res = await api.post(`/hosting/vps/${selectedServer}/rescue`, { enable: !rescueActive })
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setRescueActive(!rescueActive)
      if (!rescueActive && raw?.password) {
        setRescuePassword(raw.password)
      }
    } catch {
      // silently handle
    } finally {
      setToggling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Rescue System</Typography>
          <Typography variant='body2' color='text.secondary'>
            Boot into rescue mode for server recovery
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
                label='Select Server'
                value={selectedServer}
                onChange={(e) => handleServerChange(e.target.value)}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname || s.ipAddress} ({s.planName})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {selectedServer && currentServer && (
        <>
          {/* Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Rescue Mode Status</Typography>
                  <Chip
                    icon={<i className='tabler-circle-filled' style={{ fontSize: 10 }} />}
                    label={rescueActive ? 'Active' : 'Inactive'}
                    color={rescueActive ? 'success' : 'default'}
                    size='small'
                  />
                </Box>

                <Button
                  variant='contained'
                  color={rescueActive ? 'error' : 'primary'}
                  fullWidth
                  size='large'
                  onClick={handleToggleRescue}
                  disabled={toggling}
                  startIcon={toggling ? <CircularProgress size={20} /> : <i className='tabler-lifebuoy' />}
                >
                  {rescueActive ? 'Disable Rescue Mode' : 'Enable Rescue Mode'}
                </Button>

                {rescueActive && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant='subtitle2' sx={{ mb: 2 }}>Rescue Credentials</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2' color='text.secondary'>IP Address</Typography>
                      <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                        {currentServer.ipAddress}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2' color='text.secondary'>User</Typography>
                      <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>root</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='body2' color='text.secondary'>Password</Typography>
                      <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                        {rescuePassword || '(generated on enable)'}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Alert severity='warning' sx={{ mt: 2 }}>
                  Rescue mode boots a minimal Linux system. Your data is accessible on /dev/sda1.
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Instructions */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  <i className='tabler-info-circle' style={{ fontSize: 18, marginRight: 8 }} />
                  How to Use Rescue Mode
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant='body2' fontWeight={600}>1</Typography>
                    </Box>
                    <Typography variant='body2'>
                      Click "Enable Rescue Mode" to boot the server into a minimal rescue system.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant='body2' fontWeight={600}>2</Typography>
                    </Box>
                    <Typography variant='body2'>
                      Connect via SSH using the credentials shown (ssh root@{currentServer.ipAddress}).
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant='body2' fontWeight={600}>3</Typography>
                    </Box>
                    <Typography variant='body2'>
                      Mount your data partition: mount /dev/sda1 /mnt
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant='body2' fontWeight={600}>4</Typography>
                    </Box>
                    <Typography variant='body2'>
                      Perform your recovery tasks (fix configurations, recover files, repair filesystem).
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography variant='body2' fontWeight={600}>5</Typography>
                    </Box>
                    <Typography variant='body2'>
                      Disable rescue mode and reboot the server to return to normal operation.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default VPSRescuePage
