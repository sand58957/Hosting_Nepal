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
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'

import api from '@/lib/api'

interface Website {
  id: string
  domain: string
  hasWordPress: boolean
  wordPressSites: Array<{
    id: string
    stagingUrl: string | null
    stagingActive: boolean
    status: string
    createdAt: string
  }>
}

const StagingPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState('')
  const [creating, setCreating] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushingSite, setPushingSite] = useState('')
  const [pushing, setPushing] = useState(false)

  const fetchData = async () => {
    try {
      const res = await api.get('/hosting/websites')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setWebsites(Array.isArray(raw) ? raw.filter((w: Website) => w.hasWordPress) : [])
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async () => {
    if (!selectedSite) return
    setCreating(true)
    try {
      await api.post(`/hosting/websites/${selectedSite}/wordpress/staging`)
      fetchData()
    } catch {
      // handle error
    } finally {
      setCreating(false)
    }
  }

  const handlePush = async () => {
    setPushing(true)
    try {
      await api.post(`/hosting/websites/${pushingSite}/wordpress/staging/push`)
      setPushOpen(false)
      fetchData()
    } catch {
      // handle error
    } finally {
      setPushing(false)
    }
  }

  const stagingCopies = websites.flatMap((w) =>
    (w.wordPressSites || [])
      .filter((wp) => wp.stagingActive || wp.status === 'STAGING')
      .map((wp) => ({ ...wp, domain: w.domain, siteId: w.id }))
  )

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Staging Copies'
            subheader='Create and manage staging environments for your WordPress sites'
          />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-end' }}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Website</InputLabel>
                <Select
                  value={selectedSite}
                  label='Select Website'
                  onChange={(e) => setSelectedSite(e.target.value)}
                  size='small'
                >
                  {websites.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant='contained'
                onClick={handleCreate}
                disabled={!selectedSite || creating}
                startIcon={creating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-copy' />}
              >
                {creating ? 'Creating...' : 'Create Staging Copy'}
              </Button>
            </Box>

            <Alert severity='warning' sx={{ mb: 3 }}>
              Pushing staging will overwrite the live site. Make sure to backup your live site before pushing.
            </Alert>

            {loading ? (
              <Box>
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} height={64} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : stagingCopies.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-copy' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No staging copies found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Select a website above and create a staging copy to test changes safely.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staging Site</TableCell>
                      <TableCell>Live Domain</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stagingCopies.map((sc) => (
                      <TableRow key={sc.id} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>
                            {sc.stagingUrl || `staging.${sc.domain}`}
                          </Typography>
                        </TableCell>
                        <TableCell>{sc.domain}</TableCell>
                        <TableCell>{new Date(sc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip label='STAGING' size='small' color='info' />
                        </TableCell>
                        <TableCell align='right'>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size='small'
                              variant='contained'
                              color='warning'
                              startIcon={<i className='tabler-arrow-up' />}
                              onClick={() => {
                                setPushingSite(sc.siteId)
                                setPushOpen(true)
                              }}
                            >
                              Push to Live
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

      <Dialog open={pushOpen} onClose={() => setPushOpen(false)}>
        <DialogTitle>Push Staging to Live</DialogTitle>
        <DialogContent>
          <Alert severity='error' sx={{ mb: 2 }}>
            This will overwrite your live site with the staging version. This action cannot be undone.
          </Alert>
          <Typography>Are you sure you want to push staging changes to your live site?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handlePush}
            disabled={pushing}
            startIcon={pushing ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            {pushing ? 'Pushing...' : 'Push to Live'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default StagingPage
