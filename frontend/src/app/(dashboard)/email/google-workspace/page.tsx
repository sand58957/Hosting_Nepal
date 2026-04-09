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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────

interface GWorkspacePlan {
  id: string
  name: string
  priceNprMonth: number
  period: string
  features: string[]
}

interface GWorkspaceAccount {
  id: string
  domain: string
  plan?: string
  users?: number
  status: string
  adminEmail?: string
  email?: string
  provider: string
}

interface Domain {
  id: string
  domain: string
  name?: string
}

// ── Fallback plans ─────────────────────────────────────────────────

const fallbackPlans: GWorkspacePlan[] = [
  {
    id: 'gw-starter',
    name: 'Business Starter',
    priceNprMonth: 1436,
    period: 'mo',
    features: [
      'Custom business email (@yourcompany)',
      '30 GB cloud storage per user',
      'Google Meet (100 participants)',
      'Google Docs, Sheets, Slides',
      'Google Chat',
      'Security & management controls',
      'Standard support',
    ],
  },
  {
    id: 'gw-standard',
    name: 'Business Standard',
    priceNprMonth: 2872,
    period: 'mo',
    features: [
      'All Business Starter features',
      '2 TB cloud storage per user',
      'Google Meet (150 participants + recording)',
      'Shared drives for teams',
      'AppSheet Core (no-code development)',
      'Enhanced security & compliance',
      'Standard support',
    ],
  },
  {
    id: 'gw-plus',
    name: 'Business Plus',
    priceNprMonth: 4309,
    period: 'mo',
    features: [
      'All Business Standard features',
      '5 TB cloud storage per user',
      'Google Meet (500 participants + attendance tracking)',
      'Google Vault for archiving & retention',
      'Advanced endpoint management',
      'Enhanced security & compliance',
      'Enhanced support',
    ],
  },
]

// ── Status colors ──────────────────────────────────────────────────

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  DISABLED: 'error',
}

// ── Component ──────────────────────────────────────────────────────

