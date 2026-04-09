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
  type: string
  addons?: { id: string; name: string; price: number }[]
}

const availableAddons = [
  { id: 'ipv4', name: 'Additional IPv4', description: 'Extra dedicated IPv4 address for your server', price: 597, category: 'Network' },
  { id: 'cpanel-solo', name: 'cPanel Solo', description: 'cPanel license for single account management', price: 2991, category: 'Control Panel' },
  { id: 'cpanel-admin', name: 'cPanel Admin', description: 'cPanel Admin license for up to 5 accounts', price: 2991, category: 'Control Panel' },
  { id: 'cpanel-pro', name: 'cPanel Pro', description: 'cPanel Pro license for up to 30 accounts', price: 3989, category: 'Control Panel' },
  { id: 'cpanel-plus', name: 'cPanel Plus', description: 'cPanel Plus license for up to 50 accounts', price: 5984, category: 'Control Panel' },
  { id: 'cpanel-premier', name: 'cPanel Premier', description: 'cPanel Premier license for up to 100 accounts', price: 7981, category: 'Control Panel' },
  { id: 'plesk-admin', name: 'Plesk Web Admin', description: 'Plesk Web Admin for up to 10 domains', price: 1554, category: 'Control Panel' },
  { id: 'plesk-pro', name: 'Plesk Web Pro', description: 'Plesk Web Pro for up to 30 domains', price: 2293, category: 'Control Panel' },
  { id: 'plesk-host', name: 'Plesk Web Host', description: 'Plesk Web Host for unlimited domains', price: 3790, category: 'Control Panel' },
  { id: 'whmcs', name: 'WHMCS', description: 'WHMCS billing and automation platform license', price: 1256, category: 'Billing' },
  { id: 'managed', name: 'Managed Services', description: 'Full server management: monitoring, updates, security, and 24/7 support', price: 14963, category: 'Services' },
  { id: 'cpanel-blocks', name: 'cPanel Blocks', description: 'Additional cPanel account blocks (100 accounts)', price: 2991, category: 'Control Panel' },
]

const categoryIcons: Record<string, string> = {
  Network: 'tabler-network',
  'Control Panel': 'tabler-layout-dashboard',
  Billing: 'tabler-receipt',
  Services: 'tabler-headset',
}

const DedicatedAddonsPage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [activeAddons, setActiveAddons] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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

    fetchServers()
  }, [])

  useEffect(() => {
    if (!selectedServer) { setActiveAddons([]); return }
    const fetchAddons = async () => {
      try {
        const res = await api.get(`/hosting/vps/${selectedServer}/addons`)
        const data = res.data?.data?.data ?? res.data?.data ?? res.data
        const addons = Array.isArray(data) ? data : data?.addons ?? []
        setActiveAddons(addons.map((a: any) => a.id || a.addonId || a.name))
      } catch {
        setActiveAddons([])
      }
    }

    fetchAddons()
  }, [selectedServer])

  const handleToggleAddon = async (addonId: string) => {
    if (!selectedServer) return
    const isActive = activeAddons.includes(addonId)
    setActionLoading(addonId)
    setError('')
    setSuccess('')
    try {
      if (isActive) {
        await api.delete(`/hosting/vps/${selectedServer}/addons/${addonId}`)
        setActiveAddons((prev) => prev.filter((id) => id !== addonId))
        setSuccess('Add-on removed successfully.')
      } else {
        await api.post(`/hosting/vps/${selectedServer}/addons`, { addonId })
        setActiveAddons((prev) => [...prev, addonId])
        setSuccess('Add-on added successfully.')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${isActive ? 'remove' : 'add'} add-on.`)
    } finally {
      setActionLoading(null)
    }
  }

  const categories = [...new Set(availableAddons.map((a) => a.category))]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-puzzle' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Add-Ons & Licenses</Typography>
            <Typography variant='body2' color='text.secondary'>
              Enhance your dedicated server with software licenses and add-on services
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
              <Alert severity='info'>No dedicated servers found.</Alert>
            ) : (
              <CustomTextField
                select
                label='Dedicated Server'
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
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

      {/* Active Addons */}
      {selectedServer && activeAddons.length > 0 && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Active Add-Ons</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {activeAddons.map((addonId) => {
                  const addon = availableAddons.find((a) => a.id === addonId)
                  return (
                    <Chip
                      key={addonId}
                      label={addon?.name || addonId}
                      color='primary'
                      variant='outlined'
                      icon={<i className='tabler-check' style={{ fontSize: 14 }} />}
                    />
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Available Addons by Category */}
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

          {categories.map((category) => (
            <Grid size={{ xs: 12 }} key={category}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <i className={categoryIcons[category] || 'tabler-package'} style={{ fontSize: 20 }} />
                <Typography variant='h6'>{category}</Typography>
              </Box>
              <Grid container spacing={3}>
                {availableAddons
                  .filter((a) => a.category === category)
                  .map((addon) => {
                    const isActive = activeAddons.includes(addon.id)
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={addon.id}>
                        <Card
                          variant='outlined'
                          sx={{
                            border: isActive ? 2 : 1,
                            borderColor: isActive ? 'primary.main' : 'divider',
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant='subtitle1' fontWeight={600}>{addon.name}</Typography>
                              {isActive && <Chip label='Active' color='primary' size='small' />}
                            </Box>
                            <Typography variant='body2' color='text.secondary' sx={{ mb: 2, minHeight: 40 }}>
                              {addon.description}
                            </Typography>
                            <Typography variant='h5' color='primary.main' sx={{ mb: 2 }}>
                              NPR {addon.price.toLocaleString()}
                              <Typography variant='caption' color='text.secondary'>/mo</Typography>
                            </Typography>
                            <Button
                              variant={isActive ? 'outlined' : 'contained'}
                              color={isActive ? 'error' : 'primary'}
                              fullWidth
                              onClick={() => handleToggleAddon(addon.id)}
                              disabled={actionLoading === addon.id}
                              startIcon={actionLoading === addon.id ? <CircularProgress size={16} /> : <i className={isActive ? 'tabler-minus' : 'tabler-plus'} />}
                            >
                              {actionLoading === addon.id ? 'Processing...' : isActive ? 'Remove' : 'Add'}
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  })}
              </Grid>
            </Grid>
          ))}
        </>
      )}
    </Grid>
  )
}

export default DedicatedAddonsPage
