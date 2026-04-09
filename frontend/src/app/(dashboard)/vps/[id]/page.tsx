'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'
import Switch from '@mui/material/Switch'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import FormControlLabel from '@mui/material/FormControlLabel'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VPSDetail {
  id: string
  hostname: string
  displayName: string
  hostSystem: string
  region: string
  ipAddress: string
  ipv6Address: string
  os: string
  status: string
  planName: string
  cpu: number
  ram: number
  disk: number
  createdAt: string
  terminationDate: string
  contractPeriod: string
  monthlyPrice: number
  vncEnabled: boolean
  vncHost: string
  vncPort: number
  vncPassword: string
  defaultUser: string
  applications: string
  rescueMode: boolean
  reverseDns: string
  cpuUsage: number
  ramUsage: number
  diskUsage: number
  bandwidth: number
  uptime: string
}

interface Snapshot {
  id: string
  name: string
  description: string
  createdAt: string
  size: string
  status: string
}

interface FirewallRule {
  id: string
  direction: 'inbound' | 'outbound'
  protocol: string
  port: string
  source: string
  action: 'allow' | 'deny'
}

interface DnsRecord {
  id: string
  type: string
  name: string
  value: string
  ttl: number
}

interface AdditionalIP {
  id: string
  address: string
  version: 'IPv4' | 'IPv6'
  rdns: string
}

interface LicenseItem {
  id: string
  name: string
  type: string
  price: number
  status: string
}

interface BackupItem {
  id: string
  createdAt: string
  size: string
  status: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const osOptions = [
  { label: 'Ubuntu 22.04 LTS', value: 'ubuntu-22.04', icon: 'tabler-brand-ubuntu' },
  { label: 'Ubuntu 24.04 LTS', value: 'ubuntu-24.04', icon: 'tabler-brand-ubuntu' },
  { label: 'Debian 12', value: 'debian-12', icon: 'tabler-brand-debian' },
  { label: 'CentOS 9 Stream', value: 'centos-9', icon: 'tabler-brand-centos' },
  { label: 'AlmaLinux 9', value: 'almalinux-9', icon: 'tabler-server' },
  { label: 'Rocky Linux 9', value: 'rocky-9', icon: 'tabler-server' },
  { label: 'Windows Server 2022', value: 'windows-2022', icon: 'tabler-brand-windows' },
  { label: 'Fedora 39', value: 'fedora-39', icon: 'tabler-brand-redhat' },
]

const licenseOptions = [
  { label: 'cPanel/WHM', price: 1999, type: 'cpanel' },
  { label: 'Plesk Web Admin', price: 1499, type: 'plesk-admin' },
  { label: 'Plesk Web Pro', price: 2999, type: 'plesk-pro' },
  { label: 'Windows Server License', price: 3499, type: 'windows' },
  { label: 'CloudLinux', price: 1299, type: 'cloudlinux' },
  { label: 'LiteSpeed Web Server', price: 999, type: 'litespeed' },
]

const unwrap = (res: any) => res.data?.data?.data ?? res.data?.data ?? res.data

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VPSDetailPage = () => {
  const params = useParams()
  const serverId = params.id as string

  // Core state
  const [server, setServer] = useState<VPSDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // More actions menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  // Snapshots
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')

  // Reinstall dialog
  const [reinstallDialogOpen, setReinstallDialogOpen] = useState(false)
  const [selectedOs, setSelectedOs] = useState('')
  const [reinstallConfirm, setReinstallConfirm] = useState(false)

  // Reset password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Change display name dialog
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')

  // Rescue mode dialog
  const [rescueDialogOpen, setRescueDialogOpen] = useState(false)

  // VNC dialog
  const [vncDialogOpen, setVncDialogOpen] = useState(false)
  const [vncInfo, setVncInfo] = useState<any>(null)

  // Auto backup
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [backupSchedule, setBackupSchedule] = useState('daily')
  const [backupRetention, setBackupRetention] = useState('7')
  const [backups, setBackups] = useState<BackupItem[]>([])

  // Firewall
  const [firewallEnabled, setFirewallEnabled] = useState(false)
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([])
  const [firewallDialogOpen, setFirewallDialogOpen] = useState(false)
  const [newRule, setNewRule] = useState<Omit<FirewallRule, 'id'>>({
    direction: 'inbound',
    protocol: 'tcp',
    port: '',
    source: '0.0.0.0/0',
    action: 'allow',
  })

  // DNS
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false)
  const [newDns, setNewDns] = useState<Omit<DnsRecord, 'id'>>({
    type: 'A',
    name: '',
    value: '',
    ttl: 3600,
  })

  // Additional IPs
  const [additionalIps, setAdditionalIps] = useState<AdditionalIP[]>([])

  // Licenses
  const [licenses, setLicenses] = useState<LicenseItem[]>([])
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState('')

  // Images
  const [images, setImages] = useState<any[]>([])

