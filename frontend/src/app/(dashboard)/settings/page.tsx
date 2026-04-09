'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const SettingsPage = () => {
  const { user, setUser } = useAuthStore()
  const [currentTab, setCurrentTab] = useState(0)

  // Profile
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [billingAlerts, setBillingAlerts] = useState(true)
  const [domainExpiry, setDomainExpiry] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [ticketUpdates, setTicketUpdates] = useState(true)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setTwoFactorEnabled(user.twoFactorEnabled || false)
    }
  }, [user])

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileMessage(null)

    try {
      const response = await api.put('/auth/profile', { name, phone })
      const updatedUser = response.data.data?.user || response.data.data

      if (updatedUser) {
        setUser({ ...user!, ...updatedUser })
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setProfileMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }

    setPasswordSaving(true)
    setPasswordMessage(null)

    try {
      await api.put('/auth/change-password', { currentPassword, newPassword })
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setPasswordMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to change password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleToggle2FA = async () => {
    try {
      await api.post('/auth/2fa/toggle', { enable: !twoFactorEnabled })
      setTwoFactorEnabled(!twoFactorEnabled)
    } catch {
      // silently handle
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Settings' />
          <CardContent>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 4 }}>
              <Tab label='Profile' />
              <Tab label='Security' />
              <Tab label='Notifications' />
            </Tabs>

            {/* Profile Tab */}
            {currentTab === 0 && (
              <Box sx={{ maxWidth: 600 }}>
                {profileMessage && (
                  <Alert severity={profileMessage.type} sx={{ mb: 3 }} onClose={() => setProfileMessage(null)}>
                    {profileMessage.text}
                  </Alert>
                )}
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Full Name'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Email Address'
                      value={email}
                      disabled
                      helperText='Email cannot be changed.'
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Phone Number'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder='+977 98XXXXXXXX'
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant='contained' onClick={handleProfileSave} disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Security Tab */}
            {currentTab === 1 && (
              <Box sx={{ maxWidth: 600 }}>
                {passwordMessage && (
                  <Alert severity={passwordMessage.type} sx={{ mb: 3 }} onClose={() => setPasswordMessage(null)}>
                    {passwordMessage.text}
                  </Alert>
                )}

                <Typography variant='h6' sx={{ mb: 3 }}>
                  Change Password
                </Typography>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Current Password'
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton edge='end' onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                <i className={showCurrentPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='New Password'
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton edge='end' onClick={() => setShowNewPassword(!showNewPassword)}>
                                <i className={showNewPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField
                      fullWidth
                      label='Confirm New Password'
                      type='password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant='contained' onClick={handlePasswordChange} disabled={passwordSaving}>
                      {passwordSaving ? 'Changing...' : 'Change Password'}
                    </Button>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 4 }} />

                <Typography variant='h6' sx={{ mb: 2 }}>
                  Two-Factor Authentication
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </Typography>
                <FormControlLabel
                  control={<Switch checked={twoFactorEnabled} onChange={handleToggle2FA} />}
                  label={twoFactorEnabled ? 'Enabled' : 'Disabled'}
                />
              </Box>
            )}

            {/* Notifications Tab */}
            {currentTab === 2 && (
              <Box sx={{ maxWidth: 600 }}>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Email Preferences
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                    }
                    label='General email notifications'
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={billingAlerts} onChange={(e) => setBillingAlerts(e.target.checked)} />
                    }
                    label='Billing and payment alerts'
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={domainExpiry} onChange={(e) => setDomainExpiry(e.target.checked)} />
                    }
                    label='Domain expiry reminders'
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={ticketUpdates} onChange={(e) => setTicketUpdates(e.target.checked)} />
                    }
                    label='Support ticket updates'
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />
                    }
                    label='Marketing and promotional emails'
                  />
                </Box>
                <Button variant='contained' sx={{ mt: 3 }}>
                  Save Preferences
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SettingsPage
