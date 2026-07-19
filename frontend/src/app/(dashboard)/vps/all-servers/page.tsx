'use client'

import { useState, useEffect, useCallback } from 'react'

import axios from 'axios'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface ServerRow {
  id: string
  planName: string
  planType: string
  provider: string
  status: string
  ipAddress: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  ACTIVE: 'success', PROVISIONING: 'info', PENDING_SETUP: 'warning',
  SUSPENDED: 'error', EXPIRED: 'default', CANCELLED: 'default', DELETED: 'default',
}

const AllServersPage = () => {
  const currentUser = useAuthStore(s => s.user)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isAdmin = mounted && (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN')

  const [rows, setRows] = useState<ServerRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Debounce the search term so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 350)

    return () => clearTimeout(t)
  }, [search])

  const fetchServers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setErr(null)
    try {
      const params: Record<string, any> = { page: page + 1, limit: rowsPerPage }
      if (debouncedSearch) params.search = debouncedSearch
      const res = await api.get('/admin/hosting', { params, signal })
      const raw = res.data?.data ?? res.data
      setRows(raw?.data ?? [])
      setTotal(raw?.meta?.total ?? 0)
    } catch (e: any) {
      if (axios.isCancel(e) || e?.code === 'ERR_CANCELED') return // stale request, ignore
      setErr(e?.response?.data?.message || 'Failed to load servers. Please retry.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, rowsPerPage, debouncedSearch])

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()

    fetchServers(controller.signal)

    return () => controller.abort()
  }, [isAdmin, fetchServers])

  if (mounted && !isAdmin) {
    return <Alert severity='error'>You don’t have access to this page (admin only).</Alert>
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='All Servers'
            subheader='Every customer’s VPS / hosting account across the platform.'
            action={
              <CustomTextField
                placeholder='Search owner / plan / IP...'
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                sx={{ width: 260 }}
                InputProps={{ startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.4 }} /> }}
              />
            }
          />
          <CardContent>
            {err ? (
              <Alert severity='error' onClose={() => setErr(null)}>{err}</Alert>
            ) : loading ? (
              <Box>{[...Array(5)].map((_, i) => <Skeleton key={i} height={55} sx={{ mb: 0.5 }} />)}</Box>
            ) : rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-server-off' style={{ fontSize: 56, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No servers found</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Owner</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(r => (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{r.user?.name}</Typography>
                            <Typography variant='caption' color='text.secondary'>{r.user?.email}</Typography>
                          </TableCell>
                          <TableCell>
                            {r.planName} <Typography component='span' variant='caption' color='text.secondary'>({r.planType})</Typography>
                          </TableCell>
                          <TableCell>{r.provider}</TableCell>
                          <TableCell><Chip label={r.status} size='small' color={statusColors[r.status] || 'default'} variant='outlined' /></TableCell>
                          <TableCell>{r.ipAddress ? <code>{r.ipAddress}</code> : <Typography variant='caption' color='text.secondary'>—</Typography>}</TableCell>
                          <TableCell><Typography variant='caption' color='text.secondary'>{new Date(r.createdAt).toLocaleDateString()}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component='div' count={total} page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0) }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AllServersPage
