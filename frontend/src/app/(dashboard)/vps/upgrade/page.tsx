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
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  planName: string
  planType: string
  status: string
  ipAddress: string | null
}

interface UpgradePlan {
  id: string
  name: string
  cpu: number
  ram: number
  disk: number
  price: number
}

const VPSUpgradePage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [plans, setPlans] = useState<UpgradePlan[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [hostingRes, plansRes] = await Promise.all([
          api.get('/hosting'),
          api.get('/hosting/plans'),
        ])

        const rawH = hostingRes.data?.data?.data ?? hostingRes.data?.data ?? hostingRes.data
        const list = Array.isArray(rawH) ? rawH : rawH?.data ?? []
        // HostingAccount rows: VPS/VDS orders are stored with planType 'VPS'
        setServers(
          (Array.isArray(list) ? list : []).filter(
            (h: any) => h.planType === 'VPS' && (h.status === 'ACTIVE' || h.status === 'PROVISIONING'),
          ),
        )

        const rawP = plansRes.data?.data ?? plansRes.data
        const planList = Array.isArray(rawP) ? rawP : rawP?.data ?? []
        setPlans(
          (Array.isArray(planList) ? planList : [])
            .filter((p: any) => p.type === 'VPS' || p.type === 'VDS')
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              cpu: p.specs?.cpuCores || 0,
              ram: p.specs?.ramGB || 0,
              disk: p.specs?.diskGB || 0,
              price: p.priceMonthly || 0,
            })),
        )
      } catch {
        setServers([])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const currentServer = servers.find((s) => s.id === selectedServer)
  const currentPlan = plans.find((p) => p.name === currentServer?.planName)
  const availablePlans = plans.filter((p) => p.price > (currentPlan?.price ?? 0))

  const handleUpgrade = async () => {
    if (!selectedServer || !selectedPlan) return
    setError(null)
    setUpgrading(true)
    try {
      const res = await api.post(`/hosting/vps/${selectedServer}/upgrade`, {
        newPlanId: selectedPlan.id,
      })
      const d = res.data?.data ?? res.data
      setSuccessMsg(
        d?.message ||
          'Upgrade request submitted. An administrator will apply it shortly — your server keeps running until then.',
      )
      setSelectedPlan(null)
    } catch (e: any) {
      const msg = e?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Upgrade request failed. Please try again.')
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

      {successMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
        </Grid>
      )}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loading ? (
              <Skeleton variant='rectangular' height={56} />
            ) : servers.length === 0 ? (
              <Alert severity='info'>
                You don’t have any active VPS yet. Order one under <strong>Order New VPS</strong> first.
              </Alert>
            ) : (
              <CustomTextField
                select
                label='Select Server'
                value={selectedServer}
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedPlan(null); setSuccessMsg(null) }}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.planName} {s.ipAddress ? `— ${s.ipAddress}` : ''} ({s.status})
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
                <Typography variant='h5' sx={{ mb: 2 }}>{currentServer.planName}</Typography>
                <Divider sx={{ my: 2 }} />
                {currentPlan ? (
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant='body2' sx={{ mb: 0.5 }}>
                      <i className='tabler-cpu' style={{ fontSize: 14, marginRight: 6 }} />
                      {currentPlan.cpu} vCPU
                    </Typography>
                    <Typography variant='body2' sx={{ mb: 0.5 }}>
                      <i className='tabler-device-desktop-analytics' style={{ fontSize: 14, marginRight: 6 }} />
                      {currentPlan.ram} GB RAM
                    </Typography>
                    <Typography variant='body2' sx={{ mb: 0.5 }}>
                      <i className='tabler-database' style={{ fontSize: 14, marginRight: 6 }} />
                      {currentPlan.disk} GB SSD
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant='body2' color='text.secondary'>Plan details unavailable</Typography>
                )}
                <Typography variant='h6' color='primary.main' sx={{ mt: 2 }}>
                  NPR {(currentPlan?.price ?? 0).toLocaleString()}/mo
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
                        <Chip
                          label={`+NPR ${(plan.price - (currentPlan?.price ?? 0)).toLocaleString()}/mo`}
                          size='small'
                          color='info'
                          sx={{ mt: 1 }}
                        />
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
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Plan upgrades are applied by our team (a brief restart may be required).
                    Your request goes to an administrator and your server keeps running until the upgrade is applied.
                  </Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant='body1'>
                        Upgrading <strong>{currentServer.planName}</strong> → <strong>{selectedPlan.name}</strong>
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Price difference: NPR {(selectedPlan.price - (currentPlan?.price ?? 0)).toLocaleString()}/mo
                      </Typography>
                    </Box>
                    <Button
                      variant='contained'
                      size='large'
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      startIcon={upgrading ? <CircularProgress size={20} /> : <i className='tabler-arrow-up' />}
                    >
                      {upgrading ? 'Submitting...' : 'Request Upgrade'}
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
