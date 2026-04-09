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
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────

interface TitanPlan {
  id: string
  name: string
  mailboxes: number | string
  storage: string
  priceNprYear: number
  period: string
  features: string[]
}

interface EmailAccount {
  id: string
  email: string
  domain: string
  provider: string
  plan?: string
  status: string
  storageUsed?: string
  storageLimit?: string
}

interface Forwarder {
  id: string
  from: string
  to: string
}

interface Domain {
  id: string
  domain: string
  name?: string
}

// ── Fallback plans ─────────────────────────────────────────────────

const fallbackPlans: TitanPlan[] = [
  {
    id: 'titan-starter',
    name: 'Titan Starter',
    mailboxes: 1,
    storage: '5 GB',
    priceNprYear: 1656,
    period: 'yr',
    features: [
      'Professional email address',
      '5 GB storage per mailbox',
      'Webmail access',
      'Mobile apps (iOS & Android)',
      'Email forwarding',
      'Basic spam protection',
    ],
  },
  {
    id: 'titan-business',
    name: 'Titan Business',
    mailboxes: 5,
    storage: '25 GB',
    priceNprYear: 3576,
    period: 'yr',
    features: [
      'Up to 5 mailboxes',
      '25 GB total storage',
      'Read receipts & email templates',
      'Custom signatures',
      'Calendar & contacts sync',
      'Advanced spam protection',
      'Priority support',
    ],
  },
  {
    id: 'titan-pro',
    name: 'Titan Pro',
    mailboxes: 'Unlimited',
    storage: '50 GB',
    priceNprYear: 16569,
    period: 'yr',
    features: [
      'Unlimited mailboxes',
      '50 GB total storage',
      'All Business features',
      'Email tracking & analytics',
      'Follow-up reminders',
      'Undo send',
      'Dedicated support',
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

const TitanEmailPage = () => {
  // State
  const [plans, setPlans] = useState<TitanPlan[]>(fallbackPlans)
  const [emails, setEmails] = useState<EmailAccount[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [plansLoading, setPlansLoading] = useState(true)

  // Order dialog
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderDomain, setOrderDomain] = useState('')
  const [orderPlan, setOrderPlan] = useState('')
  const [orderMailboxes, setOrderMailboxes] = useState(1)
  const [ordering, setOrdering] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState('')

  // Change password dialog
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdEmail, setPwdEmail] = useState<EmailAccount | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  // Forwarders dialog
  const [fwdOpen, setFwdOpen] = useState(false)
  const [fwdEmail, setFwdEmail] = useState<EmailAccount | null>(null)
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [fwdLoading, setFwdLoading] = useState(false)
  const [newFwdTo, setNewFwdTo] = useState('')
  const [addingFwd, setAddingFwd] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState<EmailAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch data ─────────────────────────────────────────────────

  const fetchEmails = useCallback(async () => {
    try {
      const res = await api.get('/email')
      const d = res.data?.data?.data ?? res.data?.data ?? res.data
      const all: EmailAccount[] = Array.isArray(d?.emails) ? d.emails : Array.isArray(d) ? d : []
      setEmails(all.filter(e => e.provider === 'TITAN'))
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
        const titanPlans = allPlans.filter((p: any) => p.provider === 'TITAN' || p.type === 'TITAN')
        if (titanPlans.length > 0) setPlans(titanPlans)
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
    fetchEmails()
    fetchDomains()
  }, [fetchEmails])

  // ── Handlers ───────────────────────────────────────────────────

  const handleOrder = async () => {
    if (!orderDomain || !orderPlan) return
    setOrdering(true)
    setOrderError('')
    setOrderSuccess('')

    try {
      await api.post('/email', {
        domain: orderDomain,
        provider: 'TITAN',
        plan: orderPlan,
        mailboxes: orderMailboxes,
      })
      setOrderSuccess('Titan Email order placed successfully!')
      setOrderOpen(false)
      setOrderDomain('')
      setOrderPlan('')
      setOrderMailboxes(1)
      fetchEmails()
    } catch (err: any) {
      setOrderError(err.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setOrdering(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwdEmail || !newPassword) return
    setPwdLoading(true)

    try {
      await api.put(`/email/${pwdEmail.id}/password`, { password: newPassword })
      setPwdOpen(false)
      setNewPassword('')
      setPwdEmail(null)
    } catch {
      // silently handle
    } finally {
      setPwdLoading(false)
    }
  }

  const fetchForwarders = async (emailAccount: EmailAccount) => {
    setFwdLoading(true)

    try {
      const res = await api.get(`/email/${emailAccount.id}/forwarders`)
      const d = res.data?.data?.data ?? res.data?.data ?? res.data
      setForwarders(Array.isArray(d?.forwarders) ? d.forwarders : Array.isArray(d) ? d : [])
    } catch {
      setForwarders([])
    } finally {
      setFwdLoading(false)
    }
  }

  const handleAddForwarder = async () => {
    if (!fwdEmail || !newFwdTo) return
    setAddingFwd(true)

    try {
      await api.post(`/email/${fwdEmail.id}/forwarders`, { to: newFwdTo })
      setNewFwdTo('')
      fetchForwarders(fwdEmail)
    } catch {
      // silently handle
    } finally {
      setAddingFwd(false)
    }
  }

  const handleDeleteForwarder = async (fwdId: string) => {
    if (!fwdEmail) return

    try {
      await api.delete(`/email/${fwdEmail.id}/forwarders/${fwdId}`)
      fetchForwarders(fwdEmail)
    } catch {
      // silently handle
    }
  }

  const handleDeleteEmail = async () => {
    if (!deleteEmail) return
    setDeleting(true)

    try {
      await api.delete(`/email/${deleteEmail.id}`)
      setDeleteOpen(false)
      setDeleteEmail(null)
      fetchEmails()
    } catch {
      // silently handle
    } finally {
      setDeleting(false)
    }
  }

  const parseStorage = (val?: string) => {
    if (!val) return 0
    const num = parseFloat(val)
    if (val.toLowerCase().includes('gb')) return num * 1024
    return num
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
              backgroundColor: 'primary.lighter',
              color: 'primary.main',
            }}
          >
            <i className='tabler-mail-star' style={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant='h4'>Titan Email</Typography>
            <Typography variant='body2' color='text.secondary'>
              Professional email hosting powered by Titan
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
          Choose the perfect Titan Email plan for your business
        </Typography>
      </Grid>

      {plansLoading
        ? [...Array(3)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton height={30} width='60%' />
                  <Skeleton height={50} width='40%' sx={{ mt: 1 }} />
                  {[...Array(4)].map((_, j) => (
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
                  borderColor: idx === 1 ? 'primary.main' : 'divider',
                  position: 'relative',
                }}
              >
                {idx === 1 && (
                  <Chip
                    label='Popular'
                    color='primary'
                    size='small'
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                  />
                )}
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant='h6' fontWeight={600}>
                    {plan.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {plan.mailboxes === 'Unlimited' ? 'Unlimited' : plan.mailboxes} Mailbox
                    {plan.mailboxes !== 1 && plan.mailboxes !== 'Unlimited' ? 'es' : ''}
                    {' '}&bull; {plan.storage} Storage
                  </Typography>

                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant='h4' fontWeight={700} color='primary.main'>
                      NPR {plan.priceNprYear.toLocaleString()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      /{plan.period}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ flex: 1 }}>
                    {plan.features.map((feature, fi) => (
                      <Box key={fi} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <i
                          className='tabler-circle-check-filled'
                          style={{ fontSize: 16, color: '#28C76F' }}
                        />
                        <Typography variant='body2'>{feature}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    variant={idx === 1 ? 'contained' : 'outlined'}
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={() => {
                      setOrderPlan(plan.id || plan.name)
                      setOrderOpen(true)
                    }}
                  >
                    Order Now
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}

      {/* My Titan Email Accounts */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='My Titan Email Accounts'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setOrderOpen(true)}
              >
                Order New
              </Button>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : emails.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-mail-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No Titan email accounts yet
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Order a Titan Email plan to get started with professional email.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Storage Used</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emails.map((email) => {
                      const usedMB = parseStorage(email.storageUsed)
                      const limitMB = parseStorage(email.storageLimit)
                      const pct = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0

                      return (
                        <TableRow key={email.id}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>
                              {email.email}
                            </Typography>
                          </TableCell>
                          <TableCell>{email.domain}</TableCell>
                          <TableCell>
                            <Chip label={email.plan || 'Starter'} size='small' variant='outlined' />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={email.status}
                              size='small'
                              color={statusColorMap[email.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 120 }}>
                              <Typography variant='caption'>
                                {email.storageUsed || '0 MB'} / {email.storageLimit || 'N/A'}
                              </Typography>
                              <LinearProgress
                                variant='determinate'
                                value={pct}
                                sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                color={pct > 90 ? 'error' : pct > 70 ? 'warning' : 'primary'}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Change Password'>
                              <IconButton
                                size='small'
                                onClick={() => {
                                  setPwdEmail(email)
                                  setPwdOpen(true)
                                }}
                              >
                                <i className='tabler-key' style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Forwarders'>
                              <IconButton
                                size='small'
                                onClick={() => {
                                  setFwdEmail(email)
                                  setFwdOpen(true)
                                  fetchForwarders(email)
                                }}
                              >
                                <i className='tabler-arrow-forward' style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Delete'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => {
                                  setDeleteEmail(email)
                                  setDeleteOpen(true)
                                }}
                              >
                                <i className='tabler-trash' style={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ── Order Dialog ────────────────────────────────────────── */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Order Titan Email</DialogTitle>
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
                {p.name} - NPR {p.priceNprYear.toLocaleString()}/{p.period}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            fullWidth
            type='number'
            label='Number of Mailboxes'
            value={orderMailboxes}
            onChange={(e) => setOrderMailboxes(Math.max(1, parseInt(e.target.value) || 1))}
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleOrder}
            disabled={ordering || !orderDomain || !orderPlan}
          >
            {ordering ? 'Placing Order...' : 'Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Change Password Dialog ──────────────────────────────── */}
      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <Typography variant='body2' color='text.secondary'>
            Change password for <strong>{pwdEmail?.email}</strong>
          </Typography>
          <CustomTextField
            fullWidth
            type='password'
            label='New Password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder='Enter new password'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPwdOpen(false); setNewPassword('') }}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleChangePassword}
            disabled={pwdLoading || !newPassword}
          >
            {pwdLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Forwarders Dialog ───────────────────────────────────── */}
      <Dialog open={fwdOpen} onClose={() => setFwdOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Email Forwarders</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            Manage forwarders for <strong>{fwdEmail?.email}</strong>
          </Typography>

          {fwdLoading ? (
            <Box>
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} height={40} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : forwarders.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2, textAlign: 'center', py: 2 }}>
              No forwarders configured
            </Typography>
          ) : (
            <List dense sx={{ mb: 2 }}>
              {forwarders.map((fwd) => (
                <ListItem
                  key={fwd.id}
                  secondaryAction={
                    <IconButton
                      edge='end'
                      size='small'
                      color='error'
                      onClick={() => handleDeleteForwarder(fwd.id)}
                    >
                      <i className='tabler-trash' style={{ fontSize: 16 }} />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <i className='tabler-arrow-forward' style={{ fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText primary={fwd.to} secondary={`From: ${fwd.from}`} />
                </ListItem>
              ))}
            </List>
          )}

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              fullWidth
              label='Forward to email'
              placeholder='forward@example.com'
              value={newFwdTo}
              onChange={(e) => setNewFwdTo(e.target.value)}
            />
            <Button
              variant='contained'
              onClick={handleAddForwarder}
              disabled={addingFwd || !newFwdTo}
              sx={{ minWidth: 100 }}
            >
              {addingFwd ? 'Adding...' : 'Add'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFwdOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Delete Email Account</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            Are you sure you want to delete <strong>{deleteEmail?.email}</strong>? This action cannot be
            undone and all data will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant='contained' color='error' onClick={handleDeleteEmail} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default TitanEmailPage
