'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

interface DedicatedPlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  price: number
  priceYearly: number
  popular?: boolean
  rcPlanId?: string
  features?: {
    processor?: string
    cpuThreads?: number
    diskType?: string
  }
}

const osOptions = [
  'Ubuntu 22.04 LTS',
  'Ubuntu 24.04 LTS',
  'Debian 12',
  'CentOS 9 Stream',
  'AlmaLinux 9',
  'Rocky Linux 9',
  'Windows Server 2022',
  'Windows Server 2019',
  'Proxmox VE',
  'VMware ESXi',
]

const billingOptions = [
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly (5% off)', multiplier: 2.85 },
  { value: 'semi-annual', label: 'Semi-Annual (10% off)', multiplier: 5.4 },
  { value: 'yearly', label: 'Yearly (15% off)', multiplier: 10.2 },
]

const fallbackPlans: DedicatedPlan[] = [
  { id: 'ds-e3', name: 'DS Intel Xeon E3', cpu: 4, ram: 8, disk: 500, price: 14950, priceYearly: 152490, features: { processor: 'Intel Xeon E3', cpuThreads: 8, diskType: 'HDD' } },
  { id: 'ds-e5', name: 'DS Intel Xeon E5', cpu: 8, ram: 16, disk: 1000, price: 22900, priceYearly: 233580, popular: true, features: { processor: 'Intel Xeon E5', cpuThreads: 16, diskType: 'HDD' } },
  { id: 'ds-dual-e5', name: 'DS Dual Xeon E5', cpu: 16, ram: 32, disk: 2000, price: 39900, priceYearly: 406980, features: { processor: 'Dual Intel Xeon E5', cpuThreads: 32, diskType: 'HDD' } },
  { id: 'ds-scalable', name: 'DS Xeon Scalable', cpu: 24, ram: 64, disk: 2000, price: 59900, priceYearly: 610980, features: { processor: 'Intel Xeon Scalable', cpuThreads: 48, diskType: 'NVMe' } },
  { id: 'ds-performance', name: 'DS Performance', cpu: 8, ram: 32, disk: 4000, price: 44900, priceYearly: 457980, features: { processor: 'Intel Xeon E5', cpuThreads: 16, diskType: 'NVMe' } },
  { id: 'ds-enterprise', name: 'DS Enterprise Plus', cpu: 32, ram: 128, disk: 4000, price: 89900, priceYearly: 916980, features: { processor: 'Intel Xeon Scalable', cpuThreads: 64, diskType: 'NVMe' } },
  { id: 'ds-ultimate', name: 'DS Ultimate', cpu: 64, ram: 256, disk: 8000, price: 149900, priceYearly: 1528980, features: { processor: 'Dual Intel Xeon Scalable', cpuThreads: 128, diskType: 'NVMe' } },
]

