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

interface VDSPlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  bandwidth: string
  price: number
  priceYearly: number
  popular?: boolean
  contaboProductId?: string
  processor: string
}

const osOptions = [
  'Ubuntu 22.04',
  'Ubuntu 24.04',
  'Debian 12',
  'CentOS 9',
  'AlmaLinux 9',
  'Rocky Linux 9',
  'Windows Server 2022',
]

const billingOptions = [
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly (5% off)', multiplier: 2.85 },
  { value: 'semiannual', label: 'Semi-Annual (10% off)', multiplier: 5.4 },
  { value: 'yearly', label: 'Yearly (15% off)', multiplier: 10.2 },
]

const VDSOrderPage = () => {
  const router = useRouter()

  const [plans, setPlans] = useState<VDSPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VDSPlan | null>(null)
  const [hostname, setHostname] = useState('')
  const [os, setOs] = useState('Ubuntu 22.04')
  const [sshKey, setSshKey] = useState('')
  const [rootPassword, setRootPassword] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [containerStack, setContainerStack] = useState('none')
  const [deploying, setDeploying] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const allPlans = res.data?.data ?? res.data
        const raw = Array.isArray(allPlans) ? allPlans : allPlans?.data ?? []

        const contaboVdsSpecs: Record<string, { bandwidth: string; processor: string }> = {
          'vds-s': { bandwidth: '250 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz' },
          'vds-m': { bandwidth: '500 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz' },
          'vds-l': { bandwidth: '750 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz' },
          'vds-xl': { bandwidth: '1 Gbit/s', processor: 'AMD EPYC 7282 2.8 GHz' },
          'vds-xxl': { bandwidth: '1 Gbit/s', processor: 'AMD EPYC 7282 2.8 GHz' },
        }

        const vdsPlans = raw
          .filter((p: any) => p.type === 'VDS')
          .map((p: any) => {
            const extra = contaboVdsSpecs[p.id] || { bandwidth: '250 Mbit/s', processor: 'AMD EPYC 2.8 GHz' }
            return {
              id: p.id,
              name: p.name,
              cpu: p.specs?.cpuCores || 0,
              ram: p.specs?.ramGB || 0,
              disk: p.specs?.diskGB || 0,
              bandwidth: extra.bandwidth,
              processor: extra.processor,
              price: p.priceMonthly,
              priceYearly: p.priceYearly,
              popular: p.popular,
              contaboProductId: p.contaboProductId,
            }
          })

        setPlans(vdsPlans)
      } catch {
        setPlans([
          { id: 'vds-s', name: 'VDS S', cpu: 3, ram: 24, disk: 180, bandwidth: '250 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz', price: 6110, priceYearly: 61100 },
          { id: 'vds-m', name: 'VDS M', cpu: 4, ram: 32, disk: 240, bandwidth: '500 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz', price: 7957, priceYearly: 79570, popular: true },
          { id: 'vds-l', name: 'VDS L', cpu: 6, ram: 48, disk: 360, bandwidth: '750 Mbit/s', processor: 'AMD EPYC 7282 2.8 GHz', price: 11367, priceYearly: 113670 },
          { id: 'vds-xl', name: 'VDS XL', cpu: 8, ram: 64, disk: 480, bandwidth: '1 Gbit/s', processor: 'AMD EPYC 7282 2.8 GHz', price: 14635, priceYearly: 146350 },
          { id: 'vds-xxl', name: 'VDS XXL', cpu: 12, ram: 96, disk: 720, bandwidth: '1 Gbit/s', processor: 'AMD EPYC 7282 2.8 GHz', price: 21135, priceYearly: 211350 },
        ])
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
    try {
      await api.post('/hosting/vps', {
        planId: selectedPlan.id,
        hostname,
        os,
        sshKey: sshKey || undefined,
        rootPassword,
        billingCycle: billing,
        containerStack: containerStack !== 'none' ? containerStack : undefined,
      })
      router.push('/vps')
    } catch {
      // silently handle
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Order New VDS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Choose a VDS plan with dedicated resources — dedicated vCPU, DDR5 ECC RAM, NVMe SSD
          </Typography>
        </Box>
      </Grid>

      {/* Plan Selection */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' sx={{ mb: 3 }}>1. Select a Plan</Typography>
        {loadingPlans ? (
          <Grid container spacing={4}>
            {[1, 2, 3, 4].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Card variant='outlined'>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Skeleton variant='circular' width={56} height={56} sx={{ mx: 'auto', mb: 2 }} />
                    <Skeleton width='60%' sx={{ mx: 'auto', mb: 1 }} />
                    <Skeleton width='40%' height={40} sx={{ mx: 'auto', mb: 2 }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                    <Skeleton width='80%' sx={{ mx: 'auto' }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
        <Grid container spacing={4}>
          {plans.map((plan) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.id}>
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
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                  />
                )}
                <CardContent sx={{ p: 0 }}>
                  {/* Header */}
                  <Box sx={{
                    bgcolor: selectedPlan?.id === plan.id ? 'primary.main' : 'grey.900',
                    color: 'white',
                    textAlign: 'center',
                    py: 2.5,
                    px: 2,
                  }}>
                    <Typography variant='h5' fontWeight={700} color='inherit'>{plan.name}</Typography>
                    <Typography variant='h4' fontWeight={800} color='inherit' sx={{ mt: 1 }}>
                      NPR {plan.price.toLocaleString()}
                      <Typography component='span' variant='body2' color='inherit' sx={{ opacity: 0.8 }}>/mo</Typography>
                    </Typography>
                  </Box>

                  {/* Specs Table - Contabo Style */}
                  <Box sx={{ px: 0 }}>
                    {[
                      { icon: 'tabler-cpu', label: `${plan.cpu} Physical Cores`, sub: plan.processor },
                      { icon: 'tabler-device-desktop-analytics', label: `${plan.ram} GB RAM` },
                      { icon: 'tabler-database', label: `${plan.disk} GB NVMe`, sub: 'More storage available' },
                      { icon: 'tabler-network', label: `${plan.bandwidth} Port` },
                      { icon: 'tabler-transfer', label: 'Unlimited Traffic*' },
                    ].map((spec, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          py: 1.5,
                          borderBottom: idx < 4 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant='body2' fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {spec.label}
                        </Typography>
                        {spec.sub && (
                          <Typography variant='caption' color='text.secondary'>{spec.sub}</Typography>
                        )}
                      </Box>
                    ))}
                  </Box>

                  {/* Select Button */}
                  <Box sx={{ p: 2 }}>
                    <Button
                      variant={selectedPlan?.id === plan.id ? 'contained' : 'outlined'}
                      fullWidth
                      size='large'
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {selectedPlan?.id === plan.id ? 'Selected' : 'Select'}
                    </Button>
                  </Box>
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
              <Typography variant='h6' sx={{ mb: 3 }}>2. Configure Your Server</Typography>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='Hostname'
                    placeholder='e.g., my-vds-server-1'
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
                    select
                    label='Container Stack (Optional)'
                    value={containerStack}
                    onChange={(e) => setContainerStack(e.target.value)}
                    fullWidth
                    helperText='Pre-install Docker, Kubernetes, or Portainer on your VPS'
                  >
                    <MenuItem value='none'>None</MenuItem>
                    <MenuItem value='docker'>Docker + Docker Compose</MenuItem>
                    <MenuItem value='docker-portainer'>Docker + Portainer (Web UI)</MenuItem>
                    <MenuItem value='k3s'>k3s (Lightweight Kubernetes)</MenuItem>
                    <MenuItem value='k3s-portainer'>k3s + Portainer</MenuItem>
                    <MenuItem value='full-stack'>Full Stack (Docker + k3s + Portainer)</MenuItem>
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
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    label='SSH Public Key (optional)'
                    placeholder='ssh-rsa AAAA...'
                    value={sshKey}
                    onChange={(e) => setSshKey(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    helperText='Paste your SSH public key for passwordless login'
                  />
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
                <Typography variant='body1'>Specs</Typography>
                <Typography variant='body1'>{selectedPlan.cpu} Dedicated vCPU, {selectedPlan.ram} GB DDR5 ECC RAM, {selectedPlan.disk} GB NVMe SSD</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>OS</Typography>
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
              <Alert severity='info' sx={{ mb: 3 }}>
                Your VDS with dedicated resources will be deployed within a few minutes after payment confirmation.
              </Alert>
              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleDeploy}
                disabled={!hostname.trim() || !rootPassword || deploying}
                startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
              >
                {deploying ? 'Deploying...' : 'Deploy VDS'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default VDSOrderPage
