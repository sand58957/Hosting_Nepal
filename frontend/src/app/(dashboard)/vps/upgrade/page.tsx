'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  cpu: number
  ram: number
  disk: number
  price: number
}

interface UpgradePlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  price: number
}

const allPlans: UpgradePlan[] = [
  { id: 'vps-1', name: 'VPS-1', cpu: 1, ram: 1, disk: 25, price: 999 },
  { id: 'vps-2', name: 'VPS-2', cpu: 2, ram: 2, disk: 50, price: 1799 },
  { id: 'vps-4', name: 'VPS-4', cpu: 4, ram: 4, disk: 100, price: 3499 },
  { id: 'vps-8', name: 'VPS-8', cpu: 8, ram: 8, disk: 200, price: 6499 },
]

const VPSUpgradePage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

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
  const currentPlanIndex = allPlans.findIndex((p) => p.price <= (currentServer?.price || 0))
  const availablePlans = allPlans.filter((p) => p.price > (currentServer?.price || 0))

  const handleUpgrade = async () => {
    if (!selectedServer || !selectedPlan) return
    setUpgrading(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/upgrade`, { planId: selectedPlan.id })
      setSelectedPlan(null)
    } catch {
      // silently handle
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Upgrade VPS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Scale up your server resources
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
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedPlan(null) }}
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

      {currentServer && (
        <>
          {/* Current Plan */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='overline' color='text.secondary'>Current Plan</Typography>
                <Typography variant='h5' sx={{ mb: 2 }}>{currentServer.planName || 'Current'}</Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant='body2' sx={{ mb: 0.5 }}>
                    <i className='tabler-cpu' style={{ fontSize: 14, marginRight: 6 }} />
                    {currentServer.cpu || '?'} vCPU
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 0.5 }}>
                    <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 6 }} />
                    {currentServer.ram || '?'} GB RAM
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 0.5 }}>
                    <i className='tabler-database' style={{ fontSize: 14, marginRight: 6 }} />
                    {currentServer.disk || '?'} GB SSD
                  </Typography>
                </Box>
                <Typography variant='h6' color='primary.main' sx={{ mt: 2 }}>
                  NPR {(currentServer.price || 0).toLocaleString()}/mo
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Arrow */}
          <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='tabler-arrow-right' style={{ fontSize: 32, color: '#aaa' }} />
          </Grid>

          {/* Available Upgrades */}
          <Grid size={{ xs: 12, md: 7 }}>
            {availablePlans.length === 0 ? (
              <Card variant='outlined'>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body1' color='text.secondary'>
                    You are already on the highest plan.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {availablePlans.map((plan) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={plan.id}>
                    <Card
                      variant='outlined'
                      sx={{
                        cursor: 'pointer',
                        border: selectedPlan?.id === plan.id ? 2 : 1,
                        borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'divider',
                        '&:hover': { borderColor: 'primary.main' },
                      }}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant='h6' sx={{ mb: 1 }}>{plan.name}</Typography>
                        <Typography variant='body2'>{plan.cpu} vCPU | {plan.ram} GB RAM | {plan.disk} GB SSD</Typography>
                        <Typography variant='h6' color='primary.main' sx={{ mt: 1 }}>
                          NPR {plan.price.toLocaleString()}/mo
                        </Typography>
                        {currentServer.price && (
                          <Chip
                            label={`+NPR ${(plan.price - (currentServer.price || 0)).toLocaleString()}/mo`}
                            size='small'
                            color='info'
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          {selectedPlan && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Alert severity='warning' sx={{ mb: 3 }}>
                    Upgrade requires a brief restart of your server. Plan your upgrade during low-traffic periods.
                  </Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant='body1'>
                        Upgrading to <strong>{selectedPlan.name}</strong>
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Price difference: NPR {(selectedPlan.price - (currentServer.price || 0)).toLocaleString()}/mo
                      </Typography>
                    </Box>
                    <Button
                      variant='contained'
                      size='large'
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      startIcon={upgrading ? <CircularProgress size={20} /> : <i className='tabler-arrow-up' />}
                    >
                      {upgrading ? 'Upgrading...' : 'Upgrade Now'}
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

export default VPSUpgradePage
