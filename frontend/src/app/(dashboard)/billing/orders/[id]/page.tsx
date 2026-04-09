'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import api from '@/lib/api'

interface PaymentRecord {
  id: string
  gateway: string
  gatewayTransactionId: string
  amountNpr: number
  status: string
  createdAt: string
}

interface InvoiceRecord {
  id: string
  invoiceNumber: string
  totalNpr: number
  status: string
}

interface OrderDetail {
  id: string
  orderNumber: string
  serviceType: string
  planName: string | null
  durationMonths: number
  amountNpr: number
  vatAmountNpr: number
  totalAmountNpr: number
  discountAmountNpr: number
  promoCode: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  payments: PaymentRecord[]
  invoices: InvoiceRecord[]
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  DRAFT: 'warning',
  OVERDUE: 'error',
  CANCELLED: 'error',
  FAILED: 'error',
  EXPIRED: 'error',
  REFUNDED: 'info'
}

const formatServiceType = (type: string) =>
  type?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || '-'

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const gateways = [
  { value: 'KHALTI', label: 'Khalti', icon: 'tabler-wallet', color: '#5C2D91' },
  { value: 'ESEWA', label: 'eSewa', icon: 'tabler-brand-cashapp', color: '#60BB46' },
  { value: 'WALLET', label: 'Wallet Balance', icon: 'tabler-coin', color: '#FF9800' }
]

const OrderDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState('')
  const [paying, setPaying] = useState(false)

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000) }
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 5000) }

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get(`/billing/orders/${orderId}`)
      const data = res.data?.data ?? res.data

      setOrder(data)
    } catch (err: any) {
      if (err.response?.status === 404) setErrorMsg('Order not found')
      else if (err.response?.status === 403) setErrorMsg('You do not have access to this order')
      else setErrorMsg('Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleConfirmPay = async () => {
    if (!selectedGateway) return

    setPaying(true)

    try {
      const res = await api.post(`/billing/orders/${orderId}/pay`, {
        gateway: selectedGateway,
        returnUrl: window.location.href
      })

      const data = res.data?.data ?? res.data

      if (selectedGateway === 'WALLET') {
        setPayDialogOpen(false)
        showSuccess('Payment completed via wallet!')
        fetchOrder()
      } else if (data?.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setPayDialogOpen(false)
        showSuccess('Payment initiated!')
        fetchOrder()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      showError(Array.isArray(msg) ? msg.join(', ') : msg || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const handleCancelOrder = async () => {
    setActionLoading('cancel')
    setCancelDialogOpen(false)

    try {
      await api.post(`/billing/orders/${orderId}/cancel`)
      showSuccess('Order cancelled')
      fetchOrder()
    } catch (err: any) {
      const msg = err.response?.data?.message
      showError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to cancel order')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}><Skeleton height={60} /></Grid>
        <Grid size={{ xs: 12 }}><Skeleton height={200} /></Grid>
        <Grid size={{ xs: 12 }}><Skeleton height={200} /></Grid>
      </Grid>
    )
  }

  if (!order) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-receipt-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>{errorMsg || 'Order not found'}</Typography>
                <Button variant='outlined' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/billing')} sx={{ mt: 3 }}>
                  Back to Billing
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  const isPending = order.status === 'PENDING'

  return (
    <Grid container spacing={6}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      {/* Order Header */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Button size='small' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/billing')} sx={{ mb: 2 }}>
                  Back to Billing
                </Button>
                <Typography variant='h5' sx={{ mb: 2 }}>Order {order.orderNumber}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={formatServiceType(order.serviceType)} size='small' variant='outlined' />
                  {order.planName && <Chip label={order.planName} size='small' variant='outlined' />}
                  <Chip label={order.status} size='small' color={statusColorMap[order.status] || 'default'} />
                  <Chip label={`${order.durationMonths} month${order.durationMonths > 1 ? 's' : ''}`} size='small' variant='outlined' />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Typography variant='caption' color='text.secondary'>Created: {formatDateTime(order.createdAt)}</Typography>
                  <Typography variant='caption' color='text.secondary'>Updated: {formatDateTime(order.updatedAt)}</Typography>
                </Box>
              </Box>
              {isPending && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='contained'
                    onClick={() => { setSelectedGateway(''); setPayDialogOpen(true) }}
                    startIcon={<i className='tabler-credit-card' />}
                  >
                    Pay Now
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={actionLoading === 'cancel'}
                    startIcon={actionLoading === 'cancel' ? <CircularProgress size={16} /> : <i className='tabler-x' />}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Pricing Breakdown */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>Order Summary</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                <Typography variant='body2'>NPR {order.amountNpr?.toLocaleString()}</Typography>
              </Box>
              {order.discountAmountNpr > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>
                    Discount {order.promoCode && <Chip label={order.promoCode} size='small' sx={{ ml: 0.5, height: 20 }} />}
                  </Typography>
                  <Typography variant='body2' color='success.main'>-NPR {order.discountAmountNpr?.toLocaleString()}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>VAT (13%)</Typography>
                <Typography variant='body2'>NPR {order.vatAmountNpr?.toLocaleString()}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='subtitle1' fontWeight={700}>Total</Typography>
                <Typography variant='subtitle1' fontWeight={700}>NPR {order.totalAmountNpr?.toLocaleString()}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Related Invoices */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>Invoices</Typography>
            {!order.invoices?.length ? (
              <Typography variant='body2' color='text.secondary'>No invoices for this order.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {order.invoices.map(inv => (
                  <Box
                    key={inv.id}
                    onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                    sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                      cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <i className='tabler-file-invoice' style={{ fontSize: 20, color: '#666' }} />
                      <Typography variant='body2' fontWeight={500}>{inv.invoiceNumber}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='body2'>NPR {inv.totalNpr?.toLocaleString()}</Typography>
                      <Chip label={inv.status} size='small' color={statusColorMap[inv.status] || 'default'} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Payment History */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>Payment History</Typography>
            {!order.payments?.length ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <i className='tabler-cash-off' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>No payments recorded yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Gateway</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Chip label={p.gateway} size='small' variant='outlined' /></TableCell>
                        <TableCell>NPR {p.amountNpr?.toLocaleString()}</TableCell>
                        <TableCell><Chip label={p.status} size='small' color={statusColorMap[p.status] || 'default'} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.gatewayTransactionId || '-'}</TableCell>
                        <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Payment Gateway Dialog */}
      <Dialog open={payDialogOpen} onClose={() => !paying && setPayDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Select Payment Method</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {gateways.map(gw => (
              <Card
                key={gw.value}
                variant='outlined'
                onClick={() => setSelectedGateway(gw.value)}
                sx={{
                  cursor: 'pointer',
                  borderColor: selectedGateway === gw.value ? 'primary.main' : 'divider',
                  borderWidth: selectedGateway === gw.value ? 2 : 1,
                  bgcolor: selectedGateway === gw.value ? 'primary.lighter' : 'transparent',
                  '&:hover': { borderColor: 'primary.main' }
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Avatar sx={{ bgcolor: gw.color, width: 40, height: 40 }}>
                    <i className={gw.icon} style={{ fontSize: 20, color: '#fff' }} />
                  </Avatar>
                  <Typography variant='body1' fontWeight={500}>{gw.label}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)} disabled={paying}>Cancel</Button>
          <Button variant='contained' onClick={handleConfirmPay} disabled={!selectedGateway || paying}
            startIcon={paying ? <CircularProgress size={16} /> : <i className='tabler-credit-card' />}>
            Pay Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            Are you sure you want to cancel order <strong>{order.orderNumber}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Order</Button>
          <Button variant='contained' color='error' onClick={handleCancelOrder}>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default OrderDetailPage
