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
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

import api from '@/lib/api'

interface Website {
  id: string
  domain: string
  planName: string
  planType: string
  status: string
  provider: string
  createdAt: string
  expiryDate: string | null
  ipAddress: string | null
  hasWordPress: boolean
  wordPressSites: Array<{
    id: string
    adminUrl: string | null
    wpVersion: string | null
  }>
  diskSpaceMb: number
  diskUsedMb: number
  bandwidthMb: number
  bandwidthUsedMb: number
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PROVISIONING: 'warning',
  PENDING_SETUP: 'warning',
  SUSPENDED: 'error',
  CANCELLED: 'error',
  EXPIRED: 'error',
}

const HostingPage = () => {
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedSite, setSelectedSite] = useState<Website | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchWebsites = async () => {
    try {
      const res = await api.get('/hosting/websites')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setWebsites(Array.isArray(raw) ? raw : [])
    } catch {
      // Also try the legacy endpoint
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const accounts = Array.isArray(raw) ? raw : []
        setWebsites(
          accounts
            .filter((a: any) => a.planType === 'SHARED' || a.planType === 'WORDPRESS')
            .map((a: any) => ({
              id: a.id,
              domain: a.domain?.domainName || a.cpanelUsername || 'N/A',
              planName: a.planName,
              planType: a.planType,
              status: a.status,
              provider: a.provider,
              createdAt: a.createdAt,
              expiryDate: a.expiryDate,
              ipAddress: a.ipAddress,
              hasWordPress: a.planType === 'WORDPRESS',
              wordPressSites: a.wordPressSites || [],
              diskSpaceMb: a.diskSpaceMb || 0,
              diskUsedMb: a.diskUsedMb || 0,
              bandwidthMb: a.bandwidthMb || 0,
              bandwidthUsedMb: a.bandwidthUsedMb || 0,
            }))
        )
      } catch {
        // silently handle
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebsites()
  }, [])

  const filteredWebsites =
    statusFilter === 'ALL' ? websites : websites.filter((w) => w.status === statusFilter)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, site: Website) => {
    setAnchorEl(event.currentTarget)
    setSelectedSite(site)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDelete = async () => {
    if (!selectedSite) return
    setDeleting(true)
    try {
      await api.delete(`/hosting/websites/${selectedSite.id}`)
      setWebsites((prev) => prev.filter((w) => w.id !== selectedSite.id))
    } catch {
      // handle error
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedSite(null)
    }
  }

  const handleSuspend = async () => {
    if (!selectedSite) return
    handleMenuClose()
    try {
      await api.post(`/hosting/${selectedSite.id}/suspend`)
      fetchWebsites()
    } catch {
      // handle error
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='My Websites'
            subheader='Manage your websites and hosting accounts'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => router.push('/hosting/add')}
              >
                Add New Website
              </Button>
            }
          />
          <CardContent>
            {/* Filter */}
            <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size='small' sx={{ minWidth: 160 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  label='Filter by Status'
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value='ALL'>All Statuses</MenuItem>
                  <MenuItem value='ACTIVE'>Active</MenuItem>
                  <MenuItem value='PROVISIONING'>Provisioning</MenuItem>
                  <MenuItem value='SUSPENDED'>Suspended</MenuItem>
                  <MenuItem value='CANCELLED'>Cancelled</MenuItem>
                </Select>
              </FormControl>
              <Typography variant='body2' color='text.secondary'>
                {filteredWebsites.length} website{filteredWebsites.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={64} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : filteredWebsites.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-world-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No websites found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Create your first website to get started with hosting.
                </Typography>
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => router.push('/hosting/add')}
                >
                  Add New Website
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Site Created</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredWebsites.map((site) => (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: site.hasWordPress ? 'info.lighter' : 'primary.lighter',
                              }}
                            >
                              <i
                                className={site.hasWordPress ? 'tabler-brand-wordpress' : 'tabler-world'}
                                style={{
                                  fontSize: 20,
                                  color: site.hasWordPress ? '#2196f3' : '#7c3aed',
                                }}
                              />
                            </Box>
                            <Box>
                              <Typography
                                variant='body2'
                                fontWeight={600}
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                                }}
                                onClick={() => router.push(`/hosting/${site.id}/tools`)}
                              >
                                {site.domain}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {site.planType}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{site.planName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {new Date(site.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={site.status}
                            size='small'
                            color={statusColorMap[site.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {site.hasWordPress && site.wordPressSites?.[0]?.adminUrl && (
                              <Button
                                size='small'
                                variant='outlined'
                                color='info'
                                startIcon={<i className='tabler-brand-wordpress' />}
                                onClick={() =>
                                  window.open(site.wordPressSites[0].adminUrl || '', '_blank')
                                }
                              >
                                WP Admin
                              </Button>
                            )}
                            <Button
                              size='small'
                              variant='contained'
                              startIcon={<i className='tabler-settings' />}
                              onClick={() => router.push(`/hosting/${site.id}/tools`)}
                            >
                              Site Tools
                            </Button>
                            <IconButton
                              size='small'
                              onClick={(e) => handleMenuOpen(e, site)}
                            >
                              <i className='tabler-dots-vertical' />
                            </IconButton>
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

      {/* More Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleMenuClose()
            if (selectedSite) router.push(`/hosting/${selectedSite.id}/tools`)
          }}
        >
          <ListItemIcon>
            <i className='tabler-settings' style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Site Tools</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSuspend}>
          <ListItemIcon>
            <i className='tabler-player-pause' style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Suspend</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleMenuClose()
            setDeleteDialogOpen(true)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <i className='tabler-trash' style={{ fontSize: 18, color: 'inherit' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Website</DialogTitle>
        <DialogContent>
          <Alert severity='error' sx={{ mb: 2 }}>
            This action is irreversible. All data, files, databases, and emails associated with this
            website will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{selectedSite?.domain}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' color='error' onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Website'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default HostingPage
