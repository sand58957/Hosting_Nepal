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
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import LinearProgress from '@mui/material/LinearProgress'
import Checkbox from '@mui/material/Checkbox'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  isFree?: boolean
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string | null
}

interface Analytics {
  overview: { totalUsers: number; activeUsers: number; suspendedUsers: number; newUsersThisMonth: number; newUsersThisWeek: number }
  roles: Record<string, number>
  recentUsers: User[]
}

const roleColors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  SUPER_ADMIN: 'error',
  ADMIN: 'warning',
  SUPPORT_AGENT: 'info',
  RESELLER: 'success',
  CUSTOMER: 'default',
}

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  SUSPENDED: 'error',
  PENDING_VERIFICATION: 'warning',
  INACTIVE: 'default',
}

const roleTabs = ['All', 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT', 'RESELLER']

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [roleTab, setRoleTab] = useState(0)
  const [search, setSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogAction, setDialogAction] = useState<'role' | 'status'>('role')
  const [dialogValue, setDialogValue] = useState('')
  const [dialogSaving, setDialogSaving] = useState(false)

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createShowPassword, setCreateShowPassword] = useState(false)
  const emptyCreate = { name: '', email: '', phone: '', password: '', role: 'CUSTOMER', status: 'ACTIVE', companyName: '' }
  const [createForm, setCreateForm] = useState(emptyCreate)

  // Auth — the "Make free" action is SUPER_ADMIN-only (backend enforces it too).
  // Gate on `authMounted` so the button reliably appears after the persisted auth
  // store rehydrates on the client (avoids an SSR/first-paint flash).
  const currentUser = useAuthStore(s => s.user)
  const [authMounted, setAuthMounted] = useState(false)
  useEffect(() => { setAuthMounted(true) }, [])
  const isSuperAdmin = authMounted && currentUser?.role === 'SUPER_ADMIN'

  // Make-free dialog state
  const [freeOpen, setFreeOpen] = useState(false)
  const [freeUser, setFreeUser] = useState<User | null>(null)
  const [freeReason, setFreeReason] = useState('')
  const [freeSaving, setFreeSaving] = useState(false)

  // Bulk make-free state (SUPER_ADMIN)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<'selected' | 'all-customers'>('selected')
  const [bulkGrant, setBulkGrant] = useState(true)
  const [bulkReason, setBulkReason] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: page + 1, limit: rowsPerPage }
      if (roleTabs[roleTab] !== 'All') params.role = roleTabs[roleTab]
      if (search) params.search = search
      const res = await api.get('/admin/users', { params })
      const raw = res.data?.data ?? res.data
      setUsers(raw?.data ?? raw?.users ?? [])
      setTotal(raw?.meta?.total ?? raw?.total ?? 0)
    } catch {} finally { setLoading(false) }
  }, [page, rowsPerPage, roleTab, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    api.get('/admin/users-analytics').then(res => {
      setAnalytics(res.data?.data ?? res.data)
    }).catch(() => {}).finally(() => setAnalyticsLoading(false))
  }, [])

  const openDialog = (user: User, action: 'role' | 'status') => {
    setSelectedUser(user)
    setDialogAction(action)
    setDialogValue(action === 'role' ? user.role : user.status)
    setDialogOpen(true)
  }

  const handleDialogSave = async () => {
    if (!selectedUser) return
    setDialogSaving(true)
    try {
      if (dialogAction === 'role') {
        await api.patch(`/admin/users/${selectedUser.id}/role`, { role: dialogValue })
        setSuccessMsg(`Role updated to ${dialogValue}`)
      } else {
        await api.patch(`/admin/users/${selectedUser.id}/status`, { status: dialogValue })
        setSuccessMsg(`Status updated to ${dialogValue}`)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      setDialogOpen(false)
      fetchUsers()
      // Refresh analytics
      api.get('/admin/users-analytics').then(res => setAnalytics(res.data?.data ?? res.data)).catch(() => {})
    } catch {
      setErrorMsg('Failed to update user')
      setTimeout(() => setErrorMsg(null), 4000)
    } finally { setDialogSaving(false) }
  }

  const openFreeDialog = (user: User) => {
    setFreeUser(user)
    setFreeReason('')
    setFreeOpen(true)
  }

  const handleToggleFree = async () => {
    if (!freeUser) return
    setFreeSaving(true)
    const grant = !freeUser.isFree
    try {
      await api.patch(`/admin/users/${freeUser.id}/free`, {
        isFree: grant,
        ...(grant && freeReason.trim() ? { reason: freeReason.trim() } : {}),
      })
      setSuccessMsg(grant ? `${freeUser.name} is now free (billing-exempt)` : `Removed free status from ${freeUser.name}`)
      setTimeout(() => setSuccessMsg(null), 3000)
      setFreeOpen(false)
      fetchUsers()
    } catch {
      setErrorMsg('Failed to update free status')
      setTimeout(() => setErrorMsg(null), 4000)
    } finally { setFreeSaving(false) }
  }

  // ── Bulk make-free helpers ──
  const isStaff = (u: User) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
  const selectableOnPage = users.filter(u => !isStaff(u))
  const allPageSelected = selectableOnPage.length > 0 && selectableOnPage.every(u => selectedIds.has(u.id))

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleSelectAllPage = () => setSelectedIds(prev => {
    const next = new Set(prev)
    if (allPageSelected) selectableOnPage.forEach(u => next.delete(u.id))
    else selectableOnPage.forEach(u => next.add(u.id))
    return next
  })
  const clearSelection = () => setSelectedIds(new Set())

  const openBulk = (mode: 'selected' | 'all-customers', grant: boolean) => {
    setBulkMode(mode); setBulkGrant(grant); setBulkReason(''); setBulkOpen(true)
  }

  const handleBulkFree = async () => {
    setBulkSaving(true)
    try {
      const payload: Record<string, any> = { isFree: bulkGrant }
      if (bulkMode === 'all-customers') payload.scope = 'ALL_CUSTOMERS'
      else payload.userIds = Array.from(selectedIds)
      if (bulkGrant && bulkReason.trim()) payload.reason = bulkReason.trim()
      const res = await api.post('/admin/users/bulk-free', payload)
      const d = res.data?.data ?? res.data
      setSuccessMsg(`${bulkGrant ? 'Made free' : 'Removed free from'} ${d?.updated ?? 0} user(s)${d?.skipped ? `, ${d.skipped} skipped` : ''}`)
      setTimeout(() => setSuccessMsg(null), 4000)
      setBulkOpen(false)
      clearSelection()
      fetchUsers()
      api.get('/admin/users-analytics').then(r => setAnalytics(r.data?.data ?? r.data)).catch(() => {})
    } catch {
      setErrorMsg('Bulk update failed')
      setTimeout(() => setErrorMsg(null), 4000)
    } finally { setBulkSaving(false) }
  }

  const resetCreateForm = () => {
    setCreateForm(emptyCreate)
    setCreateError(null)
    setCreateShowPassword(false)
  }

  const handleCreate = async () => {
    setCreateError(null)
    const { name, email, password } = createForm

    if (name.trim().length < 2) return setCreateError('Name must be at least 2 characters')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setCreateError('Please enter a valid email')
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setCreateError('Password must be 8+ chars with upper, lower, and a number')
    }

    setCreateSaving(true)
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: createForm.role,
        status: createForm.status,
      }

      if (createForm.phone.trim()) payload.phone = createForm.phone.replace(/[\s\-()]/g, '')
      if (createForm.companyName.trim()) payload.companyName = createForm.companyName.trim()

      await api.post('/admin/users', payload)
      setSuccessMsg(`User ${payload.email} created as ${payload.role}`)
      setTimeout(() => setSuccessMsg(null), 3500)
      setCreateOpen(false)
      resetCreateForm()
      fetchUsers()
      api.get('/admin/users-analytics').then(res => setAnalytics(res.data?.data ?? res.data)).catch(() => {})
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message
      const msg = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg

      setCreateError(msg || 'Failed to create user')
    } finally {
      setCreateSaving(false)
    }
  }

  const statCards = analytics ? [
    { label: 'Total Users', value: analytics.overview.totalUsers, icon: 'tabler-users', color: '#7367F0', bg: 'rgba(115,103,240,0.12)' },
    { label: 'Active Users', value: analytics.overview.activeUsers, icon: 'tabler-user-check', color: '#28C76F', bg: 'rgba(40,199,111,0.12)' },
    { label: 'New This Month', value: analytics.overview.newUsersThisMonth, icon: 'tabler-user-plus', color: '#00CFE8', bg: 'rgba(0,207,232,0.12)' },
    { label: 'New This Week', value: analytics.overview.newUsersThisWeek, icon: 'tabler-trending-up', color: '#FF9F43', bg: 'rgba(255,159,67,0.12)' },
  ] : []

  return (
    <Grid container spacing={6}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      {/* Analytics Cards */}
      {analyticsLoading ? (
        <>{[...Array(4)].map((_, i) => <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}><Card><CardContent><Skeleton height={80} /></CardContent></Card></Grid>)}</>
      ) : analytics && (
        <>
          {statCards.map(stat => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: '1.25rem !important' }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: stat.bg, color: stat.color }}>
                    <i className={stat.icon} style={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='h5' fontWeight={700}>{stat.value}</Typography>
                    <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Role Breakdown & Recent Users */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title='Users by Role' titleTypographyProps={{ variant: 'h6' }} />
              <CardContent sx={{ pt: 0 }}>
                {Object.entries(analytics.roles).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                  const maxCount = Math.max(...Object.values(analytics.roles), 1)
                  const colorMap: Record<string, string> = { SUPER_ADMIN: '#FF4C51', ADMIN: '#FF9F43', SUPPORT_AGENT: '#00CFE8', RESELLER: '#28C76F', CUSTOMER: '#7367F0' }
                  return (
                    <Box key={role} sx={{ mb: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={role} size='small' color={roleColors[role] || 'default'} />
                        </Box>
                        <Typography variant='body2' fontWeight={600}>{count}</Typography>
                      </Box>
                      <LinearProgress variant='determinate' value={(count / maxCount) * 100}
                        sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: colorMap[role] || '#7367F0' } }} />
                    </Box>
                  )
                })}

                {analytics.overview.suspendedUsers > 0 && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,76,81,0.08)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <i className='tabler-alert-triangle' style={{ fontSize: 20, color: '#FF4C51' }} />
                    <Typography variant='body2' color='error'>{analytics.overview.suspendedUsers} suspended user{analytics.overview.suspendedUsers > 1 ? 's' : ''}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title='Recent Registrations' titleTypographyProps={{ variant: 'h6' }} />
              <CardContent sx={{ pt: 0 }}>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Joined</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.recentUsers.slice(0, 7).map(u => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'primary.main' }}>
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Avatar>
                              <Box>
                                <Typography variant='body2' fontWeight={500}>{u.name}</Typography>
                                <Typography variant='caption' color='text.secondary'>{u.email}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell><Chip label={u.role} size='small' color={roleColors[u.role] || 'default'} /></TableCell>
                          <TableCell><Chip label={u.status} size='small' color={statusColors[u.status] || 'default'} variant='outlined' /></TableCell>
                          <TableCell><Typography variant='caption' color='text.secondary'>{new Date(u.createdAt).toLocaleDateString()}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Users Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='User Management'
            action={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {isSuperAdmin && (
                  <Button
                    variant='outlined'
                    color='success'
                    startIcon={<i className='tabler-gift' />}
                    onClick={() => openBulk('all-customers', true)}
                  >
                    Free All Customers
                  </Button>
                )}
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-user-plus' />}
                  onClick={() => { resetCreateForm(); setCreateOpen(true) }}
                >
                  Create User
                </Button>
              </Box>
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Tabs value={roleTab} onChange={(_, v) => { setRoleTab(v); setPage(0) }}
                variant='scrollable' scrollButtons='auto'
                sx={{ '& .MuiTab-root': { textTransform: 'none', minHeight: 40 } }}>
                {roleTabs.map(r => <Tab key={r} label={r === 'All' ? 'All Users' : r.replace('_', ' ')} />)}
              </Tabs>
              <CustomTextField
                placeholder='Search by name or email...'
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(0) }}
                sx={{ width: 280 }}
                InputProps={{ startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.4 }} /> }}
              />
            </Box>

            {isSuperAdmin && selectedIds.size > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', flexWrap: 'wrap' }}>
                <Typography variant='body2' fontWeight={600}>{selectedIds.size} selected</Typography>
                <Button size='small' variant='contained' color='success' startIcon={<i className='tabler-gift' />}
                  onClick={() => openBulk('selected', true)}>Make free</Button>
                <Button size='small' variant='outlined' color='warning' startIcon={<i className='tabler-gift-off' />}
                  onClick={() => openBulk('selected', false)}>Remove free</Button>
                <Button size='small' color='inherit' onClick={clearSelection}>Clear</Button>
              </Box>
            )}

            {loading ? (
              <Box>{[...Array(5)].map((_, i) => <Skeleton key={i} height={55} sx={{ mb: 0.5 }} />)}</Box>
            ) : users.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-users-minus' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No users found</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {isSuperAdmin && (
                          <TableCell padding='checkbox'>
                            <Checkbox size='small'
                              checked={allPageSelected}
                              indeterminate={!allPageSelected && selectableOnPage.some(u => selectedIds.has(u.id))}
                              onChange={toggleSelectAllPage} />
                          </TableCell>
                        )}
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Verified</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id} hover selected={selectedIds.has(user.id)}>
                          {isSuperAdmin && (
                            <TableCell padding='checkbox'>
                              <Checkbox size='small'
                                checked={selectedIds.has(user.id)}
                                disabled={isStaff(user)}
                                onChange={() => toggleSelect(user.id)} />
                            </TableCell>
                          )}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ width: 36, height: 36, bgcolor: roleColors[user.role] === 'error' ? 'error.main' : roleColors[user.role] === 'warning' ? 'warning.main' : 'primary.main', fontSize: 14 }}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Avatar>
                              <Box>
                                <Typography variant='body2' fontWeight={600}>{user.name}</Typography>
                                <Typography variant='caption' color='text.secondary'>{user.email}</Typography>
                                {user.phone && <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>{user.phone}</Typography>}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={user.role.replace('_', ' ')} size='small' color={roleColors[user.role] || 'default'}
                              onClick={() => openDialog(user, 'role')} sx={{ cursor: 'pointer' }} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={user.status} size='small' color={statusColors[user.status] || 'default'} variant='outlined'
                                onClick={() => openDialog(user, 'status')} sx={{ cursor: 'pointer' }} />
                              {user.isFree && (
                                <Chip label='FREE' size='small' color='success'
                                  icon={<i className='tabler-gift' style={{ fontSize: 14 }} />} title='Billing-exempt (free) user' />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {user.emailVerified
                              ? <i className='tabler-circle-check' style={{ fontSize: 20, color: '#28C76F' }} />
                              : <i className='tabler-circle-x' style={{ fontSize: 20, color: '#FF4C51' }} />}
                          </TableCell>
                          <TableCell><Typography variant='caption' color='text.secondary'>{new Date(user.createdAt).toLocaleDateString()}</Typography></TableCell>
                          <TableCell>
                            <Typography variant='caption' color='text.secondary'>
                              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size='small' title='Change Role' onClick={() => openDialog(user, 'role')}>
                                <i className='tabler-shield' style={{ fontSize: 18 }} />
                              </IconButton>
                              <IconButton size='small' title='Change Status' onClick={() => openDialog(user, 'status')}
                                color={user.status === 'SUSPENDED' ? 'success' : 'default'}>
                                <i className={user.status === 'SUSPENDED' ? 'tabler-user-check' : 'tabler-user-pause'} style={{ fontSize: 18 }} />
                              </IconButton>
                              {isSuperAdmin && (
                                <IconButton size='small'
                                  title={user.isFree ? 'Remove free status' : 'Make user free'}
                                  onClick={() => openFreeDialog(user)}
                                  color={user.isFree ? 'success' : 'default'}>
                                  <i className={user.isFree ? 'tabler-gift-off' : 'tabler-gift'} style={{ fontSize: 18 }} />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
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
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onClose={() => !createSaving && setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3, mt: 0.5 }}>
            Users created here are active immediately and their email is marked as verified.
          </Typography>
          {createError && (
            <Alert severity='error' sx={{ mb: 2 }} onClose={() => setCreateError(null)}>{createError}</Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <CustomTextField
              fullWidth required label='Full Name' placeholder='Jane Doe'
              value={createForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, name: e.target.value }))}
              slotProps={{ htmlInput: { autoComplete: 'name' } }}
            />
            <CustomTextField
              fullWidth required type='email' label='Email' placeholder='jane@example.com'
              value={createForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, email: e.target.value }))}
              slotProps={{ htmlInput: { autoComplete: 'email', inputMode: 'email' } }}
            />
            <CustomTextField
              fullWidth label='Phone Number (optional)' placeholder='9812345678 or +9779812345678'
              value={createForm.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
              helperText='10-digit Nepal mobile (starts with 96-99). Country code optional.'
              slotProps={{ htmlInput: { autoComplete: 'tel', inputMode: 'tel' } }}
            />
            <CustomTextField
              fullWidth required label='Password' placeholder='At least 8 chars, 1 upper, 1 lower, 1 number'
              type={createShowPassword ? 'text' : 'password'}
              value={createForm.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, password: e.target.value }))}
              slotProps={{
                htmlInput: { autoComplete: 'new-password' },
                input: {
                  endAdornment: (
                    <IconButton size='small' onClick={() => setCreateShowPassword(s => !s)} onMouseDown={e => e.preventDefault()} edge='end'>
                      <i className={createShowPassword ? 'tabler-eye-off' : 'tabler-eye'} style={{ fontSize: 18 }} />
                    </IconButton>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <CustomTextField
                select fullWidth label='Role'
                value={createForm.role}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, role: e.target.value }))}
              >
                {['CUSTOMER', 'RESELLER', 'SUPPORT_AGENT', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                  <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select fullWidth label='Status'
                value={createForm.status}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, status: e.target.value }))}
              >
                {['ACTIVE', 'PENDING_VERIFICATION', 'INACTIVE', 'SUSPENDED'].map(s => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </CustomTextField>
            </Box>
            <CustomTextField
              fullWidth label='Company Name (optional)'
              value={createForm.companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(f => ({ ...f, companyName: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} color='inherit' disabled={createSaving}>Cancel</Button>
          <Button onClick={handleCreate} variant='contained' disabled={createSaving} startIcon={<i className='tabler-user-plus' />}>
            {createSaving ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role/Status Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>
          {dialogAction === 'role' ? 'Change User Role' : 'Change User Status'}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                User: <strong>{selectedUser.name}</strong> ({selectedUser.email})
              </Typography>
            </Box>
          )}
          <CustomTextField
            select fullWidth
            label={dialogAction === 'role' ? 'Role' : 'Status'}
            value={dialogValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDialogValue(e.target.value)}
          >
            {dialogAction === 'role' ? (
              ['CUSTOMER', 'RESELLER', 'SUPPORT_AGENT', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
              ))
            ) : (
              ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'INACTIVE'].map(s => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))
            )}
          </CustomTextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color='inherit'>Cancel</Button>
          <Button onClick={handleDialogSave} variant='contained' disabled={dialogSaving}>
            {dialogSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Make-free Dialog (SUPER_ADMIN only) */}
      <Dialog open={freeOpen} onClose={() => !freeSaving && setFreeOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>{freeUser?.isFree ? 'Remove Free Status' : 'Make User Free'}</DialogTitle>
        <DialogContent>
          {freeUser && (
            <Box sx={{ mb: 2, mt: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                User: <strong>{freeUser.name}</strong> ({freeUser.email})
              </Typography>
            </Box>
          )}
          <Alert severity={freeUser?.isFree ? 'warning' : 'info'} sx={{ mb: freeUser?.isFree ? 0 : 2 }}>
            {freeUser?.isFree
              ? 'This user will be charged normally for future orders. Past orders are unaffected.'
              : 'While free, all of this user’s new orders are automatically zeroed and approved — they won’t be charged.'}
          </Alert>
          {!freeUser?.isFree && (
            <CustomTextField
              fullWidth label='Reason (optional)' placeholder='e.g. partner / giveaway / staff account'
              value={freeReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFreeReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreeOpen(false)} color='inherit' disabled={freeSaving}>Cancel</Button>
          <Button onClick={handleToggleFree} variant='contained'
            color={freeUser?.isFree ? 'warning' : 'success'} disabled={freeSaving}>
            {freeSaving ? 'Saving...' : freeUser?.isFree ? 'Remove Free' : 'Make Free'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk make-free Dialog (SUPER_ADMIN only) */}
      <Dialog open={bulkOpen} onClose={() => !bulkSaving && setBulkOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>{bulkGrant ? 'Make Users Free' : 'Remove Free Status'}</DialogTitle>
        <DialogContent>
          <Alert severity={bulkGrant ? 'info' : 'warning'} sx={{ mb: bulkGrant ? 2 : 0, mt: 1 }}>
            {bulkMode === 'all-customers'
              ? (bulkGrant
                  ? 'This makes EVERY customer billing-exempt — none of them will be charged for any product. This can affect many accounts.'
                  : 'This removes free status from all customers.')
              : (bulkGrant
                  ? `${selectedIds.size} selected user(s) will be made billing-exempt (no charge on any product). Staff accounts are skipped.`
                  : `${selectedIds.size} selected user(s) will be charged normally again.`)}
          </Alert>
          {bulkGrant && (
            <CustomTextField fullWidth label='Reason (optional)' placeholder='e.g. promo / migration / partners'
              value={bulkReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkReason(e.target.value)} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)} color='inherit' disabled={bulkSaving}>Cancel</Button>
          <Button onClick={handleBulkFree} variant='contained' color={bulkGrant ? 'success' : 'warning'} disabled={bulkSaving}>
            {bulkSaving ? 'Applying...' : bulkMode === 'all-customers' ? (bulkGrant ? 'Free all customers' : 'Remove from all') : (bulkGrant ? 'Make free' : 'Remove free')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default UsersPage
