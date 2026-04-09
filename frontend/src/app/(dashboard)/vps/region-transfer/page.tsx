'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  region: string
}

interface Region {
  id: string
  name: string
  flag: string
  latency: string
}

const regions: Region[] = [
  { id: 'in-mum', name: 'India - Mumbai', flag: 'IN', latency: '~15ms' },
  { id: 'in-blr', name: 'India - Bangalore', flag: 'IN', latency: '~20ms' },
  { id: 'sg', name: 'Singapore', flag: 'SG', latency: '~45ms' },
  { id: 'us-nyc', name: 'US - New York', flag: 'US', latency: '~180ms' },
  { id: 'eu-de', name: 'EU - Germany', flag: 'DE', latency: '~150ms' },
]

const VPSRegionTransferPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)

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

  const currentServer = servers.find((s) => s.id === selectedServer)
  const currentRegion = currentServer?.region || 'Unknown'

  const handleTransfer = async () => {
    if (!selectedServer || !selectedRegion) return
    setTransferring(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/region-transfer`, { regionId: selectedRegion.id })
      setSelectedRegion(null)
    } catch {
      // silently handle
    } finally {
      setTransferring(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Region Transfer</Typography>
          <Typography variant='body2' color='text.secondary'>
            Move your VPS to a different data center region
          </Typography>
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
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedRegion(null) }}
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

      {selectedServer && currentServer && (
        <>
          {/* Current Region */}
          <Grid size={{ xs: 12 }}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                    <i className='tabler-map-pin' style={{ fontSize: 20, color: '#fff' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Current Region</Typography>
                    <Typography variant='h6'>{currentRegion}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Available Regions */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Select New Region</Typography>
            <Grid container spacing={3}>
              {regions.map((region) => {
                const isCurrent = currentRegion.toLowerCase().includes(region.name.toLowerCase().split(' - ')[0].toLowerCase())
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={region.id}>
                    <Card
                      variant='outlined'
                      sx={{
                        cursor: isCurrent ? 'default' : 'pointer',
                        opacity: isCurrent ? 0.5 : 1,
                        border: selectedRegion?.id === region.id ? 2 : 1,
                        borderColor: selectedRegion?.id === region.id ? 'primary.main' : 'divider',
                        '&:hover': isCurrent ? {} : { borderColor: 'primary.main' },
                      }}
                      onClick={() => !isCurrent && setSelectedRegion(region)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.hover', fontSize: 14, fontWeight: 600 }}>
                              {region.flag}
                            </Avatar>
                            <Typography variant='subtitle1' fontWeight={500}>{region.name}</Typography>
                          </Box>
                          {isCurrent && <Chip label='Current' size='small' color='primary' />}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant='body2' color='text.secondary'>
                            <i className='tabler-clock' style={{ fontSize: 14, marginRight: 4 }} />
                            Latency: {region.latency}
                          </Typography>
                          {!isCurrent && (
                            <Button
                              size='small'
                              variant={selectedRegion?.id === region.id ? 'contained' : 'text'}
                              onClick={(e) => { e.stopPropagation(); setSelectedRegion(region) }}
                            >
                              {selectedRegion?.id === region.id ? 'Selected' : 'Select'}
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Grid>

          {selectedRegion && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Alert severity='warning' sx={{ mb: 3 }}>
                    Transfer requires 15-30 minutes of downtime. Your IP address will change after the transfer.
                  </Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant='body1'>
                        Transfer to <strong>{selectedRegion.name}</strong>
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        From: {currentRegion} | Estimated latency: {selectedRegion.latency}
                      </Typography>
                    </Box>
                    <Button
                      variant='contained'
                      size='large'
                      onClick={handleTransfer}
                      disabled={transferring}
                      startIcon={transferring ? <CircularProgress size={20} /> : <i className='tabler-transfer' />}
                    >
                      {transferring ? 'Transferring...' : 'Transfer to Region'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

export default VPSRegionTransferPage
