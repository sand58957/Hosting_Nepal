'use client'

import { useState, useEffect, useCallback } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'

import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface PendingVps {
  id: string
  planName: string
  provider: string
  createdAt: string
  hostname: string
  osTemplate: string
  planId: string
  user: { id: string; name: string; email: string; isFree?: boolean }
}

interface UpgradeRequest {
  id: string
  currentPlan: string
  newPlanId: string
  newPlanName: string
  newContaboProductId: string
  requestedAt: string
  serverId: string | null
  ipAddress: string | null
  user: { id: string; name: string; email: string; isFree?: boolean }
}

const VpsApprovalsPage = () => {
  const currentUser = useAuthStore(s => s.user)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isSuperAdmin = mounted && currentUser?.role === 'SUPER_ADMIN'

  const [rows, setRows] = useState<PendingVps[]>([])
  const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [apprRes, upgRes] = await Promise.allSettled([
        api.get('/hosting/admin/vps-approvals'),
        api.get('/hosting/admin/vps-upgrade-requests'),
      ])

      if (apprRes.status === 'fulfilled') {
        const data = apprRes.value.data?.data ?? apprRes.value.data
        setRows(Array.isArray(data) ? data : [])
      }
      if (upgRes.status === 'fulfilled') {
        const upg = upgRes.value.data?.data ?? upgRes.value.data
        setUpgrades(Array.isArray(upg) ? upg : [])
      }

      const failed = [apprRes, upgRes].filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      if (failed.length) {
        const first: any = failed[0].reason
        setErr(first?.response?.data?.message
          || (failed.length === 2
            ? 'Failed to load pending requests. Please retry.'
            : 'Some pending requests could not be loaded. Please retry.'))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (isSuperAdmin) fetchPending() }, [isSuperAdmin, fetchPending])

  const syncUpgrade = async (id: string) => {
    setBusyId(id)
    try {
      const res = await api.post(`/hosting/vps/${id}/sync-from-provider`, {})
      const d = res.data?.data ?? res.data
      setMsg(d?.upgradeApplied
        ? `Synced — plan is now ${d.planName}, request cleared`
        : `Synced from Contabo (plan still ${d?.planName}) — apply the upgrade in the Contabo panel first`)
      setTimeout(() => setMsg(null), 6000)
      fetchPending()
    } catch {
      setErr('Sync failed')
      setTimeout(() => setErr(null), 4000)
    } finally { setBusyId(null) }
  }

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      await api.post(`/hosting/vps/${id}/${action}`, {})
      setMsg(action === 'approve' ? 'Approved — provisioning started' : 'Request rejected')
      setTimeout(() => setMsg(null), 3000)
      fetchPending()
    } catch {
      setErr('Action failed')
      setTimeout(() => setErr(null), 4000)
    } finally { setBusyId(null) }
  }

  if (mounted && !isSuperAdmin) {
    return <Alert severity='error'>You don’t have access to this page (SUPER_ADMIN only).</Alert>
  }

  return (
    <Grid container spacing={6}>
      {msg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setMsg(null)}>{msg}</Alert></Grid>}
      {err && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErr(null)}>{err}</Alert></Grid>}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='VPS Approvals'
            subheader='VPS requests waiting for your approval. Nothing provisions (or bills) on Contabo until you approve.'
            action={<Button variant='outlined' startIcon={<i className='tabler-refresh' />} onClick={fetchPending}>Refresh</Button>}
          />
          <CardContent>
            {loading ? (
              <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={55} sx={{ mb: 0.5 }} />)}</Box>
            ) : rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-checks' style={{ fontSize: 56, color: '#28C76F' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No VPS requests pending</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Hostname</TableCell>
                      <TableCell>OS</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell align='right'>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight={600}>{r.user?.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant='caption' color='text.secondary'>{r.user?.email}</Typography>
                            {r.user?.isFree && <Chip label='FREE' size='small' color='success' />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={r.planName} size='small' sx={{ mr: 1 }} />
                          <Typography variant='caption' color='text.secondary'>{r.provider}</Typography>
                        </TableCell>
                        <TableCell>{r.hostname}</TableCell>
                        <TableCell>{r.osTemplate}</TableCell>
                        <TableCell><Typography variant='caption' color='text.secondary'>{new Date(r.createdAt).toLocaleString()}</Typography></TableCell>
                        <TableCell align='right'>
                          <Button size='small' variant='contained' color='success' disabled={busyId === r.id}
                            onClick={() => act(r.id, 'approve')} sx={{ mr: 1 }}>
                            {busyId === r.id ? '...' : 'Approve'}
                          </Button>
                          <Button size='small' variant='outlined' color='error' disabled={busyId === r.id}
                            onClick={() => act(r.id, 'reject')}>Reject</Button>
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

      {/* Plan upgrade requests */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Upgrade Requests'
            subheader='Plan changes must be applied in the Contabo panel (Upgrade Now), then click Sync to update the customer’s record.'
          />
          <CardContent>
            {loading ? (
              <Box>{[...Array(2)].map((_, i) => <Skeleton key={i} height={55} sx={{ mb: 0.5 }} />)}</Box>
            ) : upgrades.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-arrow-up-circle' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>No upgrade requests pending</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Server</TableCell>
                      <TableCell>Upgrade</TableCell>
                      <TableCell>Contabo Product</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell align='right'>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upgrades.map(u => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight={600}>{u.user?.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant='caption' color='text.secondary'>{u.user?.email}</Typography>
                            {u.user?.isFree && <Chip label='FREE' size='small' color='success' />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{u.ipAddress || '—'}</Typography>
                          <Typography variant='caption' color='text.secondary'>Contabo #{u.serverId}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={u.currentPlan} size='small' sx={{ mr: 0.5 }} />
                          <i className='tabler-arrow-right' style={{ fontSize: 14, verticalAlign: 'middle' }} />
                          <Chip label={u.newPlanName} size='small' color='primary' sx={{ ml: 0.5 }} />
                        </TableCell>
                        <TableCell><code>{u.newContaboProductId}</code></TableCell>
                        <TableCell><Typography variant='caption' color='text.secondary'>{u.requestedAt ? new Date(u.requestedAt).toLocaleString() : '—'}</Typography></TableCell>
                        <TableCell align='right'>
                          <Button size='small' variant='contained' disabled={busyId === u.id}
                            onClick={() => syncUpgrade(u.id)}
                            startIcon={<i className='tabler-refresh' />}>
                            {busyId === u.id ? '...' : 'Sync from Contabo'}
                          </Button>
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
    </Grid>
  )
}

export default VpsApprovalsPage
