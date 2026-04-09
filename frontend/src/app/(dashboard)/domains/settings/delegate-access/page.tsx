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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Delegate {
  id: string
  email: string
  permissions: string[]
  addedAt: string
}

const permissionOptions = [
  { key: 'VIEW', label: 'View Domains' },
  { key: 'DNS', label: 'Manage DNS' },
  { key: 'RENEW', label: 'Renew Domains' },
  { key: 'TRANSFER', label: 'Transfer Domains' },
]

const DelegateAccessPage = () => {
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<string[]>(['VIEW'])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/settings/delegates')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setDelegates(Array.isArray(raw?.delegates) ? raw.delegates : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleTogglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleAddDelegate = async () => {
    if (!email.trim() || permissions.length === 0) return

    setSubmitting(true)

    try {
      await api.post('/domains/settings/delegates', {
        email: email.trim(),
        permissions,
      })

      setDialogOpen(false)
      setEmail('')
      setPermissions(['VIEW'])

      // Refresh
      const res = await api.get('/domains/settings/delegates')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setDelegates(Array.isArray(raw?.delegates) ? raw.delegates : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveDelegate = async (delegateId: string) => {
    try {
      await api.delete(`/domains/settings/delegates/${delegateId}`)
      setDelegates((prev) => prev.filter((d) => d.id !== delegateId))
    } catch {
      // silently handle
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Delegate Access</Typography>
            <Typography variant='body2' color='text.secondary'>
              Grant others access to manage your domains
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-user-plus' />}
            onClick={() => setDialogOpen(true)}
          >
            Add Delegate
          </Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Delegates' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : delegates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-users' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No delegates added yet
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell>Added Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {delegates.map((delegate) => (
                      <TableRow key={delegate.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{delegate.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {delegate.permissions.map((p) => (
                              <Chip key={p} label={p} size='small' variant='outlined' />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>{new Date(delegate.addedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title='Remove'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleRemoveDelegate(delegate.id)}
                            >
                              <i className='tabler-trash' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
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

      {/* Add Delegate Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Delegate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='Email Address'
              placeholder='delegate@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <Box>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>Permissions</Typography>
              {permissionOptions.map((perm) => (
                <FormControlLabel
                  key={perm.key}
                  control={
                    <Checkbox
                      checked={permissions.includes(perm.key)}
                      onChange={() => handleTogglePermission(perm.key)}
                      size='small'
                    />
                  }
                  label={perm.label}
                  sx={{ display: 'block' }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAddDelegate} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Add Delegate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DelegateAccessPage
