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

interface VDSServer {
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

const VDSUpgradePage = () => {
  const [servers, setServers] = useState<VDSServer[]>([])
  const [plans, setPlans] = useState<UpgradePlan[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serversRes, plansRes] = await Promise.all([
          api.get('/hosting'),
          api.get('/hosting/plans'),
        ])

        const rawServers = serversRes.data?.data?.data ?? serversRes.data?.data ?? serversRes.data
        const listServers = Array.isArray(rawServers) ? rawServers : rawServers?.hostings ?? rawServers?.data ?? []
        const vdsList = (Array.isArray(listServers) ? listServers : []).filter(
          (h: any) => h.type === 'VDS' || h.type === 'vds' || h.planName?.includes('VDS') || h.planType === 'VDS'
        )
        setServers(vdsList)

        const rawPlans = plansRes.data?.data ?? plansRes.data
        const allPlans = Array.isArray(rawPlans) ? rawPlans : rawPlans?.data ?? []
        const vdsPlans = allPlans
          .filter((p: any) => p.type === 'VDS')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            cpu: p.specs?.cpuCores || 0,
            ram: p.specs?.ramGB || 0,
            disk: p.specs?.diskGB || 0,
            price: p.priceMonthly || 0,
          }))
        setPlans(vdsPlans.length > 0 ? vdsPlans : [
          { id: 'vds-8', name: 'VDS-8', cpu: 4, ram: 8, disk: 100, price: 5146 },
          { id: 'vds-12', name: 'VDS-12', cpu: 6, ram: 12, disk: 150, price: 7779 },
          { id: 'vds-16', name: 'VDS-16', cpu: 8, ram: 16, disk: 200, price: 10412 },
          { id: 'vds-24', name: 'VDS-24', cpu: 12, ram: 24, disk: 300, price: 15678 },
        ])
      } catch {
        setServers([])
        setPlans([
          { id: 'vds-8', name: 'VDS-8', cpu: 4, ram: 8, disk: 100, price: 5146 },
          { id: 'vds-12', name: 'VDS-12', cpu: 6, ram: 12, disk: 150, price: 7779 },
          { id: 'vds-16', name: 'VDS-16', cpu: 8, ram: 16, disk: 200, price: 10412 },
          { id: 'vds-24', name: 'VDS-24', cpu: 12, ram: 24, disk: 300, price: 15678 },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const currentServer = servers.find((s) => s.id === selectedServer)
  const availablePlans = plans.filter((p) => p.price > (currentServer?.price || 0))

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
          <Typography variant='h4'>Upgrade VDS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Scale up your dedicated server resources — dedicated vCPU, DDR5 ECC RAM, NVMe SSD
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
                label='Select VDS Server'
                value={selectedServer}
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedPlan(null) }}
                fullWidth
              >
                {servers.length === 0 ? (
                  <MenuItem disabled>No VDS servers found</MenuItem>
                ) : (
                  servers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.hostname || s.ipAddress} ({s.planName})
                    </MenuItem>
                  ))
                )}
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
                    {currentServer.cpu || '?'} Dedicated vCPU
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 0.5 }}>
                    <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 6 }} />
                    {currentServer.ram || '?'} GB DDR5 ECC RAM
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 0.5 }}>
                    <i className='tabler-database' style={{ fontSize: 14, marginRight: 6 }} />
                    {currentServer.disk || '?'} GB NVMe SSD
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
                    You are already on the highest VDS plan.
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
                        <Typography variant='body2'>{plan.cpu} Dedicated vCPU | {plan.ram} GB DDR5 ECC RAM | {plan.disk} GB NVMe SSD</Typography>
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
                    Upgrade requires a brief restart of your VDS. Plan your upgrade during low-traffic periods.
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

export default VDSUpgradePage
