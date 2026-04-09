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

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  activeAddons?: string[]
}

interface Addon {
  id: string
  name: string
  description: string
  price: number
  icon: string
}

const availableAddons: Addon[] = [
  { id: 'extra-ipv4', name: 'Extra IPv4 Address', description: 'Additional dedicated IPv4 address for your server', price: 299, icon: 'tabler-network' },
  { id: 'ddos-protection', name: 'DDoS Protection', description: 'Enterprise-grade DDoS mitigation up to 1Tbps', price: 499, icon: 'tabler-shield-check' },
  { id: 'auto-backups', name: 'Automatic Backups', description: 'Daily automated backups with 7-day retention', price: 399, icon: 'tabler-cloud-upload' },
  { id: 'monitoring', name: 'Monitoring & Alerts', description: 'Real-time monitoring with email and SMS alerts', price: 199, icon: 'tabler-activity' },
  { id: 'windows-license', name: 'Windows License', description: 'Windows Server license for your VPS', price: 1499, icon: 'tabler-brand-windows' },
  { id: 'cpanel', name: 'cPanel/WHM', description: 'cPanel/WHM control panel for web hosting management', price: 2499, icon: 'tabler-layout-dashboard' },
  { id: 'plesk', name: 'Plesk', description: 'Plesk control panel with WordPress toolkit', price: 999, icon: 'tabler-server' },
]

const VPSAddonsPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeAddons, setActiveAddons] = useState<string[]>([])

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

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    const server = servers.find((s) => s.id === serverId)
    setActiveAddons(server?.activeAddons || [])
  }

  const handleAddAddon = async (addonId: string) => {
    if (!selectedServer) return
    setActionLoading(addonId)
    try {
      await api.post(`/hosting/vps/${selectedServer}/addons`, { addonId })
      setActiveAddons((prev) => [...prev, addonId])
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveAddon = async (addonId: string) => {
    if (!selectedServer) return
    setActionLoading(addonId)
    try {
      await api.delete(`/hosting/vps/${selectedServer}/addons/${addonId}`)
      setActiveAddons((prev) => prev.filter((a) => a !== addonId))
    } catch {
      // silently handle
    } finally {
      setActionLoading(null)
    }
  }

  const isActive = (addonId: string) => activeAddons.includes(addonId)

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
          {/* Available Add-ons */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Available Add-Ons</Typography>
            <Grid container spacing={3}>
              {availableAddons.map((addon) => {
                const active = isActive(addon.id)
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
                            onClick={() => handleRemoveAddon(addon.id)}
                            disabled={actionLoading === addon.id}
                            startIcon={actionLoading === addon.id ? <CircularProgress size={16} /> : <i className='tabler-trash' />}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant='contained'
                            fullWidth
                            onClick={() => handleAddAddon(addon.id)}
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
                  {activeAddons.map((addonId) => {
                    const addon = availableAddons.find((a) => a.id === addonId)
                    if (!addon) return null
                    return (
                      <Box key={addonId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
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
                      NPR {activeAddons.reduce((sum, id) => {
                        const addon = availableAddons.find((a) => a.id === id)
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
