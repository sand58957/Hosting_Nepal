'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import LinearProgress from '@mui/material/LinearProgress'

import api from '@/lib/api'

interface EmailAccount {
  id: string
  email: string
  domain: string
  provider: 'TITAN' | 'GOOGLE_WORKSPACE'
  plan?: string
  status: string
  storageUsed?: string
  storageLimit?: string
  createdAt?: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  DISABLED: 'error',
}

const providerColorMap: Record<string, 'primary' | 'success'> = {
  TITAN: 'primary',
  GOOGLE_WORKSPACE: 'success',
}

const providerLabel: Record<string, string> = {
  TITAN: 'Titan Email',
  GOOGLE_WORKSPACE: 'Google Workspace',
}

const EmailOverviewPage = () => {
  const router = useRouter()
  const [emails, setEmails] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    try {
      const res = await api.get('/email')
      const d = res.data?.data?.data ?? res.data?.data ?? res.data
      setEmails(Array.isArray(d?.emails) ? d.emails : Array.isArray(d) ? d : [])
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  const activeCount = emails.filter(e => e.status === 'ACTIVE').length
  const titanCount = emails.filter(e => e.provider === 'TITAN').length
  const googleCount = emails.filter(e => e.provider === 'GOOGLE_WORKSPACE').length

  const parseStorage = (val?: string) => {
    if (!val) return 0
    const num = parseFloat(val)
    if (val.toLowerCase().includes('gb')) return num * 1024
    return num
  }

  const totalStorageMB = emails.reduce((sum, e) => sum + parseStorage(e.storageUsed), 0)
  const totalStorageGB = (totalStorageMB / 1024).toFixed(1)

  const stats = [
    {
      title: 'Total Accounts',
      value: loading ? '-' : emails.length,
      icon: 'tabler-mail',
      color: '#7367F0',
    },
    {
      title: 'Active Accounts',
      value: loading ? '-' : activeCount,
      icon: 'tabler-circle-check',
      color: '#28C76F',
    },
    {
      title: 'Storage Used',
      value: loading ? '-' : `${totalStorageGB} GB`,
      icon: 'tabler-database',
      color: '#FF9F43',
    },
    {
      title: 'Titan / Google',
      value: loading ? '-' : `${titanCount} / ${googleCount}`,
      icon: 'tabler-arrows-split-2',
      color: '#00CFE8',
    },
  ]

  return (
    <Grid container spacing={6}>
      {/* Stat Cards */}
      {stats.map((stat, idx) => (
        <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${stat.color}20`,
                }}
              >
                <i className={stat.icon} style={{ fontSize: 24, color: stat.color }} />
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {stat.title}
                </Typography>
                <Typography variant='h5' fontWeight={600}>
                  {stat.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Quick Links */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Card
          sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 }, transition: 'box-shadow 0.2s' }}
          onClick={() => router.push('/email/titan')}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'primary.lighter',
                color: 'primary.main',
              }}
            >
              <i className='tabler-mail-star' style={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6'>Titan Email</Typography>
              <Typography variant='body2' color='text.secondary'>
                Professional email with powerful features
              </Typography>
            </Box>
            <i className='tabler-chevron-right' style={{ fontSize: 20, color: '#aaa' }} />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Card
          sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 }, transition: 'box-shadow 0.2s' }}
          onClick={() => router.push('/email/google-workspace')}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#28C76F20',
                color: '#28C76F',
              }}
            >
              <i className='tabler-brand-google' style={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6'>Google Workspace</Typography>
              <Typography variant='body2' color='text.secondary'>
                Gmail, Drive, Meet, Docs and more
              </Typography>
            </Box>
            <i className='tabler-chevron-right' style={{ fontSize: 20, color: '#aaa' }} />
          </CardContent>
        </Card>
      </Grid>

      {/* Email Accounts Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='All Email Accounts'
            action={
              <>
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-plus' />}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  Create Email Account
                </Button>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                >
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null)
                      router.push('/email/titan')
                    }}
                  >
                    <ListItemIcon>
                      <i className='tabler-mail-star' style={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText>Titan Email</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null)
                      router.push('/email/google-workspace')
                    }}
                  >
                    <ListItemIcon>
                      <i className='tabler-brand-google' style={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText>Google Workspace</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : emails.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-mail-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No email accounts found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Create professional email accounts for your domains with Titan Email or Google Workspace.
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-mail-star' />}
                    onClick={() => router.push('/email/titan')}
                  >
                    Titan Email
                  </Button>
                  <Button
                    variant='outlined'
                    color='success'
                    startIcon={<i className='tabler-brand-google' />}
                    onClick={() => router.push('/email/google-workspace')}
                  >
                    Google Workspace
                  </Button>
                </Box>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email Address</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Storage</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emails.map((email) => {
                      const usedMB = parseStorage(email.storageUsed)
                      const limitMB = parseStorage(email.storageLimit)
                      const pct = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0

                      return (
                        <TableRow key={email.id}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>
                              {email.email}
                            </Typography>
                          </TableCell>
                          <TableCell>{email.domain}</TableCell>
                          <TableCell>
                            <Chip
                              label={providerLabel[email.provider] || email.provider}
                              size='small'
                              color={providerColorMap[email.provider] || 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 120 }}>
                              <Typography variant='caption'>
                                {email.storageUsed || '0 MB'} / {email.storageLimit || 'N/A'}
                              </Typography>
                              <LinearProgress
                                variant='determinate'
                                value={pct}
                                sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                color={pct > 90 ? 'error' : pct > 70 ? 'warning' : 'primary'}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={email.status}
                              size='small'
                              color={statusColorMap[email.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title='Manage'>
                              <IconButton
                                size='small'
                                onClick={() =>
                                  router.push(
                                    email.provider === 'TITAN'
                                      ? '/email/titan'
                                      : '/email/google-workspace'
                                  )
                                }
                              >
                                <i className='tabler-settings' style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default EmailOverviewPage
