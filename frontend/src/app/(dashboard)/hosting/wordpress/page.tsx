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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Website {
  id: string
  domain: string
  planName: string
  planType: string
  status: string
  hasWordPress: boolean
  wordPressSites: Array<{
    id: string
    adminUrl: string | null
    wpVersion: string | null
    status: string
  }>
}

const WordPressPage = () => {
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [installOpen, setInstallOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminUser, setAdminUser] = useState('admin')
  const [adminPass, setAdminPass] = useState('')
  const [siteTitle, setSiteTitle] = useState('')
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      const res = await api.get('/hosting/websites')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setWebsites(Array.isArray(raw) ? raw : [])
    } catch {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setWebsites(Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const wpSites = websites.filter((w) => w.hasWordPress || w.wordPressSites?.length > 0)

  const handleInstall = async () => {
    if (!selectedSite) return
    setInstalling(true)
    setError('')
    try {
      await api.post(`/hosting/websites/${selectedSite}/wordpress/install`, {
        adminEmail,
        adminUser,
        adminPass,
        siteTitle,
      })
      setInstallOpen(false)
      fetchData()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Installation failed')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='WordPress Manager'
            subheader='Install and manage WordPress on your hosting accounts'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-brand-wordpress' />}
                onClick={() => setInstallOpen(true)}
              >
                Install WordPress
              </Button>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={64} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : wpSites.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-brand-wordpress' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No WordPress installations found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Install WordPress on one of your hosting accounts to get started.
                </Typography>
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-brand-wordpress' />}
                  onClick={() => setInstallOpen(true)}
                >
                  Install WordPress
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>WP Version</TableCell>
                      <TableCell>Admin URL</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wpSites.map((site) => (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <i className='tabler-brand-wordpress' style={{ fontSize: 24, color: '#21759b' }} />
                            <Typography variant='body2' fontWeight={500}>
                              {site.domain}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {site.wordPressSites?.[0]?.wpVersion || 'Latest'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant='body2'
                            color='primary.main'
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() =>
                              site.wordPressSites?.[0]?.adminUrl &&
                              window.open(site.wordPressSites[0].adminUrl, '_blank')
                            }
                          >
                            {site.wordPressSites?.[0]?.adminUrl || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={site.wordPressSites?.[0]?.status || 'ACTIVE'}
                            size='small'
                            color='success'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size='small'
                              variant='outlined'
                              startIcon={<i className='tabler-external-link' />}
                              onClick={() =>
                                site.wordPressSites?.[0]?.adminUrl &&
                                window.open(site.wordPressSites[0].adminUrl, '_blank')
                              }
                            >
                              WP Admin
                            </Button>
                            <Button
                              size='small'
                              variant='outlined'
                              color='secondary'
                              startIcon={<i className='tabler-settings' />}
                              onClick={() => router.push(`/hosting/${site.id}/tools`)}
                            >
                              Manage
                            </Button>
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

      {/* Install WordPress Dialog */}
      <Dialog open={installOpen} onClose={() => setInstallOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Install WordPress</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Website</InputLabel>
              <Select
                value={selectedSite}
                label='Select Website'
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                {websites
                  .filter((w) => !w.hasWordPress)
                  .map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.domain}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <CustomTextField
              fullWidth
              label='Admin Email'
              type='email'
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <CustomTextField
              fullWidth
              label='Admin Username'
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
            />
            <CustomTextField
              fullWidth
              label='Admin Password'
              type='password'
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
            />
            <CustomTextField
              fullWidth
              label='Site Title'
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleInstall}
            disabled={installing || !selectedSite || !adminEmail || !adminPass}
            startIcon={installing ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            {installing ? 'Installing...' : 'Install WordPress'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default WordPressPage
