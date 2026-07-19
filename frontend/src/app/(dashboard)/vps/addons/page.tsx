'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
}

interface Addon {
  id: string
  // Backend AddAddonDto enum value (POST { addonType }, GET returns { type })
  addonType: string
  name: string
  description: string
  price: number
  icon: string
}

// Add-on records as stored/returned by the backend (id is backend-generated).
interface ActiveAddon {
  id: string
  type: string
}

const availableAddons: Addon[] = [
  { id: 'extra-ipv4', addonType: 'ipv4', name: 'Extra IPv4 Address', description: 'Additional dedicated IPv4 address for your server', price: 299, icon: 'tabler-network' },
  { id: 'ddos-protection', addonType: 'ddos', name: 'DDoS Protection', description: 'Enterprise-grade DDoS mitigation up to 1Tbps', price: 499, icon: 'tabler-shield-check' },
  { id: 'auto-backups', addonType: 'backup', name: 'Automatic Backups', description: 'Daily automated backups with 7-day retention', price: 399, icon: 'tabler-cloud-upload' },
  { id: 'monitoring', addonType: 'monitoring', name: 'Monitoring & Alerts', description: 'Real-time monitoring with email and SMS alerts', price: 199, icon: 'tabler-activity' },
  { id: 'windows-license', addonType: 'windows', name: 'Windows License', description: 'Windows Server license for your VPS', price: 1499, icon: 'tabler-brand-windows' },
  { id: 'cpanel', addonType: 'cpanel', name: 'cPanel/WHM', description: 'cPanel/WHM control panel for web hosting management', price: 2499, icon: 'tabler-layout-dashboard' },
  { id: 'plesk', addonType: 'plesk', name: 'Plesk', description: 'Plesk control panel with WordPress toolkit', price: 999, icon: 'tabler-server' },
]

const VPSAddonsPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeAddons, setActiveAddons] = useState<ActiveAddon[]>([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vpsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.planType === 'VPS'
        )
        setServers(vpsList)
      } catch (err) {
        console.error('Failed to fetch servers:', err)
        setServers([])
      } finally {
        setLoading(false)
      }
    }
    fetchServers()
  }, [])

  // Load the active add-ons for the selected server from the backend. Add-ons
  // are stored with backend-generated ids, so the source of truth is this GET.
  useEffect(() => {
    if (!selectedServer) {
      setActiveAddons([])
      return
    }
    const fetchAddons = async () => {
      setError('')
      try {
        const res = await api.get(`/hosting/vps/${selectedServer}/addons`)
        const data = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(data) ? data : data?.addons ?? []
        setActiveAddons(
          (Array.isArray(list) ? list : []).map((a: any) => ({ id: a.id, type: a.type }))
        )
      } catch (err: any) {
        setActiveAddons([])
        setError(err?.response?.data?.message || 'Failed to load active add-ons.')
      }
    }
    fetchAddons()
  }, [selectedServer])

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    setSuccess('')
    setError('')
  }

  const handleAddAddon = async (addon: Addon) => {
    if (!selectedServer) return
    setActionLoading(addon.id)
    setSuccess('')
    setError('')
    try {
      const res = await api.post(`/hosting/vps/${selectedServer}/addons`, { addonType: addon.addonType })
      const addonId = res.data?.data?.data?.addonId ?? res.data?.data?.addonId ?? res.data?.addonId
      if (addonId) {
        setActiveAddons((prev) => [...prev, { id: addonId, type: addon.addonType }])
      } else {
        // POST didn't surface an id at a known path — re-fetch so the new row carries
        // a real id (otherwise a later Remove would DELETE /addons/undefined).
        try {
          const listRes = await api.get(`/hosting/vps/${selectedServer}/addons`)
          const d = listRes.data?.data?.data ?? listRes.data?.data ?? listRes.data
          const arr = Array.isArray(d) ? d : d?.addons ?? []
          setActiveAddons((Array.isArray(arr) ? arr : []).map((a: any) => ({ id: a.id, type: a.type })))
        } catch { /* leave the list unchanged */ }
      }
      setSuccess(`${addon.name} added successfully.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to add ${addon.name}.`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveAddon = async (active: ActiveAddon, addon: Addon) => {
    if (!selectedServer) return
    setActionLoading(addon.id)
    setSuccess('')
    setError('')
    try {
      await api.delete(`/hosting/vps/${selectedServer}/addons/${active.id}`)
      setActiveAddons((prev) => prev.filter((a) => a.id !== active.id))
      setSuccess(`${addon.name} removed successfully.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to remove ${addon.name}.`)
    } finally {
      setActionLoading(null)
    }
  }

  // Find the backend record (if any) for a given available add-on by its enum type.
  const findActive = (addon: Addon) => activeAddons.find((a) => a.type === addon.addonType)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Add-Ons</Typography>
          <Typography variant='body2' color='text.secondary'>
            Enhance your VPS with additional services
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
                onChange={(e) => handleServerChange(e.target.value)}
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

      {selectedServer && (
        <>
          {success && (
            <Grid size={{ xs: 12 }}>
              <Alert severity='success' onClose={() => setSuccess('')}>{success}</Alert>
            </Grid>
          )}
          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity='error' onClose={() => setError('')}>{error}</Alert>
            </Grid>
          )}

          {/* Available Add-ons */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Available Add-Ons</Typography>
            <Grid container spacing={3}>
              {availableAddons.map((addon) => {
                const active = findActive(addon)
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={addon.id}>
                    <Card variant='outlined' sx={{ height: '100%', position: 'relative' }}>
                      {active && (
                        <Chip
                          label='Active'
                          color='success'
                          size='small'
                          sx={{ position: 'absolute', top: 12, right: 12 }}
                        />
                      )}
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Avatar sx={{ bgcolor: active ? 'success.main' : 'action.hover', width: 48, height: 48, mb: 2 }}>
                          <i className={addon.icon} style={{ fontSize: 24, color: active ? '#fff' : undefined }} />
                        </Avatar>
                        <Typography variant='h6' sx={{ mb: 0.5 }}>{addon.name}</Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 2, flex: 1 }}>
                          {addon.description}
                        </Typography>
                        <Typography variant='h6' color='primary.main' sx={{ mb: 2 }}>
                          NPR {addon.price.toLocaleString()}/mo
                        </Typography>
                        {active ? (
                          <Button
                            variant='outlined'
                            color='error'
                            fullWidth
                            onClick={() => handleRemoveAddon(active, addon)}
                            disabled={actionLoading === addon.id}
                            startIcon={actionLoading === addon.id ? <CircularProgress size={16} /> : <i className='tabler-trash' />}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant='contained'
                            fullWidth
                            onClick={() => handleAddAddon(addon)}
                            disabled={actionLoading === addon.id}
                            startIcon={actionLoading === addon.id ? <CircularProgress size={16} /> : <i className='tabler-plus' />}
                          >
                            Add
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Grid>

          {/* Active Add-ons Summary */}
          {activeAddons.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' sx={{ mb: 2 }}>Active Add-Ons</Typography>
                  <Divider sx={{ mb: 2 }} />
                  {activeAddons.map((active) => {
                    const addon = availableAddons.find((a) => a.addonType === active.type)
                    if (!addon) return null
                    return (
                      <Box key={active.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <i className={addon.icon} style={{ fontSize: 20 }} />
                          <Typography variant='body1'>{addon.name}</Typography>
                        </Box>
                        <Typography variant='body1' fontWeight={500}>
                          NPR {addon.price.toLocaleString()}/mo
                        </Typography>
                      </Box>
                    )
                  })}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='h6'>Total Add-Ons Cost</Typography>
                    <Typography variant='h6' color='primary.main'>
                      NPR {activeAddons.reduce((sum, active) => {
                        const addon = availableAddons.find((a) => a.addonType === active.type)
                        return sum + (addon?.price || 0)
                      }, 0).toLocaleString()}/mo
                    </Typography>
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

export default VPSAddonsPage
