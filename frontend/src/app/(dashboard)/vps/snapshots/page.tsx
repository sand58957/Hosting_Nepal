'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
}

interface Snapshot {
  id: string
  name: string
  description: string
  createdAt: string
  size: string
  status: string
}

const VPSSnapshotsPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDesc, setSnapshotDesc] = useState('')
  const [creating, setCreating] = useState(false)

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

  const fetchSnapshots = async (serverId: string) => {
    setSnapshotsLoading(true)
    try {
      const res = await api.get(`/hosting/vps/${serverId}/snapshots`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const list = Array.isArray(raw) ? raw : raw?.snapshots ?? raw?.data ?? []
      setSnapshots(Array.isArray(list) ? list : [])
    } catch {
      setSnapshots([])
    } finally {
      setSnapshotsLoading(false)
    }
  }

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    if (serverId) fetchSnapshots(serverId)
    else setSnapshots([])
  }

  const handleCreate = async () => {
    if (!snapshotName.trim() || !selectedServer) return
    setCreating(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/snapshots`, {
        name: snapshotName,
        description: snapshotDesc,
      })
      setDialogOpen(false)
      setSnapshotName('')
      setSnapshotDesc('')
      await fetchSnapshots(selectedServer)
    } catch {
      // silently handle
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (snapshotId: string) => {
    setActionLoading(`restore-${snapshotId}`)
    try {
      await api.post(`/hosting/vps/${selectedServer}/snapshots/${snapshotId}/restore`)
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (snapshotId: string) => {
    setActionLoading(`delete-${snapshotId}`)
    try {
      await api.delete(`/hosting/vps/${selectedServer}/snapshots/${snapshotId}`)
      await fetchSnapshots(selectedServer)
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const usedSlots = snapshots.length
  const maxSlots = 5

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant='h4'>Snapshots</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage server snapshots
            </Typography>
          </Box>
          {selectedServer && (
            <Button
              variant='contained'
              startIcon={<i className='tabler-camera-plus' />}
              onClick={() => setDialogOpen(true)}
              disabled={usedSlots >= maxSlots}
            >
              Create Snapshot
            </Button>
          )}
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

      {selectedServer && (
        <>
          {/* Storage Usage */}
          <Grid size={{ xs: 12 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='subtitle2'>Snapshot Slots</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Using {usedSlots} of {maxSlots} snapshot slots
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={(usedSlots / maxSlots) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={usedSlots >= maxSlots ? 'error' : 'primary'}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Alert severity='info'>
              Snapshots capture the full server state including all files, configurations, and installed software.
            </Alert>
          </Grid>

          {/* Snapshots Table */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                {snapshotsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : snapshots.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <i className='tabler-camera-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No snapshots yet. Create one to save the current server state.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {snapshots.map((snap) => (
                          <TableRow key={snap.id}>
                            <TableCell>
                              <Typography variant='body2' fontWeight={500}>{snap.name}</Typography>
                              {snap.description && (
                                <Typography variant='caption' color='text.secondary'>{snap.description}</Typography>
                              )}
                            </TableCell>
                            <TableCell>{snap.createdAt ? new Date(snap.createdAt).toLocaleString() : '-'}</TableCell>
                            <TableCell>{snap.size || '-'}</TableCell>
                            <TableCell>
                              <Chip label={snap.status || 'Ready'} size='small' color='success' />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size='small'
                                  variant='outlined'
                                  onClick={() => handleRestore(snap.id)}
                                  disabled={actionLoading === `restore-${snap.id}`}
                                >
                                  {actionLoading === `restore-${snap.id}` ? <CircularProgress size={16} /> : 'Restore'}
                                </Button>
                                <Button
                                  size='small'
                                  variant='outlined'
                                  color='error'
                                  onClick={() => handleDelete(snap.id)}
                                  disabled={actionLoading === `delete-${snap.id}`}
                                >
                                  {actionLoading === `delete-${snap.id}` ? <CircularProgress size={16} /> : 'Delete'}
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
        </>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create Snapshot</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='Snapshot Name'
              placeholder='e.g., Before Update'
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              fullWidth
              required
            />
            <CustomTextField
              label='Description (optional)'
              placeholder='Brief description of this snapshot'
              value={snapshotDesc}
              onChange={(e) => setSnapshotDesc(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Alert severity='info'>
              The server may briefly pause during snapshot creation.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={!snapshotName.trim() || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Snapshot'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default VPSSnapshotsPage
