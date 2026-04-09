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

interface VPSPlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  diskSsd?: number
  snapshots?: number
  bandwidth?: string
  price: number
  priceYearly: number
  popular?: boolean
  contaboProductId?: string
  features?: string[]
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
  { value: 'yearly', label: 'Yearly (15% off)', multiplier: 10.2 },
]

const VPSOrderPage = () => {
  const router = useRouter()

  const [plans, setPlans] = useState<VPSPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VPSPlan | null>(null)
  const [hostname, setHostname] = useState('')
  const [os, setOs] = useState('Ubuntu 22.04')
  const [sshKey, setSshKey] = useState('')
  const [rootPassword, setRootPassword] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [containerStack, setContainerStack] = useState('none')
  const [deploying, setDeploying] = useState(false)

  // Fetch live plans from API with RC pricing + 50% margin
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const allPlans = res.data?.data ?? res.data
        const raw = Array.isArray(allPlans) ? allPlans : allPlans?.data ?? []

        // Filter VPS plans only (not VDS)
        // Contabo VPS specs mapping
        const contaboSpecs: Record<string, { diskSsd: number; snapshots: number; bandwidth: string }> = {
          'vps-10': { diskSsd: 150, snapshots: 1, bandwidth: '200 Mbit/s' },
          'vps-20': { diskSsd: 200, snapshots: 2, bandwidth: '300 Mbit/s' },
          'vps-30': { diskSsd: 400, snapshots: 3, bandwidth: '600 Mbit/s' },
          'vps-40': { diskSsd: 500, snapshots: 3, bandwidth: '800 Mbit/s' },
          'vps-50': { diskSsd: 600, snapshots: 3, bandwidth: '1 Gbit/s' },
          'vps-60': { diskSsd: 700, snapshots: 3, bandwidth: '1 Gbit/s' },
        }

        const vpsPlans = raw
          .filter((p: any) => p.type === 'VPS')
          .map((p: any) => {
            const extra = contaboSpecs[p.id] || {}
            return {
              id: p.id,
              name: p.name,
              cpu: p.specs?.cpuCores || 0,
              ram: p.specs?.ramGB || 0,
              disk: p.specs?.diskGB || 0,
              diskSsd: extra.diskSsd || (p.specs?.diskGB || 0) * 2,
              snapshots: extra.snapshots || 1,
              bandwidth: extra.bandwidth || '200 Mbit/s',
              price: p.priceMonthly,
              priceYearly: p.priceYearly,
              popular: p.popular,
              contaboProductId: p.contaboProductId,
              features: p.features || [],
            }
          })

        setPlans(vpsPlans)
      } catch {
        setPlans([
          { id: 'vps-10', name: 'VPS 10', cpu: 4, ram: 8, disk: 75, diskSsd: 150, snapshots: 1, bandwidth: '200 Mbit/s', price: 800, priceYearly: 8000 },
          { id: 'vps-20', name: 'VPS 20', cpu: 6, ram: 12, disk: 100, diskSsd: 200, snapshots: 2, bandwidth: '300 Mbit/s', price: 1244, priceYearly: 12440, popular: true },
          { id: 'vps-30', name: 'VPS 30', cpu: 8, ram: 24, disk: 200, diskSsd: 400, snapshots: 3, bandwidth: '600 Mbit/s', price: 2487, priceYearly: 24870 },
          { id: 'vps-40', name: 'VPS 40', cpu: 12, ram: 48, disk: 250, diskSsd: 500, snapshots: 3, bandwidth: '800 Mbit/s', price: 4440, priceYearly: 44400 },
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
          <Typography variant='h4'>Order New VPS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Choose a plan and configure your new server
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
                    bgcolor: selectedPlan?.id === plan.id ? 'primary.main' : 'action.hover',
                    color: selectedPlan?.id === plan.id ? 'white' : 'text.primary',
                    textAlign: 'center',
                    py: 2.5,
                    px: 2,
                    borderRadius: '0',
                  }}>
                    <Typography variant='h5' fontWeight={700} color='inherit'>{plan.name}</Typography>
                    <Typography variant='h4' fontWeight={800} color='inherit' sx={{ mt: 1 }}>
                      NPR {plan.price.toLocaleString()}
                      <Typography component='span' variant='body2' color='inherit' sx={{ opacity: 0.8 }}>/mo</Typography>
                    </Typography>
                  </Box>

                  {/* Specs Table */}
                  <Box sx={{ px: 0 }}>
                    {[
                      { icon: 'tabler-cpu', label: `${plan.cpu} vCPU Cores` },
                      { icon: 'tabler-device-desktop-analytics', label: `${plan.ram} GB RAM` },
                      { icon: 'tabler-database', label: `${plan.disk} GB NVMe`, sub: plan.diskSsd ? `or ${plan.diskSsd} GB SSD` : undefined },
                      { icon: 'tabler-camera', label: `${plan.snapshots || 1} Snapshot${(plan.snapshots || 1) > 1 ? 's' : ''}` },
                      { icon: 'tabler-network', label: `${plan.bandwidth || '200 Mbit/s'} Port` },
                      { icon: 'tabler-transfer', label: 'Unlimited Traffic' },
                    ].map((spec, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          py: 1.5,
                          borderBottom: idx < 5 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant='body2' fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <i className={spec.icon} style={{ fontSize: 16 }} />
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
                    placeholder='e.g., my-server-1'
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
                <Typography variant='body1'>{selectedPlan.cpu} vCPU, {selectedPlan.ram} GB RAM, {selectedPlan.disk} GB SSD</Typography>
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
                Your VPS will be deployed within a few minutes after payment confirmation.
              </Alert>
              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleDeploy}
                disabled={!hostname.trim() || !rootPassword || deploying}
                startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
              >
                {deploying ? 'Deploying...' : 'Deploy VPS'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default VPSOrderPage
