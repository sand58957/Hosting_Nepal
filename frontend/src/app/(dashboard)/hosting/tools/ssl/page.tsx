'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import api from '@/lib/api'

interface Website { id: string; domain: string }

const SslPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [sslStatus, setSslStatus] = useState<'none' | 'active' | 'pending'>('none')

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

  const handleInstall = async () => {
    if (!selectedSite) return
    setInstalling(true)
    try {
      await api.post(`/hosting/websites/${selectedSite}/ssl`)
      setSslStatus('pending')
    } catch {
      // handle error
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='SSL Manager' subheader="Manage SSL certificates for your websites" />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select value={selectedSite} label='Select Website' onChange={(e) => { setSelectedSite(e.target.value); setSslStatus('none') }} size='small'>
                {websites.map((w) => (<MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>))}
              </Select>
            </FormControl>

            {selectedSite && (
              <Box>
                <Card variant='outlined' sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className='tabler-lock' style={{ fontSize: 32, color: sslStatus === 'active' ? '#4caf50' : '#ff9800' }} />
                        <Box>
                          <Typography variant='subtitle1'>Let's Encrypt SSL</Typography>
                          <Typography variant='body2' color='text.secondary'>Free SSL certificate with automatic renewal</Typography>
                        </Box>
                      </Box>
                      <Chip label={sslStatus === 'active' ? 'Active' : sslStatus === 'pending' ? 'Pending' : 'Not Installed'} color={sslStatus === 'active' ? 'success' : sslStatus === 'pending' ? 'warning' : 'default'} />
                    </Box>
                  </CardContent>
                </Card>

                {sslStatus === 'pending' && (
                  <Alert severity='info' sx={{ mb: 3 }}>SSL certificate installation is in progress. It may take a few minutes.</Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant='contained' onClick={handleInstall} disabled={installing || sslStatus === 'active'}
                    startIcon={installing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-lock' />}>
                    {installing ? 'Installing...' : sslStatus === 'active' ? 'SSL Active' : 'Install SSL'}
                  </Button>
                  {sslStatus === 'active' && (
                    <Button variant='outlined' startIcon={<i className='tabler-refresh' />}>Renew SSL</Button>
                  )}
                </Box>
              </Box>
            )}

            {!selectedSite && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-lock' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>Select a website to manage SSL</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SslPage
