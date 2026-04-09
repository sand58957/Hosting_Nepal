'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'

import api from '@/lib/api'

interface Website { id: string; domain: string }

const StatisticsPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Site Statistics' subheader='View traffic statistics and resource usage' />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select value={selectedSite} label='Select Website' onChange={(e) => setSelectedSite(e.target.value)} size='small'>
                {websites.map((w) => (<MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <i className='tabler-users' style={{ fontSize: 32, color: '#7c3aed' }} />
            <Typography variant='h4' sx={{ mt: 1 }}>0</Typography>
            <Typography variant='body2' color='text.secondary'>Unique Visitors</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <i className='tabler-eye' style={{ fontSize: 32, color: '#2196f3' }} />
            <Typography variant='h4' sx={{ mt: 1 }}>0</Typography>
            <Typography variant='body2' color='text.secondary'>Pageviews</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <i className='tabler-arrows-transfer-up' style={{ fontSize: 32, color: '#4caf50' }} />
            <Typography variant='h4' sx={{ mt: 1 }}>0 MB</Typography>
            <Typography variant='body2' color='text.secondary'>Bandwidth Used</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <i className='tabler-alert-triangle' style={{ fontSize: 32, color: '#f44336' }} />
            <Typography variant='h4' sx={{ mt: 1 }}>0%</Typography>
            <Typography variant='body2' color='text.secondary'>Error Rate</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Charts Placeholders */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Top Pages' />
          <CardContent>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <i className='tabler-chart-bar' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {selectedSite ? 'No traffic data available yet.' : 'Select a website to view statistics.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Top Referrers' />
          <CardContent>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <i className='tabler-link' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {selectedSite ? 'No referrer data available yet.' : 'Select a website to view statistics.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Top Countries' />
          <CardContent>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <i className='tabler-world' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {selectedSite ? 'No geographic data available yet.' : 'Select a website to view statistics.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Error Rate' />
          <CardContent>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <i className='tabler-chart-line' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {selectedSite ? 'No error data available yet.' : 'Select a website to view statistics.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default StatisticsPage
