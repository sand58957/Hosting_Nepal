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
import LinearProgress from '@mui/material/LinearProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  planName: string
  ipAddress: string
  type: string
}

const getPasswordStrength = (password: string): { score: number; label: string; color: 'error' | 'warning' | 'info' | 'success' } => {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score: 20, label: 'Very Weak', color: 'error' }
  if (score === 2) return { score: 40, label: 'Weak', color: 'error' }
  if (score === 3) return { score: 60, label: 'Fair', color: 'warning' }
  if (score === 4) return { score: 80, label: 'Strong', color: 'info' }
  return { score: 100, label: 'Very Strong', color: 'success' }
}

const DedicatedPasswordResetPage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetting, setResetting] = useState(false)
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
  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const canReset = selectedServer && newPassword.length >= 8 && passwordsMatch && strength.score >= 60

  const handleReset = async () => {
    if (!canReset) return
    setResetting(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/password`, { password: newPassword })
      setSuccess('Root password has been reset successfully. Your server will restart to apply the new password.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'warning.main', width: 44, height: 44 }}>
            <i className='tabler-lock' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Password Reset</Typography>
            <Typography variant='body2' color='text.secondary'>
              Reset the root password on your dedicated server
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
                onChange={(e) => { setSelectedServer(e.target.value); setNewPassword(''); setConfirmPassword('') }}
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

      {currentServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Server Info</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>Hostname</Typography>
                <Typography variant='body2' fontWeight={600}>{currentServer.hostname}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>IP Address</Typography>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{currentServer.ipAddress || 'Pending'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Plan</Typography>
                <Typography variant='body2'>{currentServer.planName || 'Dedicated'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Password Form */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Set New Root Password</Typography>

              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='New Root Password'
                    type='password'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    required
                    helperText='Minimum 8 characters with uppercase, lowercase, numbers, and special characters'
                  />
                  {newPassword && (
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='caption'>Password Strength</Typography>
                        <Typography variant='caption' color={`${strength.color}.main`} fontWeight={600}>
                          {strength.label}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={strength.score}
                        color={strength.color}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='Confirm Password'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    error={confirmPassword.length > 0 && !passwordsMatch}
                    helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '}
                  />
                </Grid>
              </Grid>

              <Alert severity='warning' sx={{ mt: 3, mb: 3 }} icon={<i className='tabler-alert-triangle' style={{ fontSize: 20 }} />}>
                Resetting the root password will require a server restart. Your server will experience brief downtime during this process.
              </Alert>

              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleReset}
                disabled={!canReset || resetting}
                startIcon={resetting ? <CircularProgress size={20} /> : <i className='tabler-lock' />}
              >
                {resetting ? 'Resetting Password...' : 'Reset Root Password & Restart'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedPasswordResetPage
