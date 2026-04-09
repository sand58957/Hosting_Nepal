'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Avatar from '@mui/material/Avatar'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  disk: number
  diskUsed: number
}

interface StorageAddon {
  id: string
  size: number
  price: number
}

const storageAddons: StorageAddon[] = [
  { id: 'storage-25', size: 25, price: 499 },
  { id: 'storage-50', size: 50, price: 899 },
  { id: 'storage-100', size: 100, price: 1599 },
]

const VPSStoragePage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedAddon, setSelectedAddon] = useState<StorageAddon | null>(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(false)

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
  const diskUsed = currentServer?.diskUsed || 0
  const diskTotal = currentServer?.disk || 0
  const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0

  const handleExtend = async () => {
    if (!selectedServer || !selectedAddon) return
    setExtending(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/storage/extend`, {
        addonId: selectedAddon.id,
        size: selectedAddon.size,
      })
      setSelectedAddon(null)
    } catch {
      // silently handle
    } finally {
      setExtending(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Storage / Extend SSD</Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage and extend your server storage
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
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedAddon(null) }}
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
          {/* Current Storage */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 2 }}>Current Storage</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>
                    {diskUsed} GB of {diskTotal} GB used
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {diskPercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={diskPercent}
                  sx={{ height: 12, borderRadius: 6 }}
                  color={diskPercent > 90 ? 'error' : diskPercent > 70 ? 'warning' : 'primary'}
                />
                <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                  {diskTotal - diskUsed} GB free
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Storage Upgrades */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Available Upgrades</Typography>
            <Grid container spacing={3}>
              {storageAddons.map((addon) => (
                <Grid size={{ xs: 12, sm: 4 }} key={addon.id}>
                  <Card
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      border: selectedAddon?.id === addon.id ? 2 : 1,
                      borderColor: selectedAddon?.id === addon.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedAddon(addon)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Avatar sx={{ bgcolor: selectedAddon?.id === addon.id ? 'primary.main' : 'action.hover', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                        <i className='tabler-database' style={{ fontSize: 28, color: selectedAddon?.id === addon.id ? '#fff' : undefined }} />
                      </Avatar>
                      <Typography variant='h5' sx={{ mb: 1 }}>+{addon.size} GB</Typography>
                      <Typography variant='h6' color='primary.main'>
                        NPR {addon.price.toLocaleString()}/mo
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Total: {diskTotal + addon.size} GB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {selectedAddon && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Extension takes effect immediately. No server restart needed.
                  </Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant='body1'>
                        Adding <strong>+{selectedAddon.size} GB</strong> to your server
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        New total: {diskTotal + selectedAddon.size} GB SSD
                      </Typography>
                    </Box>
                    <Button
                      variant='contained'
                      size='large'
                      onClick={handleExtend}
                      disabled={extending}
                      startIcon={extending ? <CircularProgress size={20} /> : <i className='tabler-database' />}
                    >
                      {extending ? 'Extending...' : `Extend Storage - NPR ${selectedAddon.price.toLocaleString()}/mo`}
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

export default VPSStoragePage
