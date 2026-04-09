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
}

interface FtpAccount {
  username: string
  path: string
  createdAt: string
}

const FtpPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [ftpAccounts, setFtpAccounts] = useState<FtpAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [path, setPath] = useState('/')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

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

  const fetchFtpAccounts = async (siteId: string) => {
    try {
      const res = await api.get(`/hosting/websites/${siteId}/ftp`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setFtpAccounts(raw?.ftpAccounts || [])
    } catch {
      setFtpAccounts([])
    }
  }

  useEffect(() => {
    if (selectedSite) {
      fetchFtpAccounts(selectedSite)
    }
  }, [selectedSite])

  const handleCreate = async () => {
    if (!selectedSite) return
    setCreating(true)
    setError('')
    try {
      await api.post(`/hosting/websites/${selectedSite}/ftp`, { username, password, path })
      setCreateOpen(false)
      setUsername('')
      setPassword('')
      setPath('/')
      fetchFtpAccounts(selectedSite)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create FTP account')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='FTP Accounts'
            subheader='Create and manage FTP accounts for file access'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setCreateOpen(true)}
                disabled={!selectedSite}
              >
                Create FTP Account
              </Button>
            }
          />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select
                value={selectedSite}
                label='Select Website'
                onChange={(e) => setSelectedSite(e.target.value)}
                size='small'
              >
                {websites.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading ? (
              <Skeleton height={200} />
            ) : ftpAccounts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-file-upload' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No FTP accounts found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {selectedSite ? 'Create an FTP account to access your files.' : 'Select a website first.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ftpAccounts.map((account, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{account.username}</TableCell>
                        <TableCell>{account.path}</TableCell>
                        <TableCell>{new Date(account.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />}>
                            Delete
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create FTP Account</DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
            <CustomTextField fullWidth label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            <CustomTextField fullWidth label='Path' value={path} onChange={(e) => setPath(e.target.value)} helperText='Directory path (e.g. /public_html)' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleCreate} disabled={creating || !username || !password}
            startIcon={creating ? <CircularProgress size={16} color='inherit' /> : undefined}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default FtpPage
