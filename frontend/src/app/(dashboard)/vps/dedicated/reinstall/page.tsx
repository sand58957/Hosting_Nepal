'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  planName: string
  os: string
  type: string
}

const osOptions = [
  { name: 'Ubuntu 22.04 LTS', icon: 'tabler-brand-ubuntu', category: 'Linux' },
  { name: 'Ubuntu 24.04 LTS', icon: 'tabler-brand-ubuntu', category: 'Linux' },
  { name: 'Debian 12', icon: 'tabler-brand-debian', category: 'Linux' },
  { name: 'CentOS 9 Stream', icon: 'tabler-brand-centos', category: 'Linux' },
  { name: 'AlmaLinux 9', icon: 'tabler-server', category: 'Linux' },
  { name: 'Rocky Linux 9', icon: 'tabler-server', category: 'Linux' },
  { name: 'Windows Server 2022', icon: 'tabler-brand-windows', category: 'Windows' },
  { name: 'Windows Server 2019', icon: 'tabler-brand-windows', category: 'Windows' },
  { name: 'Proxmox VE', icon: 'tabler-box', category: 'Virtualization' },
  { name: 'VMware ESXi', icon: 'tabler-box', category: 'Virtualization' },
]

const DedicatedReinstallPage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedOs, setSelectedOs] = useState('')
  const [confirmDataLoss, setConfirmDataLoss] = useState(false)
  const [reinstalling, setReinstalling] = useState(false)
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

  const currentServer = servers.find((s) => s.id === selectedServer)

  const handleReinstall = async () => {
    if (!selectedServer || !selectedOs || !confirmDataLoss) return
    setReinstalling(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/reinstall`, { os: selectedOs })
      setSuccess('OS reinstallation initiated. This process may take 15-30 minutes. You will receive an email when complete.')
      setConfirmDataLoss(false)
      setSelectedOs('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reinstall OS. Please try again.')
    } finally {
      setReinstalling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'warning.main', width: 44, height: 44 }}>
            <i className='tabler-refresh' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Reinstall Operating System</Typography>
            <Typography variant='body2' color='text.secondary'>
              Reinstall the OS on your dedicated server with a fresh installation
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
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedOs(''); setConfirmDataLoss(false) }}
                fullWidth
              >
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname || s.id} - Current OS: {s.os || 'Unknown'}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {currentServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Current Server</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>Hostname</Typography>
                <Typography variant='body2' fontWeight={600}>{currentServer.hostname}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>Current OS</Typography>
                <Typography variant='body2'>{currentServer.os || 'Unknown'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Plan</Typography>
                <Typography variant='body2'>{currentServer.planName || 'Dedicated'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* OS Selection Grid */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Typography variant='h6' sx={{ mb: 3 }}>Select Operating System</Typography>
          <Grid container spacing={2}>
            {osOptions.map((osOpt) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={osOpt.name}>
                <Card
                  variant='outlined'
                  sx={{
                    cursor: 'pointer',
                    border: selectedOs === osOpt.name ? 2 : 1,
                    borderColor: selectedOs === osOpt.name ? 'primary.main' : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                  }}
                  onClick={() => setSelectedOs(osOpt.name)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3, px: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor: selectedOs === osOpt.name ? 'primary.main' : 'action.hover',
                        width: 48,
                        height: 48,
                        mx: 'auto',
                        mb: 1.5,
                      }}
                    >
                      <i className={osOpt.icon} style={{ fontSize: 24, color: selectedOs === osOpt.name ? '#fff' : undefined }} />
                    </Avatar>
                    <Typography variant='body2' fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                      {osOpt.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {osOpt.category}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}

      {/* Confirmation */}
      {selectedOs && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              <Alert severity='error' sx={{ mb: 3 }} icon={<i className='tabler-alert-triangle' style={{ fontSize: 20 }} />}>
                <Typography variant='subtitle2' fontWeight={600}>Warning: All Data Will Be Lost</Typography>
                <Typography variant='body2'>
                  Reinstalling the operating system will erase ALL data on this server. This action cannot be undone.
                  Make sure you have backed up all important data before proceeding.
                </Typography>
              </Alert>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmDataLoss}
                    onChange={(e) => setConfirmDataLoss(e.target.checked)}
                    color='error'
                  />
                }
                label='I understand that all data on this server will be permanently deleted'
                sx={{ mb: 3 }}
              />

              <Button
                variant='contained'
                color='error'
                size='large'
                fullWidth
                onClick={handleReinstall}
                disabled={!confirmDataLoss || reinstalling}
                startIcon={reinstalling ? <CircularProgress size={20} /> : <i className='tabler-refresh' />}
              >
                {reinstalling ? 'Reinstalling OS...' : `Reinstall with ${selectedOs}`}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DedicatedReinstallPage
