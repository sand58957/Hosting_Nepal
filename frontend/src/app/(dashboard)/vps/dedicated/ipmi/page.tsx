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
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  type: string
}

const DedicatedIPMIPage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [ipmiData, setIpmiData] = useState<{ ip: string; user: string; password: string; gateway: string; subnet: string } | null>(null)
  const [loadingIpmi, setLoadingIpmi] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
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

  useEffect(() => {
    if (!selectedServer) { setIpmiData(null); return }
    const fetchIpmi = async () => {
      setLoadingIpmi(true)
      try {
        const res = await api.get(`/hosting/vps/${selectedServer}/ipmi`)
        const data = res.data?.data ?? res.data
        setIpmiData({
          ip: data?.ip || data?.ipmiIp || 'Not available',
          user: data?.user || data?.ipmiUser || 'ADMIN',
          password: data?.password || data?.ipmiPassword || 'Contact support',
          gateway: data?.gateway || data?.ipmiGateway || '-',
          subnet: data?.subnet || data?.ipmiSubnet || '255.255.255.0',
        })
      } catch {
        setIpmiData({
          ip: 'Contact support for IPMI details',
          user: 'ADMIN',
          password: 'Contact support',
          gateway: '-',
          subnet: '255.255.255.0',
        })
      } finally {
        setLoadingIpmi(false)
      }
    }

    fetchIpmi()
  }, [selectedServer])

  const handleResetPassword = async () => {
    if (!selectedServer || !newPassword) return
    setResettingPassword(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/ipmi/reset-password`, { password: newPassword })
      setSuccess('IPMI password has been reset successfully.')
      setNewPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset IPMI password.')
    } finally {
      setResettingPassword(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-device-desktop' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>IPMI / KVM Console</Typography>
            <Typography variant='body2' color='text.secondary'>
              Access your server remotely via IPMI for out-of-band management and KVM console
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
                    {s.hostname || s.id} ({s.ipAddress || 'No IP'})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* IPMI Connection Details */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>IPMI Connection Details</Typography>
              {loadingIpmi ? (
                <>
                  <Skeleton height={24} sx={{ mb: 1 }} />
                  <Skeleton height={24} sx={{ mb: 1 }} />
                  <Skeleton height={24} />
                </>
              ) : ipmiData ? (
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, fontFamily: 'monospace' }}>
                  {[
                    { label: 'IPMI IP', value: ipmiData.ip },
                    { label: 'Username', value: ipmiData.user },
                    { label: 'Password', value: ipmiData.password },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 0.5 }}>
                        <Typography variant='body2' color='text.secondary'>{item.label}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant='body2' fontWeight={600}>{item.value}</Typography>
                          <Tooltip title='Copy'>
                            <IconButton size='small' onClick={() => copyToClipboard(item.value)}>
                              <i className='tabler-copy' style={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                    </Box>
                  ))}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Console Launch Buttons */}
      {selectedServer && ipmiData && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Remote Console</Typography>
              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant='outlined'>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                        <i className='tabler-browser' style={{ fontSize: 28, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>HTML5 Console</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Browser-based KVM console. No Java required.
                      </Typography>
                      <Button
                        variant='contained'
                        fullWidth
                        onClick={() => window.open(`https://${ipmiData.ip}`, '_blank')}
                        startIcon={<i className='tabler-external-link' />}
                      >
                        Launch HTML5 Console
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant='outlined'>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                        <i className='tabler-app-window' style={{ fontSize: 28, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>Java KVM Console</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Traditional Java-based KVM viewer (requires Java).
                      </Typography>
                      <Button
                        variant='outlined'
                        fullWidth
                        onClick={() => window.open(`https://${ipmiData.ip}/cgi/launchjavakvm.html`, '_blank')}
                        startIcon={<i className='tabler-external-link' />}
                      >
                        Launch Java Console
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant='outlined'>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                        <i className='tabler-terminal' style={{ fontSize: 28, color: '#fff' }} />
                      </Avatar>
                      <Typography variant='subtitle1' fontWeight={600} sx={{ mb: 1 }}>IPMI Web Interface</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                        Full IPMI management interface in browser.
                      </Typography>
                      <Button
                        variant='outlined'
                        fullWidth
                        onClick={() => window.open(`https://${ipmiData.ip}`, '_blank')}
                        startIcon={<i className='tabler-external-link' />}
                      >
                        Open IPMI Web UI
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Reset IPMI Password */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Reset IPMI Password</Typography>
              <CustomTextField
                label='New IPMI Password'
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                sx={{ mb: 3 }}
                helperText='Minimum 8 characters'
              />
              <Button
                variant='contained'
                fullWidth
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 8 || resettingPassword}
                startIcon={resettingPassword ? <CircularProgress size={20} /> : <i className='tabler-key' />}
              >
                {resettingPassword ? 'Resetting...' : 'Reset IPMI Password'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* IPMI Network Info */}
      {selectedServer && ipmiData && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>IPMI Network Configuration</Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>IPMI IP Address</Typography>
                  <Typography variant='body2' fontWeight={600}>{ipmiData.ip}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>Subnet Mask</Typography>
                  <Typography variant='body2' fontWeight={600}>{ipmiData.subnet}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Gateway</Typography>
                  <Typography variant='body2' fontWeight={600}>{ipmiData.gateway}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ipmitool Instructions */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                <i className='tabler-terminal-2' style={{ fontSize: 20, marginRight: 8, verticalAlign: 'text-bottom' }} />
                Connect via ipmitool
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                You can also manage your server using the command-line ipmitool utility:
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, fontFamily: 'monospace', '& p': { mb: 1 } }}>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  # Install ipmitool (Ubuntu/Debian)
                </Typography>
                <Typography variant='body2' sx={{ mb: 2, color: 'primary.main' }}>
                  sudo apt-get install ipmitool
                </Typography>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  # Check power status
                </Typography>
                <Typography variant='body2' sx={{ mb: 2, color: 'primary.main' }}>
                  ipmitool -I lanplus -H {ipmiData?.ip || 'IPMI_IP'} -U {ipmiData?.user || 'ADMIN'} -P YOUR_PASSWORD power status
                </Typography>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  # Power cycle the server
                </Typography>
                <Typography variant='body2' sx={{ mb: 2, color: 'primary.main' }}>
                  ipmitool -I lanplus -H {ipmiData?.ip || 'IPMI_IP'} -U {ipmiData?.user || 'ADMIN'} -P YOUR_PASSWORD power cycle
                </Typography>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  # Open SOL (Serial Over LAN) console
                </Typography>
                <Typography variant='body2' sx={{ color: 'primary.main' }}>
                  ipmitool -I lanplus -H {ipmiData?.ip || 'IPMI_IP'} -U {ipmiData?.user || 'ADMIN'} -P YOUR_PASSWORD sol activate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedIPMIPage
