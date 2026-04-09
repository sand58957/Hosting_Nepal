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
import Switch from '@mui/material/Switch'
import Skeleton from '@mui/material/Skeleton'
import Avatar from '@mui/material/Avatar'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  os: string
}

const osOptions = [
  { name: 'Ubuntu 22.04', icon: 'tabler-brand-ubuntu' },
  { name: 'Ubuntu 24.04', icon: 'tabler-brand-ubuntu' },
  { name: 'Debian 12', icon: 'tabler-brand-debian' },
  { name: 'CentOS 9', icon: 'tabler-brand-centos' },
  { name: 'AlmaLinux 9', icon: 'tabler-server' },
  { name: 'Rocky Linux 9', icon: 'tabler-server' },
  { name: 'Windows Server 2022', icon: 'tabler-brand-windows' },
]

const VPSReinstallPage = () => {
  const [servers, setServers] = useState<VPSServer[]>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedOs, setSelectedOs] = useState('')
  const [confirmErase, setConfirmErase] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reinstalling, setReinstalling] = useState(false)

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

  const currentServer = servers.find((s) => s.id === selectedServer)

  const handleReinstall = async () => {
    if (!selectedServer || !selectedOs || !confirmErase) return
    setReinstalling(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/reinstall`, { os: selectedOs })
      setConfirmErase(false)
      setSelectedOs('')
    } catch {
      // silently handle
    } finally {
      setReinstalling(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Reinstall OS</Typography>
          <Typography variant='body2' color='text.secondary'>
            Reinstall the operating system on your VPS
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
                onChange={(e) => { setSelectedServer(e.target.value); setSelectedOs(''); setConfirmErase(false) }}
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

      {currentServer && (
        <>
          <Grid size={{ xs: 12 }}>
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='subtitle2' color='text.secondary'>Current Operating System</Typography>
                <Typography variant='h6' sx={{ mt: 1 }}>
                  <i className='tabler-brand-ubuntu' style={{ fontSize: 18, marginRight: 8 }} />
                  {currentServer.os || 'Unknown'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Alert severity='error' variant='filled' sx={{ mb: 2 }}>
              WARNING: This will ERASE all data on the server! Make sure you have backups.
            </Alert>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Select New Operating System</Typography>
            <Grid container spacing={3}>
              {osOptions.map((os) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={os.name}>
                  <Card
                    variant='outlined'
                    sx={{
                      cursor: 'pointer',
                      border: selectedOs === os.name ? 2 : 1,
                      borderColor: selectedOs === os.name ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedOs(os.name)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ bgcolor: selectedOs === os.name ? 'primary.main' : 'action.hover', width: 48, height: 48, mx: 'auto', mb: 1 }}>
                        <i className={os.icon} style={{ fontSize: 24, color: selectedOs === os.name ? '#fff' : undefined }} />
                      </Avatar>
                      <Typography variant='body2' fontWeight={500}>{os.name}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {selectedOs && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Switch
                      checked={confirmErase}
                      onChange={(e) => setConfirmErase(e.target.checked)}
                      color='error'
                    />
                    <Typography variant='body1'>
                      I understand all data will be lost and want to reinstall with <strong>{selectedOs}</strong>
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    color='error'
                    size='large'
                    fullWidth
                    onClick={handleReinstall}
                    disabled={!confirmErase || reinstalling}
                    startIcon={reinstalling ? <CircularProgress size={20} /> : <i className='tabler-refresh' />}
                  >
                    {reinstalling ? 'Reinstalling...' : 'Reinstall OS'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

export default VPSReinstallPage