const DedicatedOrderPage = () => {
  const router = useRouter()

  const [plans, setPlans] = useState<DedicatedPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<DedicatedPlan | null>(null)
  const [hostname, setHostname] = useState('')
  const [os, setOs] = useState('Ubuntu 22.04 LTS')
  const [rootPassword, setRootPassword] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')

  useEffect(() => {
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
            priceYearly: p.priceYearly,
            popular: p.popular,
            rcPlanId: p.rcPlanId,
            features: {
              processor: p.specs?.processor || p.features?.processor || '',
              cpuThreads: p.specs?.cpuThreads || p.features?.cpuThreads || 0,
              diskType: p.specs?.diskType || p.features?.diskType || 'HDD',
            },
          }))

        setPlans(dedicatedPlans.length > 0 ? dedicatedPlans : fallbackPlans)
      } catch {
        setPlans(fallbackPlans)
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [])

  const billingOption = billingOptions.find((b) => b.value === billing) || billingOptions[0]
  const totalPrice = selectedPlan ? Math.round(selectedPlan.price * billingOption.multiplier) : 0

  const handleDeploy = async () => {
    if (!selectedPlan || !hostname.trim() || !rootPassword) return
    setDeploying(true)
    setDeployError('')
    try {
      await api.post('/hosting/vps', {
        planId: selectedPlan.id,
        hostname,
        os,
        rootPassword,
        billingCycle: billing,
        provider: 'RESELLERCLUB',
        type: 'DEDICATED',
      })
      router.push('/vps/dedicated')
    } catch (err: any) {
      setDeployError(err?.response?.data?.message || 'Failed to deploy dedicated server. Please try again.')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-server' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Order Dedicated Server</Typography>
            <Typography variant='body2' color='text.secondary'>
              Choose a bare-metal dedicated server with Intel Xeon processors and enterprise hardware
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Plan Selection */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' sx={{ mb: 3 }}>1. Select a Plan</Typography>
        {loadingPlans ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Card variant='outlined'>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Skeleton variant='circular' width={56} height={56} sx={{ mx: 'auto', mb: 2 }} />
                    <Skeleton width='60%' sx={{ mx: 'auto', mb: 1 }} />
                    <Skeleton width='40%' height={40} sx={{ mx: 'auto', mb: 2 }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                    <Skeleton width='80%' sx={{ mx: 'auto', mt: 2 }} height={36} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={plan.id}>
                <Card
                  variant='outlined'
                  sx={{
                    cursor: 'pointer',
                    border: selectedPlan?.id === plan.id ? 2 : 1,
                    borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'divider',
                    position: 'relative',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: 2 },
                  }}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan.popular && (
                    <Chip
                      label='Popular'
                      color='primary'
                      size='small'
                      sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 600 }}
                    />
                  )}
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Avatar
                      sx={{
                        bgcolor: selectedPlan?.id === plan.id ? 'primary.main' : 'action.hover',
                        width: 56,
                        height: 56,
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <i
                        className='tabler-server'
                        style={{ fontSize: 28, color: selectedPlan?.id === plan.id ? '#fff' : undefined }}
                      />
                    </Avatar>
                    <Typography variant='h6' sx={{ mb: 0.5 }}>{plan.name}</Typography>
                    {plan.features?.processor && (
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                        {plan.features.processor}
                      </Typography>
                    )}
                    <Typography variant='h4' color='primary.main' sx={{ mb: 2 }}>
                      NPR {plan.price.toLocaleString()}
                      <Typography variant='caption' color='text.secondary'>/mo</Typography>
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-cpu' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.cpu}C/{plan.features?.cpuThreads || plan.cpu * 2}T Cores/Threads
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.ram} GB ECC RAM
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-database' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.disk >= 1000 ? `${plan.disk / 1000} TB` : `${plan.disk} GB`} {plan.features?.diskType || 'HDD'}
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-shield-check' style={{ fontSize: 14, marginRight: 6 }} />
                        DDoS Protection
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-key' style={{ fontSize: 14, marginRight: 6 }} />
                        IPMI / KVM Access
                      </Typography>
                    </Box>
                    <Button
                      variant={selectedPlan?.id === plan.id ? 'contained' : 'outlined'}
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Grid>

      {/* Configuration Form */}
      {selectedPlan && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>2. Configure Your Dedicated Server</Typography>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='Hostname'
                    placeholder='e.g., prod-db-01'
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    select
                    label='Operating System'
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    fullWidth
                  >
                    {osOptions.map((o) => (
                      <MenuItem key={o} value={o}>{o}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='Root Password'
                    type='password'
                    value={rootPassword}
                    onChange={(e) => setRootPassword(e.target.value)}
                    fullWidth
                    required
                    helperText='Minimum 8 characters with uppercase, lowercase, and numbers'
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    select
                    label='Billing Period'
                    value={billing}
                    onChange={(e) => setBilling(e.target.value)}
                    fullWidth
                  >
                    {billingOptions.map((b) => (
                      <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Order Summary */}
      {selectedPlan && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>3. Order Summary</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Plan</Typography>
                <Typography variant='body1' fontWeight={500}>{selectedPlan.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Processor</Typography>
                <Typography variant='body1'>{selectedPlan.features?.processor || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Resources</Typography>
                <Typography variant='body1'>
                  {selectedPlan.cpu}C/{selectedPlan.features?.cpuThreads || selectedPlan.cpu * 2}T, {selectedPlan.ram} GB ECC RAM, {selectedPlan.disk >= 1000 ? `${selectedPlan.disk / 1000} TB` : `${selectedPlan.disk} GB`} {selectedPlan.features?.diskType || 'HDD'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Operating System</Typography>
                <Typography variant='body1'>{os}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Billing</Typography>
                <Typography variant='body1'>{billingOption.label}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant='h6'>Total</Typography>
                <Typography variant='h5' color='primary.main'>
                  NPR {totalPrice.toLocaleString()}
                </Typography>
              </Box>

              {deployError && (
                <Alert severity='error' sx={{ mb: 3 }} onClose={() => setDeployError('')}>
                  {deployError}
                </Alert>
              )}

              <Alert severity='info' sx={{ mb: 3 }} icon={<i className='tabler-info-circle' style={{ fontSize: 20 }} />}>
                Dedicated server provisioning typically takes 1-4 hours. You will receive an email with server access details once ready.
              </Alert>
              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleDeploy}
                disabled={!hostname.trim() || !rootPassword || deploying}
                startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
              >
                {deploying ? 'Deploying Dedicated Server...' : 'Deploy Dedicated Server'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedOrderPage
