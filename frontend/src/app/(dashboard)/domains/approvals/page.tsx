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

interface PendingDomain {
  id: string
  domainName: string
  tld: string
  years: number
  nameservers: string[]
  registrantProvided: boolean
  createdAt: string
  user: { id: string; name: string; email: string; isFree?: boolean }
}

const DomainApprovalsPage = () => {
  const currentUser = useAuthStore(s => s.user)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isSuperAdmin = mounted && currentUser?.role === 'SUPER_ADMIN'

  const [rows, setRows] = useState<PendingDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.get('/domains/admin/registration-requests')
      // Backend double-wraps ({success,data:[...]} then TransformInterceptor wraps
      // again), so the array is at res.data.data.data — match the sibling pages.
      const data = res.data?.data?.data ?? res.data?.data ?? res.data
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to load registration requests. Please retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isSuperAdmin) fetchPending() }, [isSuperAdmin, fetchPending])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setErr(null)
    try {
      const body = action === 'reject' ? { reason: 'Rejected by admin' } : {}
      await api.post(`/domains/${id}/${action}`, body)
      setMsg(action === 'approve' ? 'Approved — domain registered' : 'Request rejected')
      setTimeout(() => setMsg(null), 4000)
      fetchPending()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Action failed')
      setTimeout(() => setErr(null), 5000)
    } finally {
      setBusyId(null)
    }
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
            title='Domain Registration Approvals'
            subheader='Domain requests waiting for your approval. Nothing is purchased at the registrar until you approve.'
            action={<Button variant='outlined' startIcon={<i className='tabler-refresh' />} onClick={fetchPending}>Refresh</Button>}
          />
          <CardContent>
            {loading ? (
              <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={55} sx={{ mb: 0.5 }} />)}</Box>
            ) : rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-checks' style={{ fontSize: 56, color: '#28C76F' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No domain requests pending</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Term</TableCell>
                      <TableCell>Nameservers</TableCell>
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
                        <TableCell><Typography variant='body2' fontWeight={500}>{r.domainName}</Typography></TableCell>
                        <TableCell>{r.years} {r.years === 1 ? 'yr' : 'yrs'}</TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {(r.nameservers || []).join(', ') || '—'}
                          </Typography>
                        </TableCell>
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
    </Grid>
  )
}

export default DomainApprovalsPage
