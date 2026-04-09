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

const MysqlPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [databases, setDatabases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [dbName, setDbName] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [dbPass, setDbPass] = useState('')
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

  const fetchDatabases = async (siteId: string) => {
    try {
      const res = await api.get(`/hosting/websites/${siteId}/databases`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setDatabases(raw?.databases || [])
    } catch {
      setDatabases([])
    }
  }

  useEffect(() => {
    if (selectedSite) fetchDatabases(selectedSite)
  }, [selectedSite])

  const handleCreate = async () => {
    if (!selectedSite) return
    setCreating(true)
    setError('')
    try {
      await api.post(`/hosting/websites/${selectedSite}/database`, { dbName, dbUser, dbPass })
      setCreateOpen(false)
      setDbName('')
      setDbUser('')
      setDbPass('')
      fetchDatabases(selectedSite)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create database')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='MySQL Manager'
            subheader='Create and manage MySQL databases for your websites'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setCreateOpen(true)} disabled={!selectedSite}>
                Create Database
              </Button>
            }
          />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select value={selectedSite} label='Select Website' onChange={(e) => setSelectedSite(e.target.value)} size='small'>
                {websites.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading ? (
              <Skeleton height={200} />
            ) : databases.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-database' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No databases found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {selectedSite ? 'Create a database to store your website data.' : 'Select a website first.'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Database Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {databases.map((db: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>{db.name || db.dbName}</TableCell>
                        <TableCell>{db.user || db.dbUser}</TableCell>
                        <TableCell>{db.size || '-'}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' variant='outlined' startIcon={<i className='tabler-external-link' />}>
                            phpMyAdmin
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
        <DialogTitle>Create MySQL Database</DialogTitle>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Database Name' value={dbName} onChange={(e) => setDbName(e.target.value)} />
            <CustomTextField fullWidth label='Database Username' value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            <CustomTextField fullWidth label='Database Password' type='password' value={dbPass} onChange={(e) => setDbPass(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleCreate} disabled={creating || !dbName || !dbUser || !dbPass}
            startIcon={creating ? <CircularProgress size={16} color='inherit' /> : undefined}>
            {creating ? 'Creating...' : 'Create Database'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default MysqlPage
