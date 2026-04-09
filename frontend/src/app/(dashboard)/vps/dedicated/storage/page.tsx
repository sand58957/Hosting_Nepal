'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  planName: string
  disk: number
  type: string
  features?: { diskType?: string }
}

const storageAddons = [
  { id: 'hdd-500', name: '+500 GB HDD', size: '500 GB', type: 'HDD', price: 1995 },
  { id: 'hdd-1tb', name: '+1 TB HDD', size: '1 TB', type: 'HDD', price: 3990 },
  { id: 'ssd-500', name: '+500 GB SSD', size: '500 GB', type: 'SSD', price: 6983 },
  { id: 'nvme-1tb', name: '+1 TB NVMe', size: '1 TB', type: 'NVMe', price: 9975 },
  { id: 'nvme-2tb', name: '+2 TB NVMe', size: '2 TB', type: 'NVMe', price: 16958 },
]

const DedicatedStoragePage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
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

  const driveBays = currentServer ? [
    { bay: 1, status: 'Active', size: `${currentServer.disk >= 1000 ? `${currentServer.disk / 1000} TB` : `${currentServer.disk} GB`}`, type: currentServer.features?.diskType || 'HDD' },
    { bay: 2, status: 'Empty', size: '-', type: '-' },
    { bay: 3, status: 'Empty', size: '-', type: '-' },
    { bay: 4, status: 'Empty', size: '-', type: '-' },
  ] : []

  const handleAddStorage = async (addonId: string) => {
    if (!selectedServer) return
    setAdding(addonId)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/addons`, { addonId, type: 'storage' })
      setSuccess('Storage addon has been added. It will be available after the next maintenance window.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add storage. Please try again.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-database' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Storage Management</Typography>
            <Typography variant='body2' color='text.secondary'>
              View drive bays and add additional storage to your dedicated server
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

      {/* RAID Info */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>RAID Configuration</Typography>
              <Alert severity='info' sx={{ mb: 2 }}>
                RAID configuration changes require a support ticket. Contact support for RAID setup assistance.
              </Alert>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>RAID Level</Typography>
                <Typography variant='body2' fontWeight={600}>No RAID (JBOD)</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Controller</Typography>
                <Typography variant='body2'>Hardware RAID Controller</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Current Storage - Drive Bays */}
      {selectedServer && currentServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Drive Bay Status</Typography>

              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><Typography variant='subtitle2' fontWeight={600}>Bay</Typography></TableCell>
                      <TableCell><Typography variant='subtitle2' fontWeight={600}>Status</Typography></TableCell>
                      <TableCell><Typography variant='subtitle2' fontWeight={600}>Size</Typography></TableCell>
                      <TableCell><Typography variant='subtitle2' fontWeight={600}>Type</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {driveBays.map((bay) => (
                      <TableRow key={bay.bay}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className='tabler-database' style={{ fontSize: 16 }} />
                            Bay {bay.bay}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bay.status}
                            color={bay.status === 'Active' ? 'success' : 'default'}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{bay.size}</TableCell>
                        <TableCell>{bay.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Available Storage Addons */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Typography variant='h6' sx={{ mb: 3 }}>Available Storage Add-ons</Typography>
          <Grid container spacing={3}>
            {storageAddons.map((addon) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={addon.id}>
                <Card variant='outlined'>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Avatar sx={{ bgcolor: addon.type === 'NVMe' ? 'primary.main' : addon.type === 'SSD' ? 'info.main' : 'action.hover', width: 40, height: 40 }}>
                        <i className='tabler-database' style={{ fontSize: 20, color: addon.type !== 'HDD' ? '#fff' : undefined }} />
                      </Avatar>
                      <Box>
                        <Typography variant='subtitle1' fontWeight={600}>{addon.name}</Typography>
                        <Chip label={addon.type} size='small' variant='outlined' color={addon.type === 'NVMe' ? 'primary' : addon.type === 'SSD' ? 'info' : 'default'} />
                      </Box>
                    </Box>
                    <Typography variant='h5' color='primary.main' sx={{ mb: 2 }}>
                      NPR {addon.price.toLocaleString()}
                      <Typography variant='caption' color='text.secondary'>/mo</Typography>
                    </Typography>
                    <Button
                      variant='outlined'
                      fullWidth
                      onClick={() => handleAddStorage(addon.id)}
                      disabled={adding === addon.id}
                      startIcon={adding === addon.id ? <CircularProgress size={16} /> : <i className='tabler-plus' />}
                    >
                      {adding === addon.id ? 'Adding...' : 'Add Storage'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedStoragePage
