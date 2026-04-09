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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VDSPlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  price: number
  priceYearly: number
  popular?: boolean
  rcPlanId?: string
}

interface VDSServer {
  id: string
  hostname: string
  ipAddress: string
  os: string
  status: string
  planName: string
  cpu: number
  ram: number
  disk: number
  type: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const osOptions = [
  'Ubuntu 22.04 LTS',
  'Ubuntu 24.04 LTS',
  'Debian 12',
  'Debian 11',
  'CentOS 9 Stream',
  'AlmaLinux 9',
  'Rocky Linux 9',
  'Windows Server 2022',
  'Windows Server 2019',
]

const billingOptions = [
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly (5% off)', multiplier: 2.85 },
  { value: 'semi-annual', label: 'Semi-Annual (10% off)', multiplier: 5.4 },
  { value: 'yearly', label: 'Yearly (15% off)', multiplier: 10.2 },
]

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  RUNNING: 'success',
  online: 'success',
  PENDING: 'warning',
  STOPPED: 'error',
  offline: 'error',
  SUSPENDED: 'error',
}

const vdsFeatures = [
  { icon: 'tabler-cpu', text: 'Dedicated vCPU Cores' },
  { icon: 'tabler-device-desktop-analytics', text: 'DDR5 ECC RAM' },
  { icon: 'tabler-database', text: 'NVMe SSD Storage' },
  { icon: 'tabler-shield-check', text: 'DDoS Protection Included' },
  { icon: 'tabler-certificate', text: '99.9% SLA Guarantee' },
]

// ---------------------------------------------------------------------------
// Fallback plans if the API is unavailable
// ---------------------------------------------------------------------------

const fallbackPlans: VDSPlan[] = [
  { id: 'vds-8', name: 'VDS-8', cpu: 8, ram: 16, disk: 200, price: 12500, priceYearly: 127500 },
  { id: 'vds-12', name: 'VDS-12', cpu: 12, ram: 24, disk: 400, price: 18500, priceYearly: 188700, popular: true },
  { id: 'vds-16', name: 'VDS-16', cpu: 16, ram: 32, disk: 600, price: 24500, priceYearly: 249900 },
  { id: 'vds-20', name: 'VDS-20', cpu: 20, ram: 48, disk: 800, price: 32000, priceYearly: 326400 },
  { id: 'vds-24', name: 'VDS-24', cpu: 24, ram: 64, disk: 1000, price: 42000, priceYearly: 428400 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VDSPage = () => {
  const router = useRouter()

  // Plan ordering state
  const [plans, setPlans] = useState<VDSPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<VDSPlan | null>(null)
  const [hostname, setHostname] = useState('')
  const [os, setOs] = useState('Ubuntu 22.04 LTS')
  const [sshKey, setSshKey] = useState('')
  const [rootPassword, setRootPassword] = useState('')
  const [billing, setBilling] = useState('monthly')
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')

  // Server list state
  const [servers, setServers] = useState<VDSServer[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const allPlans = res.data?.data ?? res.data
        const raw = Array.isArray(allPlans) ? allPlans : allPlans?.data ?? []

        const vdsPlans = raw
          .filter((p: any) => p.type === 'VDS')
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
          }))

        setPlans(vdsPlans.length > 0 ? vdsPlans : fallbackPlans)
      } catch {
        setPlans(fallbackPlans)
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [])

  const fetchServers = async () => {
    try {
      const res = await api.get('/hosting')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
      const vdsList = (Array.isArray(list) ? list : []).filter(
        (h: any) => h.type === 'VDS' || h.type === 'vds'
      )
      setServers(vdsList)
    } catch {
      setServers([])
    } finally {
      setLoadingServers(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

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
        sshKey: sshKey || undefined,
        rootPassword,
        billingCycle: billing,
      })
      // Reset form
      setSelectedPlan(null)
      setHostname('')
      setOs('Ubuntu 22.04 LTS')
      setSshKey('')
      setRootPassword('')
      setBilling('monthly')
      // Refresh server list
      setLoadingServers(true)
      await fetchServers()
    } catch (err: any) {
      setDeployError(err?.response?.data?.message || 'Failed to deploy VDS. Please try again.')
    } finally {
      setDeploying(false)
    }
  }

  const handlePowerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(`${serverId}-${action}`)
    try {
      await api.post(`/hosting/vps/${serverId}/${action}`)
      await fetchServers()
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusLabel = (status: string) => {
    const s = status?.toUpperCase()
    if (s === 'ACTIVE' || s === 'RUNNING' || status === 'online') return 'Online'
    if (s === 'PENDING') return 'Pending'
    if (s === 'STOPPED' || status === 'offline') return 'Offline'
    if (s === 'SUSPENDED') return 'Suspended'
    return status || 'Unknown'
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Grid container spacing={6}>
      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
              <i className='tabler-cpu' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant='h4'>VDS Servers</Typography>
              <Typography variant='body2' color='text.secondary'>
                Virtual Dedicated Servers with guaranteed dedicated resources
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grid>

      {/* ------------------------------------------------------------------ */}
      {/* VDS Feature Banner                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(var(--mui-palette-primary-mainChannel) / 0.08) 0%, rgba(var(--mui-palette-primary-mainChannel) / 0.02) 100%)',
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <CardContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <i className='tabler-shield-check' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
              <Typography variant='subtitle1' fontWeight={600} color='primary.main'>
                Why Choose VDS over VPS?
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {vdsFeatures.map((f) => (
                <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className={f.icon} style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
                  <Typography variant='body2' fontWeight={500}>{f.text}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
              Unlike shared VPS, VDS plans guarantee dedicated CPU cores that are never shared with other tenants. Ideal for high-traffic applications, databases, and production workloads.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: Order VDS                                               */}
      {/* ------------------------------------------------------------------ */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' sx={{ mb: 0.5 }}>
          <i className='tabler-shopping-cart' style={{ fontSize: 22, marginRight: 8, verticalAlign: 'text-bottom' }} />
          Order New VDS
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          Select a plan with dedicated vCPU resources and configure your server
        </Typography>
      </Grid>

      {/* Plan Cards */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' sx={{ mb: 3 }}>1. Select a Plan</Typography>
        {loadingPlans ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={i}>
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
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={plan.id}>
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
                        className='tabler-cpu'
                        style={{ fontSize: 28, color: selectedPlan?.id === plan.id ? '#fff' : undefined }}
                      />
                    </Avatar>
                    <Typography variant='h5' sx={{ mb: 0.5 }}>{plan.name}</Typography>
                    <Chip label='Dedicated' size='small' variant='outlined' color='primary' sx={{ mb: 1.5 }} />
                    <Typography variant='h4' color='primary.main' sx={{ mb: 2 }}>
                      NPR {plan.price.toLocaleString()}
                      <Typography variant='caption' color='text.secondary'>/mo</Typography>
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-cpu' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.cpu} Dedicated vCPU
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.ram} GB DDR5 ECC RAM
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-database' style={{ fontSize: 14, marginRight: 6 }} />
                        {plan.disk} GB NVMe SSD
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 0.5 }}>
                        <i className='tabler-shield-check' style={{ fontSize: 14, marginRight: 6 }} />
                        DDoS Protection
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
              <Typography variant='h6' sx={{ mb: 3 }}>2. Configure Your VDS</Typography>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    label='Hostname'
                    placeholder='e.g., prod-db-server'
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
                <Typography variant='body1'>Resources</Typography>
                <Typography variant='body1'>
                  {selectedPlan.cpu} Dedicated vCPU, {selectedPlan.ram} GB DDR5 RAM, {selectedPlan.disk} GB NVMe
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
                Your VDS will be provisioned with dedicated resources within a few minutes after payment confirmation.
              </Alert>
              <Button
                variant='contained'
                size='large'
                fullWidth
                onClick={handleDeploy}
                disabled={!hostname.trim() || !rootPassword || deploying}
                startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
              >
                {deploying ? 'Deploying VDS...' : 'Deploy VDS'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: My VDS Servers                                          */}
      {/* ------------------------------------------------------------------ */}
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant='h5'>
              <i className='tabler-server' style={{ fontSize: 22, marginRight: 8, verticalAlign: 'text-bottom' }} />
              My VDS Servers
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage your active Virtual Dedicated Servers
            </Typography>
          </Box>
          <Chip
            label={`${servers.length} server${servers.length !== 1 ? 's' : ''}`}
            size='small'
            variant='outlined'
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {loadingServers ? (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Hostname', 'IP Address', 'OS', 'Status', 'CPU', 'RAM', 'Disk', 'Actions'].map((h) => (
                      <TableCell key={h}>
                        <Typography variant='subtitle2' fontWeight={600}>{h}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <TableCell key={j}><Skeleton width={j === 8 ? 100 : 80} /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ) : servers.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Avatar sx={{ bgcolor: 'action.hover', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <i className='tabler-server-off' style={{ fontSize: 40, opacity: 0.5 }} />
                </Avatar>
                <Typography variant='h6' color='text.secondary' sx={{ mt: 1 }}>
                  No VDS servers yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                  Order your first Virtual Dedicated Server above to get started with guaranteed dedicated resources.
                </Typography>
                <Button
                  variant='outlined'
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  startIcon={<i className='tabler-arrow-up' />}
                >
                  Order VDS Above
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Hostname</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>IP Address</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>OS</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Status</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>CPU</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>RAM</Typography></TableCell>
                    <TableCell><Typography variant='subtitle2' fontWeight={600}>Disk</Typography></TableCell>
                    <TableCell align='right'><Typography variant='subtitle2' fontWeight={600}>Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {servers.map((server) => (
                    <TableRow key={server.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <i className='tabler-cpu' style={{ fontSize: 16, color: '#fff' }} />
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={600}>
                              {server.hostname || 'Unnamed Server'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {server.planName || 'VDS'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {server.ipAddress || 'Pending'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.os || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<i className='tabler-circle-filled' style={{ fontSize: 8 }} />}
                          label={getStatusLabel(server.status)}
                          color={statusColorMap[server.status] || 'default'}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.cpu || '-'} vCPU</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.ram || '-'} GB</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{server.disk || '-'} GB</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title='Start'>
                            <span>
                              <IconButton
                                size='small'
                                color='success'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'start')}
                              >
                                {actionLoading === `${server.id}-start` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-player-play' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Stop'>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'stop')}
                              >
                                {actionLoading === `${server.id}-stop` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-player-stop' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Restart'>
                            <span>
                              <IconButton
                                size='small'
                                color='warning'
                                disabled={!!actionLoading}
                                onClick={() => handlePowerAction(server.id, 'restart')}
                              >
                                {actionLoading === `${server.id}-restart` ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <i className='tabler-refresh' style={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />
                          <Button
                            size='small'
                            variant='outlined'
                            onClick={() => router.push(`/vps/${server.id}`)}
                            startIcon={<i className='tabler-settings' style={{ fontSize: 16 }} />}
                          >
                            Manage
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Grid>
    </Grid>
  )
}

export default VDSPage
