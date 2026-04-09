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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Server {
  id: string
  hostname: string
  ipAddress: string
  planName: string
  type: string
}

interface FirewallRule {
  id: string
  direction: string
  protocol: string
  port: string
  source: string
  action: string
}

const DedicatedNetworkPage = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [additionalIps, setAdditionalIps] = useState<{ ip: string; rdns: string }[]>([])
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([])
  const [requestingIp, setRequestingIp] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Firewall dialog state
  const [firewallDialogOpen, setFirewallDialogOpen] = useState(false)
  const [newRule, setNewRule] = useState({ direction: 'inbound', protocol: 'tcp', port: '', source: '0.0.0.0/0', action: 'accept' })
  const [addingRule, setAddingRule] = useState(false)

  // RDNS edit state
  const [editingRdns, setEditingRdns] = useState<string | null>(null)
  const [rdnsValue, setRdnsValue] = useState('')
  const [savingRdns, setSavingRdns] = useState(false)

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
    if (!selectedServer) { setAdditionalIps([]); setFirewallRules([]); return }
    const fetchNetwork = async () => {
      try {
        const res = await api.get(`/hosting/vps/${selectedServer}/network`)
        const data = res.data?.data ?? res.data
        setAdditionalIps(data?.additionalIps || [])
        setFirewallRules(data?.firewallRules || [])
      } catch {
        setAdditionalIps([])
        setFirewallRules([])
      }
    }

    fetchNetwork()
  }, [selectedServer])

  const currentServer = servers.find((s) => s.id === selectedServer)

  const handleRequestIp = async () => {
    if (!selectedServer) return
    setRequestingIp(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/hosting/vps/${selectedServer}/network/ip`, { type: 'ipv4' })
      setSuccess('Additional IPv4 address requested. It will be assigned within a few minutes. (NPR 597/mo)')
      const res = await api.get(`/hosting/vps/${selectedServer}/network`)
      const data = res.data?.data ?? res.data
      setAdditionalIps(data?.additionalIps || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to request additional IP.')
    } finally {
      setRequestingIp(false)
    }
  }

  const handleSaveRdns = async (ip: string) => {
    if (!selectedServer || !rdnsValue) return
    setSavingRdns(true)
    try {
      await api.post(`/hosting/vps/${selectedServer}/network/rdns`, { ip, rdns: rdnsValue })
      setAdditionalIps((prev) =>
        prev.map((item) => (item.ip === ip ? { ...item, rdns: rdnsValue } : item))
      )
      setEditingRdns(null)
      setRdnsValue('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update RDNS.')
    } finally {
      setSavingRdns(false)
    }
  }

  const handleAddFirewallRule = async () => {
    if (!selectedServer || !newRule.port) return
    setAddingRule(true)
    setError('')
    try {
      const res = await api.post(`/hosting/vps/${selectedServer}/network/firewall`, newRule)
      const rule = res.data?.data ?? res.data
      setFirewallRules((prev) => [...prev, { id: rule?.id || `rule-${Date.now()}`, ...newRule }])
      setFirewallDialogOpen(false)
      setNewRule({ direction: 'inbound', protocol: 'tcp', port: '', source: '0.0.0.0/0', action: 'accept' })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add firewall rule.')
    } finally {
      setAddingRule(false)
    }
  }

  const handleDeleteFirewallRule = async (ruleId: string) => {
    if (!selectedServer) return
    try {
      await api.delete(`/hosting/vps/${selectedServer}/network/firewall/${ruleId}`)
      setFirewallRules((prev) => prev.filter((r) => r.id !== ruleId))
    } catch {
      setError('Failed to delete firewall rule.')
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
            <i className='tabler-network' style={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant='h4'>Network Management</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage IPs, RDNS, firewall rules, and network settings for your dedicated server
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
                    {s.hostname || s.id} ({s.ipAddress || 'No IP'})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Network Info Card */}
      {selectedServer && currentServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Network Information</Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>Primary IPv4</Typography>
                  <Typography variant='body2' fontWeight={600} sx={{ fontFamily: 'monospace' }}>{currentServer.ipAddress || 'Pending'}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>IPv6 Subnet</Typography>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>2a02:xxxx:xxxx::/64</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>Gateway</Typography>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {currentServer.ipAddress ? currentServer.ipAddress.split('.').slice(0, 3).join('.') + '.1' : '-'}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>DNS Server 1</Typography>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>8.8.8.8</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>DNS Server 2</Typography>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>8.8.4.4</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Additional IPs */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6'>Additional IP Addresses</Typography>
                <Button
                  variant='contained'
                  size='small'
                  onClick={handleRequestIp}
                  disabled={requestingIp}
                  startIcon={requestingIp ? <CircularProgress size={16} /> : <i className='tabler-plus' />}
                >
                  Request Additional IP (NPR 597/mo)
                </Button>
              </Box>

              {success && <Alert severity='success' sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
              {error && <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

              {additionalIps.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No additional IP addresses assigned.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>IP Address</Typography></TableCell>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>RDNS</Typography></TableCell>
                        <TableCell align='right'><Typography variant='subtitle2' fontWeight={600}>Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {additionalIps.map((ipItem) => (
                        <TableRow key={ipItem.ip}>
                          <TableCell>
                            <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{ipItem.ip}</Typography>
                          </TableCell>
                          <TableCell>
                            {editingRdns === ipItem.ip ? (
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <CustomTextField
                                  size='small'
                                  value={rdnsValue}
                                  onChange={(e) => setRdnsValue(e.target.value)}
                                  placeholder='hostname.example.com'
                                  sx={{ minWidth: 250 }}
                                />
                                <Button size='small' variant='contained' onClick={() => handleSaveRdns(ipItem.ip)} disabled={savingRdns}>
                                  {savingRdns ? <CircularProgress size={16} /> : 'Save'}
                                </Button>
                                <Button size='small' onClick={() => setEditingRdns(null)}>Cancel</Button>
                              </Box>
                            ) : (
                              <Typography variant='body2'>{ipItem.rdns || 'Not set'}</Typography>
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            {editingRdns !== ipItem.ip && (
                              <Tooltip title='Edit RDNS'>
                                <IconButton size='small' onClick={() => { setEditingRdns(ipItem.ip); setRdnsValue(ipItem.rdns || '') }}>
                                  <i className='tabler-edit' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Bandwidth Usage Placeholder */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Bandwidth Usage</Typography>
              <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                  <i className='tabler-chart-bar' style={{ fontSize: 28, color: '#fff' }} />
                </Avatar>
                <Typography variant='body2' color='text.secondary'>
                  Bandwidth usage chart will be displayed here.
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Unlimited bandwidth included with your plan
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Private VLAN */}
      {selectedServer && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Private VLAN</Typography>
              <Alert severity='info' sx={{ mb: 2 }}>
                Private VLAN allows secure communication between your dedicated servers without traversing the public internet.
              </Alert>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' color='text.secondary'>VLAN Status</Typography>
                <Chip label='Not Configured' size='small' variant='outlined' />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant='body2' color='text.secondary'>Private IP</Typography>
                <Typography variant='body2'>Not assigned</Typography>
              </Box>
              <Button variant='outlined' fullWidth startIcon={<i className='tabler-network' />}>
                Configure Private VLAN
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Firewall Rules */}
      {selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6'>Firewall Rules</Typography>
                <Button
                  variant='contained'
                  size='small'
                  onClick={() => setFirewallDialogOpen(true)}
                  startIcon={<i className='tabler-plus' />}
                >
                  Add Rule
                </Button>
              </Box>

              {firewallRules.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>
                    No firewall rules configured. All ports are accessible by default.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>Direction</Typography></TableCell>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>Protocol</Typography></TableCell>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>Port</Typography></TableCell>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>Source</Typography></TableCell>
                        <TableCell><Typography variant='subtitle2' fontWeight={600}>Action</Typography></TableCell>
                        <TableCell align='right'><Typography variant='subtitle2' fontWeight={600}>Delete</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {firewallRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Chip label={rule.direction} size='small' variant='outlined' color={rule.direction === 'inbound' ? 'primary' : 'default'} />
                          </TableCell>
                          <TableCell><Typography variant='body2'>{rule.protocol.toUpperCase()}</Typography></TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{rule.port}</Typography></TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{rule.source}</Typography></TableCell>
                          <TableCell>
                            <Chip label={rule.action} size='small' color={rule.action === 'accept' ? 'success' : 'error'} />
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Delete Rule'>
                              <IconButton size='small' color='error' onClick={() => handleDeleteFirewallRule(rule.id)}>
                                <i className='tabler-trash' style={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Add Firewall Rule Dialog */}
      <Dialog open={firewallDialogOpen} onClose={() => setFirewallDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Firewall Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                label='Direction'
                value={newRule.direction}
                onChange={(e) => setNewRule({ ...newRule, direction: e.target.value })}
                fullWidth
              >
                <MenuItem value='inbound'>Inbound</MenuItem>
                <MenuItem value='outbound'>Outbound</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                label='Port(s)'
                placeholder='e.g., 80, 443, 8080-8090'
                value={newRule.port}
                onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                label='Source IP / CIDR'
                placeholder='0.0.0.0/0'
                value={newRule.source}
                onChange={(e) => setNewRule({ ...newRule, source: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                select
                label='Action'
                value={newRule.action}
                onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                fullWidth
              >
                <MenuItem value='accept'>Accept</MenuItem>
                <MenuItem value='drop'>Drop</MenuItem>
                <MenuItem value='reject'>Reject</MenuItem>
              </CustomTextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFirewallDialogOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleAddFirewallRule}
            disabled={!newRule.port || addingRule}
            startIcon={addingRule ? <CircularProgress size={16} /> : <i className='tabler-plus' />}
          >
            {addingRule ? 'Adding...' : 'Add Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DedicatedNetworkPage
