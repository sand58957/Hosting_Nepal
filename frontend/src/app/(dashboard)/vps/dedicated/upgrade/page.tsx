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

interface Server {
  id: string
  hostname: string
  planName: string
  cpu: number
  ram: number
  disk: number
  type: string
  features?: { processor?: string; cpuThreads?: number; diskType?: string }
}

interface Plan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  price: number
  features?: { processor?: string; cpuThreads?: number; diskType?: string }
}

const DedicatedUpgradePage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const dedicated = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'DEDICATED' || h.type === 'dedicated'
        )
        setServers(dedicated)
      } catch {
        setServers([])
      } finally {
        setLoadingServers(false)
      }
    }

    const fetchPlans = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const allPlans = res.data?.data ?? res.data
        const raw = Array.isArray(allPlans) ? allPlans : allPlans?.data ?? []
        const dedicatedPlans = raw
          .filter((p: any) => p.type === 'DEDICATED')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            cpu: p.specs?.cpuCores || 0,
            ram: p.specs?.ramGB || 0,
            disk: p.specs?.diskGB || 0,
            price: p.priceMonthly,
            features: {
              processor: p.specs?.processor || p.features?.processor || '',
              cpuThreads: p.specs?.cpuThreads || p.features?.cpuThreads || 0,
              diskType: p.specs?.diskType || p.features?.diskType || 'HDD',
            },
          }))
        setPlans(dedicatedPlans)
      } catch {
        setPlans([])
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchServers()
    fetchPlans()
  }, [])

  const currentServer = servers.find((s) => s.id === selectedServer)

  const handleUpgrade = async () => {
    if (!selectedServer || !selectedPlan) return
    setUpgrading(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/upgrade`, { planId: selectedPlan.id })
      setSuccess('Upgrade initiated successfully. Your server will be upgraded shortly.')
      setSelectedPlan(null)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upgrade server. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-arrow-up-circle' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Upgrade Dedicated Server</Typography>
            <Typography variant='body2' color='text.secondary'>
              Upgrade your server to a more powerful configuration
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Server Selection */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>Select Server</Typography>
            {loadingServers ? (
              <Skeleton height={56} />
            ) : servers.length === 0 ? (
              <Alert severity='info'>No dedicated servers found. Deploy one first.</Alert>
            ) : (
              <CustomTextField
                select
                label='Dedicated Server'
                value={selectedServer}
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedPlan(null) }}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname || s.id} - {s.planName || 'Dedicated'}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Current Config */}
      {currentServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Current Configuration</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>Plan</Typography>
                <Typography variant='body2' fontWeight={600}>{currentServer.planName || 'Dedicated'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>Processor</Typography>
                <Typography variant='body2'>{currentServer.features?.processor || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>CPU</Typography>
                <Typography variant='body2'>{currentServer.cpu} Cores</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>RAM</Typography>
                <Typography variant='body2'>{currentServer.ram} GB</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Disk</Typography>
                <Typography variant='body2'>{currentServer.disk >= 1000 ? `${currentServer.disk / 1000} TB` : `${currentServer.disk} GB`}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Available Upgrade Plans */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Typography variant='h6' sx={{ mb: 3 }}>Available Upgrade Plans</Typography>
          {loadingPlans ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Card variant='outlined'>
                    <CardContent sx={{ py: 4 }}>
                      <Skeleton width='60%' sx={{ mb: 1 }} />
                      <Skeleton width='40%' height={40} sx={{ mb: 2 }} />
                      <Skeleton width='80%' />
                      <Skeleton width='80%' />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {plans
                .filter((p) => currentServer && (p.cpu > currentServer.cpu || p.ram > currentServer.ram || p.disk > currentServer.disk))
                .map((plan) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
                    <Card
                      variant='outlined'
                      sx={{
                        cursor: 'pointer',
                        border: selectedPlan?.id === plan.id ? 2 : 1,
                        borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'divider',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: 2 },
                      }}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent>
                        <Typography variant='h6' sx={{ mb: 0.5 }}>{plan.name}</Typography>
                        <Typography variant='caption' color='text.secondary'>{plan.features?.processor}</Typography>
                        <Typography variant='h5' color='primary.main' sx={{ my: 1 }}>
                          NPR {plan.price.toLocaleString()}<Typography variant='caption' color='text.secondary'>/mo</Typography>
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant='body2'>{plan.cpu}C/{plan.features?.cpuThreads || plan.cpu * 2}T CPU</Typography>
                        <Typography variant='body2'>{plan.ram} GB ECC RAM</Typography>
                        <Typography variant='body2'>{plan.disk >= 1000 ? `${plan.disk / 1000} TB` : `${plan.disk} GB`} {plan.features?.diskType}</Typography>
                        <Button
                          variant={selectedPlan?.id === plan.id ? 'contained' : 'outlined'}
                          fullWidth
                          sx={{ mt: 2 }}
                        >
                          {selectedPlan?.id === plan.id ? 'Selected' : 'Select'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {plans.filter((p) => currentServer && (p.cpu > currentServer.cpu || p.ram > currentServer.ram || p.disk > currentServer.disk)).length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity='info'>You are already on the highest available plan.</Alert>
                </Grid>
              )}
            </Grid>
          )}
        </Grid>
      )}

      {/* Upgrade Action */}
      {selectedPlan && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              <Alert severity='warning' sx={{ mb: 3 }}>
                Upgrading will require a server restart. Your server will experience brief downtime during the upgrade process.
              </Alert>
              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleUpgrade}
                disabled={upgrading}
                startIcon={upgrading ? <CircularProgress size={20} /> : <i className='tabler-arrow-up-circle' />}
              >
                {upgrading ? 'Upgrading...' : `Upgrade to ${selectedPlan.name}`}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedUpgradePage
