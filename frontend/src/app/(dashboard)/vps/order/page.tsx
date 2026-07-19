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
  isStorage?: boolean
}

// Fallback OS list (legacy slugs the backend maps). Replaced at runtime by the
// FULL live Contabo image catalog from GET /hosting/vps-images.
const fallbackOsOptions = [
  { value: 'ubuntu-24.04', label: 'Ubuntu 24.04 LTS' },
  { value: 'ubuntu-22.04', label: 'Ubuntu 22.04 LTS' },
  { value: 'debian-12', label: 'Debian 12' },
  { value: 'debian-11', label: 'Debian 11' },
  { value: 'almalinux-9', label: 'AlmaLinux 9' },
  { value: 'rocky-9', label: 'Rocky Linux 9' },
  { value: 'centos-9', label: 'CentOS 9 Stream' },
]

// Contract terms — no discount: total = monthly price × months. `cycle` maps to
// the backend BillingCycle enum sent on order.
const billingOptions = [
  { value: 'monthly', label: 'Monthly (1 month)', months: 1, cycle: 'MONTHLY' },
  { value: 'quarterly', label: 'Quarterly (3 months)', months: 3, cycle: 'QUARTERLY' },
  { value: 'halfyearly', label: 'Half-Yearly (6 months)', months: 6, cycle: 'HALF_YEARLY' },
  { value: 'yearly', label: 'Yearly (12 months)', months: 12, cycle: 'YEARLY' },
]

