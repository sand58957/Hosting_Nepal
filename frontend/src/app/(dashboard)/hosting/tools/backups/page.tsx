'use client'

import { useState, useEffect } from 'react'

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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

import api from '@/lib/api'

interface Website { id: string; domain: string }
interface Backup {
  id: string
  storagePath: string
  sizeMb: number
  status: string
  type: string
  createdAt: string
}

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'warning',
  FAILED: 'error',
}

const BackupsPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState('')
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting/websites')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setWebsites(Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchBackups = async (siteId: string) => {
    try {
      const res = await api.get(`/hosting/websites/${siteId}/backups`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setBackups(Array.isArray(raw) ? raw : [])
    } catch {
      setBackups([])
    }
  }

  useEffect(() => {
    if (selectedSite) fetchBackups(selectedSite)
  }, [selectedSite])

  const handleCreate = async () => {
    if (!selectedSite) return
    setCreating(true)
    try {
      await api.post(`/hosting/websites/${selectedSite}/backup`)
      fetchBackups(selectedSite)
    } catch {
      // handle error
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedSite || !restoreFile) return
    setRestoring(true)
    try {
      await api.post(`/hosting/websites/${selectedSite}/restore`, { backupFile: restoreFile })
      setRestoreOpen(false)
    } catch {
      // handle error
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Backups'
            subheader='Create, manage, and restore backups of your websites'
            action={
              <Button variant='contained' startIcon={creating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plus' />} onClick={handleCreate} disabled={!selectedSite || creating}>
                {creating ? 'Creating...' : 'Create Backup'}
              </Button>
            }
          />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select value={selectedSite} label='Select Website' onChange={(e) => setSelectedSite(e.target.value)} size='small'>
                {websites.map((w) => (<MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>))}
              </Select>
            </FormControl>

            {loading ? (
              <Skeleton height={200} />
            ) : backups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-archive' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No backups found</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {selectedSite ? 'Create your first backup to protect your data.' : 'Select a website first.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Backup File</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id} hover>
                        <TableCell><Typography variant='body2' fontWeight={500}>{backup.storagePath}</Typography></TableCell>
                        <TableCell>{backup.type}</TableCell>
                        <TableCell>{backup.sizeMb ? `${backup.sizeMb} MB` : '-'}</TableCell>
                        <TableCell><Chip label={backup.status} size='small' color={statusColor[backup.status] || 'default'} /></TableCell>
                        <TableCell>{new Date(backup.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' variant='outlined' color='warning' startIcon={<i className='tabler-restore' />}
                            onClick={() => { setRestoreFile(backup.storagePath); setRestoreOpen(true) }}
                            disabled={backup.status !== 'COMPLETED'}>
                            Restore
                          </Button>
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

      <Dialog open={restoreOpen} onClose={() => setRestoreOpen(false)}>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 2 }}>Restoring a backup will overwrite current site data. This cannot be undone.</Alert>
          <Typography>Restore from: <strong>{restoreFile}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreOpen(false)}>Cancel</Button>
          <Button variant='contained' color='warning' onClick={handleRestore} disabled={restoring}
            startIcon={restoring ? <CircularProgress size={16} color='inherit' /> : undefined}>
            {restoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default BackupsPage