  // Private network
  const [privateNetworkEnabled, setPrivateNetworkEnabled] = useState(false)
  const [privateIp, setPrivateIp] = useState('')
  const [vlanId, setVlanId] = useState('')

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchServer = useCallback(async () => {
    try {
      const res = await api.get(`/hosting/vps/${serverId}`)
      const raw = unwrap(res)
      setServer(raw)
      setNewDisplayName(raw?.displayName || raw?.hostname || '')
      setSelectedOs(raw?.os || '')
      setAutoBackupEnabled(raw?.autoBackup || false)
      setFirewallEnabled(raw?.firewallEnabled || false)
      setPrivateNetworkEnabled(raw?.privateNetwork || false)
      setPrivateIp(raw?.privateIp || '')
      setVlanId(raw?.vlanId || '')
    } catch {
      // handled by loading state
    } finally {
      setLoading(false)
    }
  }, [serverId])

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await api.get(`/hosting/vps/${serverId}/snapshots`)
      const raw = unwrap(res)
      const list = Array.isArray(raw) ? raw : raw?.snapshots ?? raw?.data ?? []
      setSnapshots(Array.isArray(list) ? list : [])
    } catch {
      setSnapshots([])
    }
  }, [serverId])

  const fetchAddons = useCallback(async () => {
    try {
      const res = await api.get(`/hosting/vps/${serverId}/addons`)
      const raw = unwrap(res)
      if (raw?.firewallRules) setFirewallRules(raw.firewallRules)
      if (raw?.dnsRecords) setDnsRecords(raw.dnsRecords)
      if (raw?.additionalIps) setAdditionalIps(raw.additionalIps)
      if (raw?.licenses) setLicenses(raw.licenses)
      if (raw?.backups) setBackups(raw.backups)
      if (raw?.images) setImages(raw.images)
    } catch {
      // silently handle
    }
  }, [serverId])

  useEffect(() => {
    fetchServer()
    fetchSnapshots()
    fetchAddons()
  }, [fetchServer, fetchSnapshots, fetchAddons])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const showSuccess = (msg: string) => {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const showError = (msg: string) => {
    setActionError(msg)
    setTimeout(() => setActionError(null), 5000)
  }

  const formatDate = (d: string | undefined) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatPrice = (p: number | undefined) => {
    if (!p && p !== 0) return 'N/A'
    return `NPR ${p.toLocaleString()}/mo`
  }

  const isOnline = server?.status === 'ACTIVE' || server?.status === 'RUNNING' || server?.status === 'online'

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handlePowerAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action)
    try {
      await api.post(`/hosting/vps/${serverId}/${action}`)
      await fetchServer()
      showSuccess(`Server ${action} command sent successfully.`)
    } catch {
      showError(`Failed to ${action} server.`)
    } finally {
      setActionLoading(null)
    }
  }

  const openVnc = async () => {
    try {
      const res = await api.get(`/hosting/vps/${serverId}/vnc`)
      const raw = unwrap(res)
      setVncInfo(raw)
    } catch {
      setVncInfo({
        host: server?.vncHost || server?.ipAddress,
        port: server?.vncPort || 5900,
        password: server?.vncPassword || '',
      })
    }
    setVncDialogOpen(true)
  }

  const handleRestart = async () => {
    await handlePowerAction('restart')
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  // Reinstall
  const handleReinstall = async () => {
    if (!selectedOs || !reinstallConfirm) return
    setActionLoading('reinstall')
    try {
      await api.post(`/hosting/vps/${serverId}/reinstall`, { os: selectedOs })
      setReinstallDialogOpen(false)
      setReinstallConfirm(false)
      showSuccess('OS reinstallation started. This may take a few minutes.')
      await fetchServer()
    } catch {
      showError('Failed to reinstall OS.')
    } finally {
      setActionLoading(null)
    }
  }

  // Reset password
  const handlePasswordReset = async () => {
    if (!newPassword || newPassword !== confirmPassword) return
    setActionLoading('password')
    try {
      await api.post(`/hosting/vps/${serverId}/password`, { password: newPassword })
      setPasswordDialogOpen(false)
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('Password reset successfully. Server will restart.')
    } catch {
      showError('Failed to reset password.')
    } finally {
      setActionLoading(null)
    }
  }

  // Change display name
  const handleChangeName = async () => {
    if (!newDisplayName.trim()) return
    setActionLoading('name')
    try {
      await api.put(`/hosting/vps/${serverId}`, { displayName: newDisplayName })
      setNameDialogOpen(false)
      showSuccess('Display name updated.')
      await fetchServer()
    } catch {
      showError('Failed to update display name.')
    } finally {
      setActionLoading(null)
    }
  }

  // Rescue mode
  const handleToggleRescue = async () => {
    setActionLoading('rescue')
    const enable = !server?.rescueMode
    try {
      await api.post(`/hosting/vps/${serverId}/rescue`, { enable })
      setRescueDialogOpen(false)
      showSuccess(enable ? 'Rescue mode enabled.' : 'Rescue mode disabled.')
      await fetchServer()
    } catch {
      showError('Failed to toggle rescue mode.')
    } finally {
      setActionLoading(null)
    }
  }

  // Snapshots
  const handleCreateSnapshot = async () => {
    if (!snapshotName.trim()) return
    setActionLoading('snapshot')
    try {
      await api.post(`/hosting/vps/${serverId}/snapshots`, {
        name: snapshotName,
        description: snapshotDescription,
      })
      setSnapshotDialogOpen(false)
      setSnapshotName('')
      setSnapshotDescription('')
      showSuccess('Snapshot creation started.')
      await fetchSnapshots()
    } catch {
      showError('Failed to create snapshot.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteSnapshot = async (snapId: string) => {
    try {
      await api.delete(`/hosting/vps/${serverId}/snapshots/${snapId}`)
      showSuccess('Snapshot deleted.')
      await fetchSnapshots()
    } catch {
      showError('Failed to delete snapshot.')
    }
  }

  const handleRestoreSnapshot = async (snapId: string) => {
    setActionLoading('restore')
    try {
      await api.post(`/hosting/vps/${serverId}/snapshots/${snapId}/restore`)
      showSuccess('Snapshot restore started.')
      await fetchServer()
    } catch {
      showError('Failed to restore snapshot.')
    } finally {
      setActionLoading(null)
    }
  }

  // Auto backup toggle
  const handleToggleAutoBackup = async () => {
    setActionLoading('backup')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, {
        type: 'auto-backup',
        enabled: !autoBackupEnabled,
        schedule: backupSchedule,
        retention: parseInt(backupRetention),
      })
      setAutoBackupEnabled(!autoBackupEnabled)
      showSuccess(autoBackupEnabled ? 'Auto backup disabled.' : 'Auto backup enabled.')
    } catch {
      showError('Failed to update auto backup settings.')
    } finally {
      setActionLoading(null)
    }
  }

  // Firewall
  const handleToggleFirewall = async () => {
    setActionLoading('firewall')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, {
        type: 'firewall',
        enabled: !firewallEnabled,
      })
      setFirewallEnabled(!firewallEnabled)
      showSuccess(firewallEnabled ? 'Firewall disabled.' : 'Firewall enabled.')
    } catch {
      showError('Failed to toggle firewall.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddFirewallRule = async () => {
    if (!newRule.port) return
    setActionLoading('firewall-rule')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, {
        type: 'firewall-rule',
        ...newRule,
      })
      setFirewallDialogOpen(false)
      setNewRule({ direction: 'inbound', protocol: 'tcp', port: '', source: '0.0.0.0/0', action: 'allow' })
      showSuccess('Firewall rule added.')
      await fetchAddons()
    } catch {
      showError('Failed to add firewall rule.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteFirewallRule = async (ruleId: string) => {
    try {
      await api.delete(`/hosting/vps/${serverId}/addons/${ruleId}`)
      showSuccess('Firewall rule deleted.')
      await fetchAddons()
    } catch {
      showError('Failed to delete firewall rule.')
    }
  }

  // DNS
  const handleAddDnsRecord = async () => {
    if (!newDns.name || !newDns.value) return
    setActionLoading('dns')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, {
        addonType: 'dns-record',
        recordType: newDns.type,
        name: newDns.name,
        value: newDns.value,
        ttl: newDns.ttl,
      })
      setDnsDialogOpen(false)
      setNewDns({ type: 'A', name: '', value: '', ttl: 3600 })
      showSuccess('DNS record added.')
      await fetchAddons()
    } catch {
      showError('Failed to add DNS record.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteDnsRecord = async (recordId: string) => {
    try {
      await api.delete(`/hosting/vps/${serverId}/addons/${recordId}`)
      showSuccess('DNS record deleted.')
      await fetchAddons()
    } catch {
      showError('Failed to delete DNS record.')
    }
  }

  // Additional IPs
  const handleRequestAdditionalIp = async () => {
    setActionLoading('ip')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, { type: 'additional-ip' })
      showSuccess('Additional IP requested. It will be provisioned shortly.')
      await fetchAddons()
    } catch {
      showError('Failed to request additional IP.')
    } finally {
      setActionLoading(null)
    }
  }

  // Licenses
  const handleAddLicense = async () => {
    if (!selectedLicense) return
    setActionLoading('license')
    try {
      await api.post(`/hosting/vps/${serverId}/addons`, {
        type: 'license',
        licenseType: selectedLicense,
      })
      setLicenseDialogOpen(false)
      setSelectedLicense('')
      showSuccess('License added successfully.')
      await fetchAddons()
    } catch {
      showError('Failed to add license.')
    } finally {
      setActionLoading(null)
    }
  }

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rectangular' height={80} sx={{ borderRadius: 1 }} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rectangular' height={260} sx={{ borderRadius: 1 }} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rectangular' height={400} sx={{ borderRadius: 1 }} />
        </Grid>
      </Grid>
    )
  }

  if (!server) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <i className='tabler-server-off' style={{ fontSize: 64, color: '#ccc' }} />
            <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
              Server not found
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              The server you are looking for does not exist or you do not have access.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // -------------------------------------------------------------------------
  // Info field helper
  // -------------------------------------------------------------------------

  const InfoField = ({
    label,
    value,
    mono,
    editAction,
    chipColor,
    chipLabel,
  }: {
    label: string
    value: React.ReactNode
    mono?: boolean
    editAction?: () => void
    chipColor?: 'success' | 'error' | 'warning' | 'info' | 'default'
    chipLabel?: string
  }) => (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}>
        {chipLabel ? (
          <Chip label={chipLabel} color={chipColor || 'default'} size='small' />
        ) : (
          <Typography
            variant='body1'
            sx={mono ? { fontFamily: 'monospace', fontSize: '0.875rem' } : undefined}
          >
            {value || 'N/A'}
          </Typography>
        )}
        {editAction && (
          <IconButton size='small' onClick={editAction} sx={{ ml: 0.5 }}>
            <i className='tabler-pencil' style={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </Grid>
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Grid container spacing={4}>
      {/* Success / Error alerts */}
      {actionSuccess && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        </Grid>
      )}
      {actionError && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        </Grid>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ----------------------------------------------------------------- */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <i className='tabler-server' style={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant='h4'>
                  {server.hostname || server.ipAddress || 'VPS Server'}
                </Typography>
                <Chip
                  icon={<i className='tabler-circle-filled' style={{ fontSize: 10 }} />}
                  label={isOnline ? 'Running' : 'Stopped'}
                  color={isOnline ? 'success' : 'error'}
                  size='small'
                />
              </Box>
              <Typography variant='body2' color='text.secondary'>
                {server.planName || 'VPS'} &middot; {server.region || 'Default Region'}
              </Typography>
            </Box>
          </Box>

          {/* Power & action controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOnline ? (
              <Tooltip title='Stop Server'>
                <IconButton
                  onClick={() => handlePowerAction('stop')}
                  color='error'
                  disabled={actionLoading === 'stop'}
                >
                  {actionLoading === 'stop' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <i className='tabler-player-stop' />
                  )}
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title='Start Server'>
                <IconButton
                  onClick={() => handlePowerAction('start')}
                  color='success'
                  disabled={actionLoading === 'start'}
                >
                  {actionLoading === 'start' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <i className='tabler-player-play' />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title='VNC Console'>
              <IconButton onClick={openVnc}>
                <i className='tabler-device-desktop' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Restart'>
              <IconButton
                onClick={handleRestart}
                color='warning'
                disabled={actionLoading === 'restart'}
              >
                {actionLoading === 'restart' ? (
                  <CircularProgress size={20} />
                ) : (
                  <i className='tabler-refresh' />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title='More Actions'>
              <IconButton onClick={handleMenuOpen}>
                <i className='tabler-dots-vertical' />
              </IconButton>
            </Tooltip>

            {/* More actions menu */}
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setReinstallDialogOpen(true)
                }}
              >
                <i className='tabler-refresh' style={{ fontSize: 18, marginRight: 12 }} />
                Reinstall
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setRescueDialogOpen(true)
                }}
              >
                <i className='tabler-lifebuoy' style={{ fontSize: 18, marginRight: 12 }} />
                Rescue System
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setPasswordDialogOpen(true)
                }}
              >
                <i className='tabler-key' style={{ fontSize: 18, marginRight: 12 }} />
                Reset Credentials
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setNewDisplayName(server.displayName || server.hostname || '')
                  setNameDialogOpen(true)
                }}
              >
                <i className='tabler-pencil' style={{ fontSize: 18, marginRight: 12 }} />
                Change Display Name
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setActiveTab(1)
                }}
              >
                <i className='tabler-cloud-upload' style={{ fontSize: 18, marginRight: 12 }} />
                Manage Auto Backup
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  setSnapshotDialogOpen(true)
                }}
              >
                <i className='tabler-camera-plus' style={{ fontSize: 18, marginRight: 12 }} />
                Create Snapshot
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Grid>

      {/* ----------------------------------------------------------------- */}
      {/* SERVER INFO CARD (Contabo-style grid)                              */}
      {/* ----------------------------------------------------------------- */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={4}>
              {/* Row 1 */}
              <InfoField
                label='Display Name'
                value={server.displayName || server.hostname || 'N/A'}
                editAction={() => {
                  setNewDisplayName(server.displayName || server.hostname || '')
                  setNameDialogOpen(true)
                }}
              />
              <InfoField label='Host System' value={server.hostSystem || server.planName || 'N/A'} />
              <InfoField label='Region' value={server.region || 'N/A'} />
              <InfoField label='IP Address' value={server.ipAddress || 'Pending'} mono />

              {/* Row 2 */}
              <InfoField label='IPv6 Address' value={server.ipv6Address || 'Not assigned'} mono />
              <InfoField label='OS' value={server.os || 'N/A'} />
              <InfoField label='Creation Date' value={formatDate(server.createdAt)} />
              <InfoField label='Termination Date' value={formatDate(server.terminationDate)} />

              {/* Row 3 */}
              <InfoField label='Contract Period' value={server.contractPeriod || 'Monthly'} />
              <InfoField label='Monthly Price' value={formatPrice(server.monthlyPrice)} />
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                  VNC
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={server.vncEnabled ? 'Enabled' : 'Disabled'}
                    color={server.vncEnabled ? 'success' : 'default'}
                    size='small'
                  />
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {server.vncHost ? `${server.vncHost}:${server.vncPort || 5900}` : ''}
                  </Typography>
                </Box>
              </Grid>
              <InfoField label='Default User' value={server.defaultUser || 'root'} />

              {/* Row 4 */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                  Applications
                </Typography>
                <Typography variant='body1'>{server.applications || 'None'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                  CPU
                </Typography>
                <Typography variant='body1'>{server.cpu || 0} vCPU</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                  RAM
                </Typography>
                <Typography variant='body1'>{server.ram || 0} GB</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                  Disk
                </Typography>
                <Typography variant='body1'>{server.disk || 0} GB SSD</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* ----------------------------------------------------------------- */}
      {/* TABS                                                               */}
      {/* ----------------------------------------------------------------- */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ px: 3, pt: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label='Snapshots' />
            <Tab label='Auto Backup' />
            <Tab label='Images' />
            <Tab label='Private Network' />
            <Tab label='Additional IPs' />
            <Tab label='Licenses' />
            <Tab label='DNS Management' />
            <Tab label='Firewall' />
          </Tabs>

          <CardContent sx={{ pt: 4 }}>
            {/* -------------------------------------------------------------- */}
            {/* Tab 0: Snapshots                                                */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Server Snapshots</Typography>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-camera-plus' />}
                    onClick={() => setSnapshotDialogOpen(true)}
                  >
                    Create Snapshot
                  </Button>
                </Box>
                {snapshots.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-camera-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No snapshots yet
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Create a snapshot to save the current server state.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {snapshots.map((snap) => (
                          <TableRow key={snap.id}>
                            <TableCell>
                              <Typography variant='body2' fontWeight={500}>
                                {snap.name}
                              </Typography>
                              {snap.description && (
                                <Typography variant='caption' color='text.secondary'>
                                  {snap.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(snap.createdAt)}</TableCell>
                            <TableCell>{snap.size || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={snap.status || 'Ready'}
                                size='small'
                                color={snap.status === 'creating' ? 'warning' : 'success'}
                              />
                            </TableCell>
                            <TableCell align='right'>
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Tooltip title='Restore'>
                                  <IconButton
                                    size='small'
                                    color='primary'
                                    onClick={() => handleRestoreSnapshot(snap.id)}
                                    disabled={actionLoading === 'restore'}
                                  >
                                    <i className='tabler-restore' style={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='Delete'>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleDeleteSnapshot(snap.id)}
                                  >
                                    <i className='tabler-trash' style={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 1: Auto Backup                                              */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Auto Backup</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoBackupEnabled}
                        onChange={handleToggleAutoBackup}
                        disabled={actionLoading === 'backup'}
                      />
                    }
                    label={autoBackupEnabled ? 'Enabled' : 'Disabled'}
                  />
                </Box>

                {autoBackupEnabled && (
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        label='Backup Schedule'
                        value={backupSchedule}
                        onChange={(e) => setBackupSchedule(e.target.value)}
                        fullWidth
                      >
                        <MenuItem value='daily'>Daily</MenuItem>
                        <MenuItem value='weekly'>Weekly</MenuItem>
                        <MenuItem value='monthly'>Monthly</MenuItem>
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        label='Retention Period'
                        value={backupRetention}
                        onChange={(e) => setBackupRetention(e.target.value)}
                        fullWidth
                      >
                        <MenuItem value='3'>3 Days</MenuItem>
                        <MenuItem value='7'>7 Days</MenuItem>
                        <MenuItem value='14'>14 Days</MenuItem>
                        <MenuItem value='30'>30 Days</MenuItem>
                      </CustomTextField>
                    </Grid>
                  </Grid>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant='subtitle2' sx={{ mb: 2 }}>
                  Recent Backups
                </Typography>

                {backups.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <i className='tabler-cloud-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                      No backups available.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {backups.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>{formatDate(b.createdAt)}</TableCell>
                            <TableCell>{b.size || '-'}</TableCell>
                            <TableCell>
                              <Chip label={b.status || 'Completed'} size='small' color='success' />
                            </TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Restore'>
                                <IconButton size='small' color='primary'>
                                  <i className='tabler-restore' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {!autoBackupEnabled && (
                  <Alert severity='info' sx={{ mt: 2 }}>
                    Enable auto backup to automatically create periodic backups of your server.
                    Additional charges of NPR 299/mo apply.
                  </Alert>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 2: Images                                                   */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Custom Images</Typography>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-photo-plus' />}
                    onClick={async () => {
                      setActionLoading('image')
                      try {
                        await api.post(`/hosting/vps/${serverId}/addons`, { type: 'create-image' })
                        showSuccess('Image creation started from current server state.')
                        await fetchAddons()
                      } catch {
                        showError('Failed to create image.')
                      } finally {
                        setActionLoading(null)
                      }
                    }}
                    disabled={actionLoading === 'image'}
                  >
                    {actionLoading === 'image' ? 'Creating...' : 'Create Image'}
                  </Button>
                </Box>

                {images.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-photo-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No custom images
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Create an image from the current server state to use as a template.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {images.map((img: any) => (
                          <TableRow key={img.id}>
                            <TableCell>{img.name || 'Custom Image'}</TableCell>
                            <TableCell>{formatDate(img.createdAt)}</TableCell>
                            <TableCell>{img.size || '-'}</TableCell>
                            <TableCell>
                              <Chip label={img.status || 'Ready'} size='small' color='success' />
                            </TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Delete'>
                                <IconButton size='small' color='error'>
                                  <i className='tabler-trash' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 3: Private Network                                          */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 3 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Private Network</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privateNetworkEnabled}
                        onChange={async () => {
                          setActionLoading('private-net')
                          try {
                            await api.post(`/hosting/vps/${serverId}/addons`, {
                              type: 'private-network',
                              enabled: !privateNetworkEnabled,
                            })
                            setPrivateNetworkEnabled(!privateNetworkEnabled)
                            showSuccess(
                              privateNetworkEnabled
                                ? 'Private network disabled.'
                                : 'Private network enabled.'
                            )
                            await fetchAddons()
                          } catch {
                            showError('Failed to toggle private network.')
                          } finally {
                            setActionLoading(null)
                          }
                        }}
                        disabled={actionLoading === 'private-net'}
                      />
                    }
                    label={privateNetworkEnabled ? 'Enabled' : 'Disabled'}
                  />
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography variant='caption' color='text.secondary'>
                          Status
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={privateNetworkEnabled ? 'Connected' : 'Not Connected'}
                            color={privateNetworkEnabled ? 'success' : 'default'}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography variant='caption' color='text.secondary'>
                          VLAN ID
                        </Typography>
                        <Typography variant='h6' sx={{ mt: 1 }}>
                          {vlanId || 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography variant='caption' color='text.secondary'>
                          Private IP
                        </Typography>
                        <Typography variant='h6' sx={{ mt: 1, fontFamily: 'monospace' }}>
                          {privateIp || 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {!privateNetworkEnabled && (
                  <Alert severity='info' sx={{ mt: 3 }}>
                    Enable private networking to connect multiple servers in your account through a
                    private VLAN. This provides secure, low-latency communication between servers.
                  </Alert>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 4: Additional IPs                                           */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 4 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Additional IP Addresses</Typography>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={handleRequestAdditionalIp}
                    disabled={actionLoading === 'ip'}
                  >
                    {actionLoading === 'ip' ? 'Requesting...' : 'Request Additional IP (NPR 299/mo)'}
                  </Button>
                </Box>

                {additionalIps.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-network-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No additional IPs
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Request additional IPv4 or IPv6 addresses for your server.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>IP Address</TableCell>
                          <TableCell>Version</TableCell>
                          <TableCell>Reverse DNS</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {additionalIps.map((ip) => (
                          <TableRow key={ip.id}>
                            <TableCell>
                              <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                {ip.address}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={ip.version} size='small' variant='outlined' />
                            </TableCell>
                            <TableCell>{ip.rdns || 'Not set'}</TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Edit RDNS'>
                                <IconButton size='small'>
                                  <i className='tabler-pencil' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Remove'>
                                <IconButton size='small' color='error'>
                                  <i className='tabler-trash' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 5: Licenses                                                 */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 5 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>Licenses</Typography>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-license' />}
                    onClick={() => setLicenseDialogOpen(true)}
                  >
                    Add License
                  </Button>
                </Box>

                {licenses.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-license-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No active licenses
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Add licenses like cPanel, Plesk, or Windows to your server.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>License</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {licenses.map((lic) => (
                          <TableRow key={lic.id}>
                            <TableCell>
                              <Typography variant='body2' fontWeight={500}>
                                {lic.name}
                              </Typography>
                            </TableCell>
                            <TableCell>{lic.type}</TableCell>
                            <TableCell>{formatPrice(lic.price)}</TableCell>
                            <TableCell>
                              <Chip
                                label={lic.status || 'Active'}
                                size='small'
                                color={lic.status === 'active' || !lic.status ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Remove'>
                                <IconButton size='small' color='error'>
                                  <i className='tabler-trash' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 6: DNS Management                                           */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 6 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant='h6'>DNS Records</Typography>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setDnsDialogOpen(true)}
                  >
                    Add Record
                  </Button>
                </Box>

                {dnsRecords.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-world-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No DNS records configured
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Add A, AAAA, MX, CNAME, or TXT records for this server.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>TTL</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dnsRecords.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell>
                              <Chip label={rec.type} size='small' variant='outlined' />
                            </TableCell>
                            <TableCell>{rec.name}</TableCell>
                            <TableCell>
                              <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {rec.value}
                              </Typography>
                            </TableCell>
                            <TableCell>{rec.ttl}s</TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Edit'>
                                <IconButton size='small'>
                                  <i className='tabler-pencil' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title='Delete'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => handleDeleteDnsRecord(rec.id)}
                                >
                                  <i className='tabler-trash' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Tab 7: Firewall                                                 */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 7 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant='h6'>Firewall Rules</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={firewallEnabled}
                          onChange={handleToggleFirewall}
                          disabled={actionLoading === 'firewall'}
                        />
                      }
                      label={firewallEnabled ? 'Active' : 'Inactive'}
                    />
                  </Box>
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setFirewallDialogOpen(true)}
                    disabled={!firewallEnabled}
                  >
                    Add Rule
                  </Button>
                </Box>

                {!firewallEnabled && (
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Enable the firewall to start managing inbound and outbound traffic rules for your
                    server.
                  </Alert>
                )}

                {firewallRules.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <i className='tabler-shield-off' style={{ fontSize: 48, color: '#ccc' }} />
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                      No firewall rules
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      {firewallEnabled
                        ? 'Add rules to control traffic to and from your server.'
                        : 'Enable the firewall first to manage rules.'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Direction</TableCell>
                          <TableCell>Protocol</TableCell>
                          <TableCell>Port</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell align='right'>Manage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {firewallRules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell>
                              <Chip
                                label={rule.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                                size='small'
                                color={rule.direction === 'inbound' ? 'info' : 'default'}
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell>{rule.protocol.toUpperCase()}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{rule.port}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {rule.source}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={rule.action === 'allow' ? 'Allow' : 'Deny'}
                                size='small'
                                color={rule.action === 'allow' ? 'success' : 'error'}
                              />
                            </TableCell>
                            <TableCell align='right'>
                              <Tooltip title='Delete Rule'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => handleDeleteFirewallRule(rule.id)}
                                >
                                  <i className='tabler-trash' style={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ================================================================= */}
      {/* DIALOGS                                                            */}
      {/* ================================================================= */}

      {/* --- Create Snapshot Dialog --- */}
      <Dialog
        open={snapshotDialogOpen}
        onClose={() => setSnapshotDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Create Snapshot</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='Snapshot Name'
              placeholder='e.g., Before Update'
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              fullWidth
            />
            <CustomTextField
              label='Description (optional)'
              placeholder='Brief description of this snapshot'
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Alert severity='info'>
              Snapshots capture the full server state. The server may briefly pause during creation.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleCreateSnapshot}
            disabled={!snapshotName.trim() || actionLoading === 'snapshot'}
            startIcon={
              actionLoading === 'snapshot' ? <CircularProgress size={16} /> : <i className='tabler-camera-plus' />
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Reinstall Dialog --- */}
      <Dialog
        open={reinstallDialogOpen}
        onClose={() => setReinstallDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Reinstall Operating System</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity='error'>
              WARNING: This will ERASE all data on the server. Create a snapshot first if you need to
              preserve your data.
            </Alert>
            <CustomTextField
              select
              label='Select Operating System'
              value={selectedOs}
              onChange={(e) => setSelectedOs(e.target.value)}
              fullWidth
            >
              {osOptions.map((os) => (
                <MenuItem key={os.value} value={os.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={os.icon} style={{ fontSize: 16 }} />
                    {os.label}
                  </Box>
                </MenuItem>
              ))}
            </CustomTextField>
            <FormControlLabel
              control={
                <Switch
                  checked={reinstallConfirm}
                  onChange={(e) => setReinstallConfirm(e.target.checked)}
                  color='error'
                />
              }
              label='I understand all data will be permanently lost'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReinstallDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleReinstall}
            disabled={!selectedOs || !reinstallConfirm || actionLoading === 'reinstall'}
            startIcon={
              actionLoading === 'reinstall' ? <CircularProgress size={16} /> : <i className='tabler-refresh' />
            }
          >
            Reinstall
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Reset Password Dialog --- */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Reset Server Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='New Root Password'
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge='end' size='small'>
                        <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <CustomTextField
              label='Confirm Password'
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              error={confirmPassword.length > 0 && newPassword !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
            />
            {newPassword && (
              <LinearProgress
                variant='determinate'
                value={Math.min(100, newPassword.length * 10)}
                color={newPassword.length >= 10 ? 'success' : newPassword.length >= 6 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            )}
            <Alert severity='warning'>
              The server will be restarted to apply the new password.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handlePasswordReset}
            disabled={!newPassword || newPassword !== confirmPassword || actionLoading === 'password'}
            startIcon={
              actionLoading === 'password' ? <CircularProgress size={16} /> : <i className='tabler-key' />
            }
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Change Display Name Dialog --- */}
      <Dialog
        open={nameDialogOpen}
        onClose={() => setNameDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Change Display Name</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <CustomTextField
              label='Display Name'
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              fullWidth
              placeholder='e.g., Production Web Server'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleChangeName}
            disabled={!newDisplayName.trim() || actionLoading === 'name'}
            startIcon={
              actionLoading === 'name' ? <CircularProgress size={16} /> : <i className='tabler-check' />
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- VNC Dialog --- */}
      <Dialog open={vncDialogOpen} onClose={() => setVncDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>VNC Console</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='body2' color='text.secondary'>Host</Typography>
              <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                {vncInfo?.host || server.vncHost || server.ipAddress || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='body2' color='text.secondary'>Port</Typography>
              <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                {vncInfo?.port || server.vncPort || 5900}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant='body2' color='text.secondary'>Password</Typography>
              <Typography variant='body2' fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                {vncInfo?.password || server.vncPassword || '********'}
              </Typography>
            </Box>
            <Button
              variant='contained'
              fullWidth
              startIcon={<i className='tabler-external-link' />}
              onClick={() => {
                const host = vncInfo?.host || server.vncHost || server.ipAddress
                const port = vncInfo?.port || server.vncPort || 5900
                window.open(
                  `https://vnc.hostingnepals.com/?host=${host}&port=${port}`,
                  '_blank'
                )
              }}
              sx={{ mt: 2 }}
            >
              Open noVNC Console
            </Button>
            <Alert severity='info'>
              You can also connect using VNC clients like TightVNC, RealVNC, or any standard VNC viewer.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVncDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* --- Rescue Mode Dialog --- */}
      <Dialog
        open={rescueDialogOpen}
        onClose={() => setRescueDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Rescue System</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body1'>Rescue Mode</Typography>
              <Chip
                label={server.rescueMode ? 'Active' : 'Inactive'}
                color={server.rescueMode ? 'success' : 'default'}
                size='small'
              />
            </Box>
            <Alert severity={server.rescueMode ? 'warning' : 'info'}>
              {server.rescueMode
                ? 'Rescue mode is currently active. Your data is accessible at /dev/sda1. Disabling rescue mode will restart the server into normal mode.'
                : 'Enabling rescue mode boots a minimal Linux environment. Your server data will be available at /dev/sda1. Connect via SSH using the temporary credentials provided.'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescueDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color={server.rescueMode ? 'error' : 'primary'}
            onClick={handleToggleRescue}
            disabled={actionLoading === 'rescue'}
            startIcon={
              actionLoading === 'rescue' ? <CircularProgress size={16} /> : <i className='tabler-lifebuoy' />
            }
          >
            {server.rescueMode ? 'Disable Rescue Mode' : 'Enable Rescue Mode'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Add DNS Record Dialog --- */}
      <Dialog open={dnsDialogOpen} onClose={() => setDnsDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add DNS Record</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              select
              label='Record Type'
              value={newDns.type}
              onChange={(e) => setNewDns({ ...newDns, type: e.target.value })}
              fullWidth
            >
              <MenuItem value='A'>A</MenuItem>
              <MenuItem value='AAAA'>AAAA</MenuItem>
              <MenuItem value='MX'>MX</MenuItem>
              <MenuItem value='CNAME'>CNAME</MenuItem>
              <MenuItem value='TXT'>TXT</MenuItem>
              <MenuItem value='NS'>NS</MenuItem>
              <MenuItem value='SRV'>SRV</MenuItem>
            </CustomTextField>
            <CustomTextField
              label='Name'
              value={newDns.name}
              onChange={(e) => setNewDns({ ...newDns, name: e.target.value })}
              fullWidth
              placeholder='e.g., @ or subdomain'
            />
            <CustomTextField
              label='Value'
              value={newDns.value}
              onChange={(e) => setNewDns({ ...newDns, value: e.target.value })}
              fullWidth
              placeholder='e.g., 192.168.1.1'
            />
            <CustomTextField
              select
              label='TTL'
              value={String(newDns.ttl)}
              onChange={(e) => setNewDns({ ...newDns, ttl: parseInt(e.target.value) })}
              fullWidth
            >
              <MenuItem value='300'>5 Minutes</MenuItem>
              <MenuItem value='900'>15 Minutes</MenuItem>
              <MenuItem value='3600'>1 Hour</MenuItem>
              <MenuItem value='14400'>4 Hours</MenuItem>
              <MenuItem value='86400'>1 Day</MenuItem>
            </CustomTextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDnsDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleAddDnsRecord}
            disabled={!newDns.name || !newDns.value || actionLoading === 'dns'}
            startIcon={
              actionLoading === 'dns' ? <CircularProgress size={16} /> : <i className='tabler-plus' />
            }
          >
            Add Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Add Firewall Rule Dialog --- */}
      <Dialog
        open={firewallDialogOpen}
        onClose={() => setFirewallDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Add Firewall Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              select
              label='Direction'
              value={newRule.direction}
              onChange={(e) =>
                setNewRule({ ...newRule, direction: e.target.value as 'inbound' | 'outbound' })
              }
              fullWidth
            >
              <MenuItem value='inbound'>Inbound</MenuItem>
              <MenuItem value='outbound'>Outbound</MenuItem>
            </CustomTextField>
            <CustomTextField
              select
              label='Protocol'
              value={newRule.protocol}
              onChange={(e) => setNewRule({ ...newRule, protocol: e.target.value })}
              fullWidth
            >
              <MenuItem value='tcp'>TCP</MenuItem>
              <MenuItem value='udp'>UDP</MenuItem>
              <MenuItem value='icmp'>ICMP</MenuItem>
            </CustomTextField>
            <CustomTextField
              label='Port'
              value={newRule.port}
              onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
              fullWidth
              placeholder='e.g., 80, 443, 8000-9000'
            />
            <CustomTextField
              label='Source'
              value={newRule.source}
              onChange={(e) => setNewRule({ ...newRule, source: e.target.value })}
              fullWidth
              placeholder='e.g., 0.0.0.0/0 or specific IP'
            />
            <CustomTextField
              select
              label='Action'
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value as 'allow' | 'deny' })}
              fullWidth
            >
              <MenuItem value='allow'>Allow</MenuItem>
              <MenuItem value='deny'>Deny</MenuItem>
            </CustomTextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFirewallDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleAddFirewallRule}
            disabled={!newRule.port || actionLoading === 'firewall-rule'}
            startIcon={
              actionLoading === 'firewall-rule' ? (
                <CircularProgress size={16} />
              ) : (
                <i className='tabler-plus' />
              )
            }
          >
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Add License Dialog --- */}
      <Dialog
        open={licenseDialogOpen}
        onClose={() => setLicenseDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Add License</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {licenseOptions.map((lic) => (
              <Card
                key={lic.type}
                variant='outlined'
                sx={{
                  cursor: 'pointer',
                  borderColor: selectedLicense === lic.type ? 'primary.main' : 'divider',
                  bgcolor: selectedLicense === lic.type ? 'action.selected' : 'transparent',
                  transition: 'all 0.2s',
                }}
                onClick={() => setSelectedLicense(lic.type)}
              >
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <i className='tabler-license' style={{ fontSize: 20 }} />
                    <Typography variant='body1' fontWeight={500}>
                      {lic.label}
                    </Typography>
                  </Box>
                  <Typography variant='body2' color='primary' fontWeight={600}>
                    NPR {lic.price.toLocaleString()}/mo
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLicenseDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleAddLicense}
            disabled={!selectedLicense || actionLoading === 'license'}
            startIcon={
              actionLoading === 'license' ? <CircularProgress size={16} /> : <i className='tabler-plus' />
            }
          >
            Add License
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default VPSDetailPage