const VPSOrderPage = () => {
  const router = useRouter()

  const [plans, setPlans] = useState<VPSPlan[]>([])
  const [storagePlans, setStoragePlans] = useState<VPSPlan[]>([])
  const [osOptions, setOsOptions] = useState(fallbackOsOptions)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VPSPlan | null>(null)
  const [hostname, setHostname] = useState('')
  const [os, setOs] = useState('ubuntu-22.04')
  const [sshKey, setSshKey] = useState('')
  const [rootPassword, setRootPassword] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [containerStack, setContainerStack] = useState('none')
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Fetch live plans from API with RC pricing + 50% margin
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const allPlans = res.data?.data ?? res.data
        const raw = Array.isArray(allPlans) ? allPlans : allPlans?.data ?? []

        // Contabo Cloud VPS specs (NVMe / SSD disk, snapshots, port)
        const contaboSpecs: Record<string, { diskSsd: number; snapshots: number; bandwidth: string }> = {
          'vps-10': { diskSsd: 150, snapshots: 1, bandwidth: '200 Mbit/s' },
          'vps-20': { diskSsd: 200, snapshots: 2, bandwidth: '300 Mbit/s' },
          'vps-30': { diskSsd: 400, snapshots: 3, bandwidth: '600 Mbit/s' },
          'vps-40': { diskSsd: 500, snapshots: 3, bandwidth: '800 Mbit/s' },
          'vps-50': { diskSsd: 600, snapshots: 3, bandwidth: '1 Gbit/s' },
          'vps-60': { diskSsd: 700, snapshots: 3, bandwidth: '1 Gbit/s' },
        }
        // Storage VPS specs (SSD-only, storage-optimised)
        const storageSpecs: Record<string, { snapshots: number; bandwidth: string }> = {
          'storage-vps-10': { snapshots: 0, bandwidth: '200 Mbit/s' },
          'storage-vps-30': { snapshots: 0, bandwidth: '600 Mbit/s' },
          'storage-vps-40': { snapshots: 0, bandwidth: '800 Mbit/s' },
          'storage-vps-50': { snapshots: 0, bandwidth: '1 Gbit/s' },
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

        const storageVpsPlans = raw
          .filter((p: any) => p.type === 'STORAGE_VPS')
          .map((p: any) => {
            const extra = storageSpecs[p.id] || {}
            return {
              id: p.id,
              name: p.name,
              cpu: p.specs?.cpuCores || 0,
              ram: p.specs?.ramGB || 0,
              disk: p.specs?.diskGB || 0, // SSD size (storage VPS is SSD-only)
              diskSsd: 0,
              snapshots: extra.snapshots ?? 0,
              bandwidth: extra.bandwidth || '200 Mbit/s',
              price: p.priceMonthly,
              priceYearly: p.priceYearly,
              popular: false,
              contaboProductId: p.contaboProductId,
              features: p.features || [],
              isStorage: true,
            }
          })

        setPlans(vpsPlans)
        setStoragePlans(storageVpsPlans)
      } catch {
        setPlans([
          { id: 'vps-10', name: 'VPS 10', cpu: 4, ram: 8, disk: 75, diskSsd: 150, snapshots: 1, bandwidth: '200 Mbit/s', price: 1228, priceYearly: 12280 },
          { id: 'vps-20', name: 'VPS 20', cpu: 6, ram: 12, disk: 100, diskSsd: 200, snapshots: 2, bandwidth: '300 Mbit/s', price: 1674, priceYearly: 16740, popular: true },
          { id: 'vps-30', name: 'VPS 30', cpu: 8, ram: 24, disk: 200, diskSsd: 400, snapshots: 3, bandwidth: '600 Mbit/s', price: 3125, priceYearly: 31250 },
          { id: 'vps-40', name: 'VPS 40', cpu: 12, ram: 48, disk: 250, diskSsd: 500, snapshots: 3, bandwidth: '800 Mbit/s', price: 5580, priceYearly: 55800 },
          { id: 'vps-50', name: 'VPS 50', cpu: 16, ram: 64, disk: 300, diskSsd: 600, snapshots: 3, bandwidth: '1 Gbit/s', price: 8277, priceYearly: 82770 },
          { id: 'vps-60', name: 'VPS 60', cpu: 18, ram: 96, disk: 350, diskSsd: 700, snapshots: 3, bandwidth: '1 Gbit/s', price: 10937, priceYearly: 109370 },
        ])
        setStoragePlans([
          { id: 'storage-vps-10', name: 'Storage VPS 10', cpu: 2, ram: 4, disk: 300, diskSsd: 0, snapshots: 0, bandwidth: '200 Mbit/s', price: 1228, priceYearly: 12280, isStorage: true },
          { id: 'storage-vps-30', name: 'Storage VPS 30', cpu: 6, ram: 18, disk: 1000, diskSsd: 0, snapshots: 0, bandwidth: '600 Mbit/s', price: 3125, priceYearly: 31250, isStorage: true },
          { id: 'storage-vps-40', name: 'Storage VPS 40', cpu: 8, ram: 30, disk: 1200, diskSsd: 0, snapshots: 0, bandwidth: '800 Mbit/s', price: 5580, priceYearly: 55800, isStorage: true },
          { id: 'storage-vps-50', name: 'Storage VPS 50', cpu: 14, ram: 50, disk: 1400, diskSsd: 0, snapshots: 0, bandwidth: '1 Gbit/s', price: 8277, priceYearly: 82770, isStorage: true },
        ])
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()

    // Load the FULL live Contabo image catalog (backend accepts image UUIDs).
    api.get('/hosting/vps-images')
      .then((res) => {
        const raw = res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : []
        if (list.length > 0) {
          setOsOptions(list.map((i: any) => ({ value: i.imageId, label: i.name })))
          const def = list.find((i: any) => i.name === 'ubuntu-22.04')
          if (def) setOs(def.imageId)
        }
      })
      .catch(() => {})
  }, [])

  const billingOption = billingOptions.find((b) => b.value === billing) || billingOptions[0]
  const totalPrice = selectedPlan ? Math.round(selectedPlan.price * billingOption.months) : 0

  const handleDeploy = async () => {
    if (!selectedPlan || !hostname.trim() || !rootPassword) return
    setError(null)
    setDeploying(true)
    try {
      await api.post('/hosting/vps', {
        planId: selectedPlan.id,
        hostname: hostname.trim(),
        osTemplate: os,
        rootPassword,
        sshKey: sshKey.trim() || undefined,
        containerStack: containerStack !== 'none' ? containerStack : undefined,
        billingCycle: billingOption.cycle,
      })
      setSubmitted(true)
      setDeploying(false)
    } catch (e: any) {
      const msg = e?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to deploy VPS. Please check your details and try again.'))
      setDeploying(false)
    }
  }

  const renderPlanCard = (plan: VPSPlan) => (
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
          <Chip label='Popular' color='primary' size='small' sx={{ position: 'absolute', top: 12, right: 12 }} />
        )}
        <CardContent sx={{ p: 0 }}>
          <Box sx={{
            bgcolor: selectedPlan?.id === plan.id ? 'primary.main' : 'action.hover',
            color: selectedPlan?.id === plan.id ? 'white' : 'text.primary',
            textAlign: 'center', py: 2.5, px: 2, borderRadius: '0',
          }}>
            <Typography variant='h5' fontWeight={700} color='inherit'>{plan.name}</Typography>
            <Typography variant='h4' fontWeight={800} color='inherit' sx={{ mt: 1 }}>
              NPR {plan.price.toLocaleString()}
              <Typography component='span' variant='body2' color='inherit' sx={{ opacity: 0.8 }}>/mo</Typography>
            </Typography>
          </Box>
          <Box sx={{ px: 0 }}>
            {[
              { icon: 'tabler-cpu', label: `${plan.cpu} vCPU Cores`, sub: undefined as string | undefined },
              { icon: 'tabler-device-desktop-analytics', label: `${plan.ram} GB RAM`, sub: undefined as string | undefined },
              plan.isStorage
                ? { icon: 'tabler-database', label: `${plan.disk} GB SSD`, sub: undefined as string | undefined }
                : { icon: 'tabler-database', label: `${plan.disk} GB NVMe`, sub: plan.diskSsd ? `or ${plan.diskSsd} GB SSD` : undefined },
              { icon: 'tabler-camera', label: `${plan.snapshots ?? 0} Snapshot${(plan.snapshots ?? 0) === 1 ? '' : 's'}`, sub: undefined as string | undefined },
              { icon: 'tabler-network', label: `${plan.bandwidth || '200 Mbit/s'} Port`, sub: undefined as string | undefined },
              { icon: 'tabler-transfer', label: 'Unlimited Traffic', sub: undefined as string | undefined },
            ].map((spec, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 1.5, borderBottom: idx < 5 ? '1px solid' : 'none', borderColor: 'divider' }}>
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
          <Box sx={{ p: 2 }}>
            <Button variant={selectedPlan?.id === plan.id ? 'contained' : 'outlined'} fullWidth size='large' onClick={() => setSelectedPlan(plan)}>
              {selectedPlan?.id === plan.id ? 'Selected' : 'Select'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  )

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
          <>
            <Typography variant='subtitle1' fontWeight={700} sx={{ mb: 2 }}>Virtual Private Servers</Typography>
            <Grid container spacing={4}>
              {plans.map(renderPlanCard)}
            </Grid>
            {storagePlans.length > 0 && (
              <>
                <Typography variant='subtitle1' fontWeight={700} sx={{ mt: 5, mb: 0.5 }}>Storage VPS</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  Storage-optimised instances — large SSD capacity for backups, media and data.
                </Typography>
                <Grid container spacing={4}>
                  {storagePlans.map(renderPlanCard)}
                </Grid>
              </>
            )}
          </>
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
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
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
                    label='Contract Period'
                    value={billing}
                    onChange={(e) => setBilling(e.target.value)}
                    fullWidth
                    helperText='Total = monthly price × months (no discount). Nothing is charged now — billing is confirmed when an admin approves your request.'
                  >
                    {billingOptions.map((b) => (
                      <MenuItem key={b.value} value={b.value}>
                        {b.label}{selectedPlan ? ` — NPR ${Math.round(selectedPlan.price * b.months).toLocaleString()}` : ''}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                {selectedPlan && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>Price by contract period</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {billingOptions.map((b) => (
                        <Chip
                          key={b.value}
                          variant={billing === b.value ? 'filled' : 'outlined'}
                          color={billing === b.value ? 'primary' : 'default'}
                          onClick={() => setBilling(b.value)}
                          label={`${b.label.split(' (')[0]}: NPR ${Math.round(selectedPlan.price * b.months).toLocaleString()}`}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
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
                <Typography variant='body1'>{osOptions.find(o => o.value === os)?.label || os}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Contract Period</Typography>
                <Typography variant='body1'>{billingOption.label}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body1'>Monthly Price</Typography>
                <Typography variant='body1'>NPR {selectedPlan.price.toLocaleString()}/mo × {billingOption.months}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='h6'>Term Total</Typography>
                <Typography variant='h5' color='primary.main'>
                  NPR {totalPrice.toLocaleString()}
                </Typography>
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 3 }}>
                Estimate only. Final billing is set when an admin approves your request — you are not charged at order time.
              </Typography>
              {error && <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
              {submitted ? (
                <>
                  <Alert severity='success' sx={{ mb: 3 }}>
                    ✅ Your VPS request was submitted and is <strong>awaiting admin approval</strong>. It will be provisioned automatically once approved — track it under <strong>My Servers</strong>.
                  </Alert>
                  <Button variant='contained' size='large' fullWidth onClick={() => router.push('/vps')}>
                    Go to My Servers
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Your VPS request will be reviewed by an admin and provisioned once approved.
                  </Alert>
                  <Button
                    variant='contained'
                    size='large'
                    fullWidth
                    onClick={handleDeploy}
                    disabled={!hostname.trim() || !rootPassword || deploying}
                    startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
                  >
                    {deploying ? 'Submitting...' : 'Submit VPS Request'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default VPSOrderPage