const GoogleWorkspacePage = () => {
  // State
  const [plans, setPlans] = useState<GWorkspacePlan[]>(fallbackPlans)
  const [accounts, setAccounts] = useState<GWorkspaceAccount[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [plansLoading, setPlansLoading] = useState(true)

  // Order dialog
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderDomain, setOrderDomain] = useState('')
  const [orderPlan, setOrderPlan] = useState('')
  const [orderUsers, setOrderUsers] = useState(1)
  const [orderAdminEmail, setOrderAdminEmail] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState('')

  // Add user dialog
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserAccount, setAddUserAccount] = useState<GWorkspaceAccount | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  // Remove user dialog
  const [removeUserOpen, setRemoveUserOpen] = useState(false)
  const [removeUserAccount, setRemoveUserAccount] = useState<GWorkspaceAccount | null>(null)
  const [removeUserEmail, setRemoveUserEmail] = useState('')
  const [removingUser, setRemovingUser] = useState(false)

  // ── Fetch data ─────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/email')
      const d = res.data?.data?.data ?? res.data?.data ?? res.data
      const all = Array.isArray(d?.emails) ? d.emails : Array.isArray(d) ? d : []
      setAccounts(all.filter((e: any) => e.provider === 'GOOGLE_WORKSPACE'))
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/email/plans')
        const d = res.data?.data?.data ?? res.data?.data ?? res.data
        const allPlans = Array.isArray(d?.plans) ? d.plans : Array.isArray(d) ? d : []
        const gwPlans = allPlans.filter(
          (p: any) => p.provider === 'GOOGLE_WORKSPACE' || p.type === 'GOOGLE_WORKSPACE'
        )
        if (gwPlans.length > 0) setPlans(gwPlans)
      } catch {
        // use fallback
      } finally {
        setPlansLoading(false)
      }
    }

    const fetchDomains = async () => {
      try {
        const res = await api.get('/domains')
        const d = res.data?.data?.data ?? res.data?.data ?? res.data
        setDomains(Array.isArray(d?.domains) ? d.domains : Array.isArray(d) ? d : [])
      } catch {
        // silently handle
      }
    }

    fetchPlans()
    fetchAccounts()
    fetchDomains()
  }, [fetchAccounts])

  // ── Handlers ───────────────────────────────────────────────────

  const handleOrder = async () => {
    if (!orderDomain || !orderPlan) return
    setOrdering(true)
    setOrderError('')
    setOrderSuccess('')

    try {
      await api.post('/email', {
        domain: orderDomain,
        provider: 'GOOGLE_WORKSPACE',
        plan: orderPlan,
        users: orderUsers,
        adminEmail: orderAdminEmail || undefined,
      })
      setOrderSuccess('Google Workspace order placed successfully!')
      setOrderOpen(false)
      setOrderDomain('')
      setOrderPlan('')
      setOrderUsers(1)
      setOrderAdminEmail('')
      fetchAccounts()
    } catch (err: any) {
      setOrderError(err.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setOrdering(false)
    }
  }

  const handleAddUser = async () => {
    if (!addUserAccount || !newUserEmail) return
    setAddingUser(true)

    try {
      await api.post(`/email/${addUserAccount.id}/users`, {
        email: newUserEmail,
        name: newUserName || undefined,
      })
      setAddUserOpen(false)
      setNewUserEmail('')
      setNewUserName('')
      setAddUserAccount(null)
      fetchAccounts()
    } catch {
      // silently handle
    } finally {
      setAddingUser(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!removeUserAccount || !removeUserEmail) return
    setRemovingUser(true)

    try {
      await api.delete(`/email/${removeUserAccount.id}/users`, {
        data: { email: removeUserEmail },
      })
      setRemoveUserOpen(false)
      setRemoveUserEmail('')
      setRemoveUserAccount(null)
      fetchAccounts()
    } catch {
      // silently handle
    } finally {
      setRemovingUser(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#28C76F20',
              color: '#28C76F',
            }}
          >
            <i className='tabler-brand-google' style={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant='h4'>Google Workspace</Typography>
            <Typography variant='body2' color='text.secondary'>
              Gmail, Drive, Meet, Docs and more for your business
            </Typography>
          </Box>
        </Box>
      </Grid>

      {orderSuccess && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setOrderSuccess('')}>
            {orderSuccess}
          </Alert>
        </Grid>
      )}

      {/* Plans & Pricing */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' sx={{ mb: 1 }}>
          Plans & Pricing
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          Get the best of Google for your business with Google Workspace
        </Typography>
      </Grid>

      {plansLoading
        ? [...Array(3)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton height={30} width='60%' />
                  <Skeleton height={50} width='40%' sx={{ mt: 1 }} />
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} height={24} sx={{ mt: 1 }} />
                  ))}
                  <Skeleton height={40} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        : plans.map((plan, idx) => (
            <Grid key={plan.id || idx} size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  border: idx === 1 ? '2px solid' : '1px solid',
                  borderColor: idx === 1 ? 'success.main' : 'divider',
                  position: 'relative',
                }}
              >
                {idx === 1 && (
                  <Chip
                    label='Recommended'
                    color='success'
                    size='small'
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                  />
                )}
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant='h6' fontWeight={600}>
                    {plan.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Per user pricing
                  </Typography>

                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant='h4' fontWeight={700} color='success.main'>
                      NPR {plan.priceNprMonth.toLocaleString()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      /user/{plan.period}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ flex: 1 }}>
                    {plan.features.map((feature, fi) => (
                      <Box key={fi} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                        <i
                          className='tabler-circle-check-filled'
                          style={{ fontSize: 16, color: '#28C76F', marginTop: 3 }}
                        />
                        <Typography variant='body2'>{feature}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    variant={idx === 1 ? 'contained' : 'outlined'}
                    color='success'
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={() => {
                      setOrderPlan(plan.id || plan.name)
                      setOrderOpen(true)
                    }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}

      {/* My Google Workspace Accounts */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='My Google Workspace Accounts'
            action={
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant='outlined'
                  startIcon={<i className='tabler-external-link' />}
                  onClick={() => window.open('https://admin.google.com', '_blank')}
                >
                  Google Admin
                </Button>
                <Button
                  variant='contained'
                  color='success'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setOrderOpen(true)}
                >
                  Order New
                </Button>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : accounts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-brand-google' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No Google Workspace accounts yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Get started with Google Workspace for professional email, storage, and collaboration.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Users</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>
                            {account.domain}
                          </Typography>
                          {account.adminEmail && (
                            <Typography variant='caption' color='text.secondary'>
                              Admin: {account.adminEmail}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={account.plan || 'Business Starter'}
                            size='small'
                            variant='outlined'
                            color='success'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>
                            {account.users ?? 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={account.status}
                            size='small'
                            color={statusColorMap[account.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Tooltip title='Add User'>
                            <IconButton
                              size='small'
                              color='success'
                              onClick={() => {
                                setAddUserAccount(account)
                                setAddUserOpen(true)
                              }}
                            >
                              <i className='tabler-user-plus' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Remove User'>
                            <IconButton
                              size='small'
                              color='warning'
                              onClick={() => {
                                setRemoveUserAccount(account)
                                setRemoveUserOpen(true)
                              }}
                            >
                              <i className='tabler-user-minus' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Open Google Admin'>
                            <IconButton
                              size='small'
                              onClick={() => window.open('https://admin.google.com', '_blank')}
                            >
                              <i className='tabler-external-link' style={{ fontSize: 18 }} />
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

      {/* ── Order Dialog ────────────────────────────────────────── */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Order Google Workspace</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          {orderError && (
            <Alert severity='error' onClose={() => setOrderError('')}>
              {orderError}
            </Alert>
          )}
          <CustomTextField
            select
            fullWidth
            label='Domain'
            value={orderDomain}
            onChange={(e) => setOrderDomain(e.target.value)}
          >
            {domains.length === 0 ? (
              <MenuItem disabled>No domains available</MenuItem>
            ) : (
              domains.map((d) => (
                <MenuItem key={d.id} value={d.domain || d.name}>
                  {d.domain || d.name}
                </MenuItem>
              ))
            )}
          </CustomTextField>
          <CustomTextField
            select
            fullWidth
            label='Plan'
            value={orderPlan}
            onChange={(e) => setOrderPlan(e.target.value)}
          >
            {plans.map((p) => (
              <MenuItem key={p.id} value={p.id || p.name}>
                {p.name} - NPR {p.priceNprMonth.toLocaleString()}/user/{p.period}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            fullWidth
            type='number'
            label='Number of Users'
            value={orderUsers}
            onChange={(e) => setOrderUsers(Math.max(1, parseInt(e.target.value) || 1))}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <CustomTextField
            fullWidth
            label='Admin Email'
            placeholder='admin@yourdomain.com'
            value={orderAdminEmail}
            onChange={(e) => setOrderAdminEmail(e.target.value)}
            helperText='Primary admin email for the Google Workspace account'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='success'
            onClick={handleOrder}
            disabled={ordering || !orderDomain || !orderPlan}
          >
            {ordering ? 'Placing Order...' : 'Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add User Dialog ─────────────────────────────────────── */}
      <Dialog open={addUserOpen} onClose={() => setAddUserOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <Typography variant='body2' color='text.secondary'>
            Add a new user to Google Workspace for <strong>{addUserAccount?.domain}</strong>
          </Typography>
          <CustomTextField
            fullWidth
            label='Email Address'
            placeholder={`user@${addUserAccount?.domain || 'yourdomain.com'}`}
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <CustomTextField
            fullWidth
            label='Full Name'
            placeholder='John Doe'
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='success'
            onClick={handleAddUser}
            disabled={addingUser || !newUserEmail}
          >
            {addingUser ? 'Adding...' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Remove User Dialog ──────────────────────────────────── */}
      <Dialog open={removeUserOpen} onClose={() => setRemoveUserOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Remove User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <Typography variant='body2' color='text.secondary'>
            Remove a user from Google Workspace for <strong>{removeUserAccount?.domain}</strong>
          </Typography>
          <CustomTextField
            fullWidth
            label='Email Address to Remove'
            placeholder={`user@${removeUserAccount?.domain || 'yourdomain.com'}`}
            value={removeUserEmail}
            onChange={(e) => setRemoveUserEmail(e.target.value)}
          />
          <Alert severity='warning'>
            Removing a user will delete their mailbox and all associated data. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveUserOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleRemoveUser}
            disabled={removingUser || !removeUserEmail}
          >
            {removingUser ? 'Removing...' : 'Remove User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default GoogleWorkspacePage
