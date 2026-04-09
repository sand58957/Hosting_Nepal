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
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
}

const getPasswordStrength = (password: string): { value: number; label: string; color: 'error' | 'warning' | 'success' } => {
  if (!password) return { value: 0, label: '', color: 'error' }
  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[a-z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^A-Za-z0-9]/.test(password)) score += 15
  if (score >= 75) return { value: score, label: 'Strong', color: 'success' }
  if (score >= 45) return { value: score, label: 'Medium', color: 'warning' }
  return { value: score, label: 'Weak', color: 'error' }
}

const VPSPasswordResetPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

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

  const currentServer = servers.find((s) => s.id === selectedServer)
  const passwordStrength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword === confirmPassword
  const canReset = newPassword.length >= 8 && passwordsMatch && selectedServer

  const handleReset = async () => {
    if (!canReset) return
    setResetting(true)
    setSuccess(false)
    try {
      await api.post(`/hosting/vps/${selectedServer}/password-reset`, { password: newPassword })
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
    } catch {
      // silently handle
    } finally {
      setResetting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Password Reset</Typography>
          <Typography variant='body2' color='text.secondary'>
            Reset the root password for your VPS
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
                onChange={(e) => { setSelectedServer(e.target.value); setSuccess(false) }}
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
          {/* Server Info */}
          <Grid size={{ xs: 12 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>IP Address</Typography>
                    <Typography variant='body1' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {currentServer.ipAddress || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Hostname</Typography>
                    <Typography variant='body1' fontWeight={500}>
                      {currentServer.hostname || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Plan</Typography>
                    <Typography variant='body1' fontWeight={500}>
                      {currentServer.planName || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {success && (
            <Grid size={{ xs: 12 }}>
              <Alert severity='success'>
                Password has been reset successfully. The server is restarting to apply the new password.
              </Alert>
            </Grid>
          )}

          {/* Password Form */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>New Root Password</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <CustomTextField
                    label='New Password'
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge='end' size='small'>
                              <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {newPassword && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='caption' color='text.secondary'>Password Strength</Typography>
                        <Typography variant='caption' color={`${passwordStrength.color}.main`} fontWeight={500}>
                          {passwordStrength.label}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={passwordStrength.value}
                        color={passwordStrength.color}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}

                  <CustomTextField
                    label='Confirm Password'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    error={confirmPassword.length > 0 && !passwordsMatch}
                    helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ''}
                  />

                  <Alert severity='warning'>
                    Server will be restarted to apply new password. Plan this during low-traffic periods.
                  </Alert>

                  <Button
                    variant='contained'
                    size='large'
                    fullWidth
                    onClick={handleReset}
                    disabled={!canReset || resetting}
                    startIcon={resetting ? <CircularProgress size={20} /> : <i className='tabler-key' />}
                  >
                    {resetting ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tips */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>Password Requirements</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={newPassword.length >= 8 ? 'tabler-circle-check' : 'tabler-circle'} style={{ fontSize: 18, color: newPassword.length >= 8 ? '#4caf50' : '#aaa' }} />
                    <Typography variant='body2'>At least 8 characters</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={/[A-Z]/.test(newPassword) ? 'tabler-circle-check' : 'tabler-circle'} style={{ fontSize: 18, color: /[A-Z]/.test(newPassword) ? '#4caf50' : '#aaa' }} />
                    <Typography variant='body2'>Contains uppercase letter</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={/[a-z]/.test(newPassword) ? 'tabler-circle-check' : 'tabler-circle'} style={{ fontSize: 18, color: /[a-z]/.test(newPassword) ? '#4caf50' : '#aaa' }} />
                    <Typography variant='body2'>Contains lowercase letter</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={/[0-9]/.test(newPassword) ? 'tabler-circle-check' : 'tabler-circle'} style={{ fontSize: 18, color: /[0-9]/.test(newPassword) ? '#4caf50' : '#aaa' }} />
                    <Typography variant='body2'>Contains a number</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={/[^A-Za-z0-9]/.test(newPassword) ? 'tabler-circle-check' : 'tabler-circle'} style={{ fontSize: 18, color: /[^A-Za-z0-9]/.test(newPassword) ? '#4caf50' : '#aaa' }} />
                    <Typography variant='body2'>Contains a special character</Typography>
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

export default VPSPasswordResetPage
