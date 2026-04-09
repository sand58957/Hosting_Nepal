'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

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
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Order {
  id: string
  orderNumber: string
  serviceType: string
  planName: string | null
  amountNpr: number
  vatAmountNpr: number
  totalAmountNpr: number
  discountAmountNpr: number
  durationMonths: number
  status: string
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  totalNpr: number
  subtotalNpr: number
  vatAmountNpr: number
  status: string
  dueDate: string
  paidAt?: string
  createdAt: string
}

interface Payment {
  id: string
  gateway: string
  gatewayTransactionId: string
  amountNpr: number
  status: string
  createdAt: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  DRAFT: 'warning',
  SENT: 'info',
  OVERDUE: 'error',
  CANCELLED: 'error',
  FAILED: 'error',
  EXPIRED: 'error',
  REFUNDED: 'info',
  VOID: 'default'
}

const formatServiceType = (type: string) =>
  type
    ?.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase()) || '-'

const tabParamMap: Record<string, number> = { orders: 0, invoices: 1, payments: 2 }

const gateways = [
  { value: 'KHALTI', label: 'Khalti', icon: 'tabler-wallet', color: '#5C2D91' },
  { value: 'ESEWA', label: 'eSewa', icon: 'tabler-brand-cashapp', color: '#60BB46' },
  { value: 'WALLET', label: 'Wallet Balance', icon: 'tabler-coin', color: '#FF9800' }
]

const BillingPageInner = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const [currentTab, setCurrentTab] = useState(tabParam ? (tabParamMap[tabParam] ?? 0) : 0)
  const [orders, setOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedGateway, setSelectedGateway] = useState('')
  const [paying, setPaying] = useState(false)

  // Top-up dialog
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpGateway, setTopUpGateway] = useState('')
  const [toppingUp, setToppingUp] = useState(false)

  // Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, invoicesRes, paymentsRes, walletRes] = await Promise.allSettled([
        api.get('/billing/orders'),
        api.get('/billing/invoices'),
        api.get('/billing/payments'),
        api.get('/billing/wallet/balance')
      ])

      if (ordersRes.status === 'fulfilled') {
        const raw = ordersRes.value.data?.data?.data ?? ordersRes.value.data?.data ?? ordersRes.value.data
        setOrders(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [])
      }

      if (invoicesRes.status === 'fulfilled') {
        const raw = invoicesRes.value.data?.data?.data ?? invoicesRes.value.data?.data ?? invoicesRes.value.data
        setInvoices(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [])
      }

      if (paymentsRes.status === 'fulfilled') {
        const raw = paymentsRes.value.data?.data?.data ?? paymentsRes.value.data?.data ?? paymentsRes.value.data
        setPayments(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [])
      }

      if (walletRes.status === 'fulfilled') {
        const raw = walletRes.value.data?.data ?? walletRes.value.data
        setWalletBalance(raw?.balance ?? 0)
      }
    } catch {
      // handled by interceptor for 401
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePayOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setSelectedGateway('')
    setPayDialogOpen(true)
  }

  const handleConfirmPay = async () => {
    if (!selectedOrderId || !selectedGateway) return

    setPaying(true)

    try {
      const res = await api.post(`/billing/orders/${selectedOrderId}/pay`, {
        gateway: selectedGateway,
        returnUrl: window.location.href
      })

      const data = res.data?.data ?? res.data

      if (selectedGateway === 'WALLET') {
        setPayDialogOpen(false)
        showSuccess('Payment completed via wallet!')
        fetchData()
      } else if (data?.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setPayDialogOpen(false)
        showSuccess('Payment initiated!')
        fetchData()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      showError(Array.isArray(msg) ? msg.join(', ') : msg || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const handleConfirmTopUp = async () => {
    const amount = parseInt(topUpAmount)

    if (!amount || amount < 100 || !topUpGateway) return

    setToppingUp(true)

    try {
      const res = await api.post('/billing/wallet/topup', {
        amount,
        gateway: topUpGateway
      })

      const data = res.data?.data ?? res.data

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setTopUpOpen(false)
        showSuccess('Wallet top-up initiated!')
        fetchData()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      showError(Array.isArray(msg) ? msg.join(', ') : msg || 'Top-up failed')
    } finally {
      setToppingUp(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {successMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
        </Grid>
      )}
      {errorMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
        </Grid>
      )}

      {/* Dashboard Cards */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>Wallet Balance</Typography>
              <Typography variant='h4'>NPR {walletBalance.toLocaleString()}</Typography>
              <Button size='small' sx={{ mt: 1 }} onClick={() => { setTopUpAmount(''); setTopUpGateway(''); setTopUpOpen(true) }}>
                <i className='tabler-plus' style={{ fontSize: 14, marginRight: 4 }} />
                Top Up
              </Button>
            </Box>
            <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
              <i className='tabler-wallet' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>Total Orders</Typography>
              <Typography variant='h4'>{orders.length}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <i className='tabler-receipt' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>Pending Invoices</Typography>
              <Typography variant='h4'>
                {invoices.filter(i => ['DRAFT', 'SENT', 'OVERDUE'].includes(i.status)).length}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
              <i className='tabler-file-invoice' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
          </CardContent>
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Billing' />
          <CardContent>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 4 }}>
              <Tab label='Orders' />
              <Tab label='Invoices' />
              <Tab label='Payments' />
            </Tabs>

            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : (
              <>
                {/* Orders Tab */}
                {currentTab === 0 && (
                  orders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <i className='tabler-receipt-off' style={{ fontSize: 48, color: '#ccc' }} />
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>No orders found.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order #</TableCell>
                            <TableCell>Service</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orders.map(order => (
                            <TableRow
                              key={order.id}
                              onClick={() => router.push(`/billing/orders/${order.id}`)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <TableCell>{order.orderNumber || order.id.slice(0, 8)}</TableCell>
                              <TableCell>
                                <Chip label={formatServiceType(order.serviceType)} size='small' variant='outlined' />
                              </TableCell>
                              <TableCell>{order.planName || '-'}</TableCell>
                              <TableCell>NPR {order.totalAmountNpr?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip label={order.status} size='small' color={statusColorMap[order.status] || 'default'} />
                              </TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {order.status === 'PENDING' && (
                                  <Button
                                    size='small'
                                    variant='contained'
                                    onClick={e => { e.stopPropagation(); handlePayOrder(order.id) }}
                                  >
                                    Pay Now
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )
                )}

                {/* Invoices Tab */}
                {currentTab === 1 && (
                  invoices.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <i className='tabler-file-invoice' style={{ fontSize: 48, color: '#ccc' }} />
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>No invoices found.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Invoice #</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Due Date</TableCell>
                            <TableCell>Paid At</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoices.map(invoice => (
                            <TableRow
                              key={invoice.id}
                              onClick={() => router.push(`/billing/invoices/${invoice.id}`)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <TableCell>{invoice.invoiceNumber || invoice.id.slice(0, 8)}</TableCell>
                              <TableCell>NPR {invoice.totalNpr?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip label={invoice.status} size='small' color={statusColorMap[invoice.status] || 'default'} />
                              </TableCell>
                              <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                              <TableCell>{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '-'}</TableCell>
                              <TableCell>
                                <Button
                                  size='small'
                                  variant='outlined'
                                  onClick={e => { e.stopPropagation(); router.push(`/billing/invoices/${invoice.id}`) }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )
                )}

                {/* Payments Tab */}
                {currentTab === 2 && (
                  payments.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <i className='tabler-cash-off' style={{ fontSize: 48, color: '#ccc' }} />
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>No payment records found.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Gateway</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map(payment => (
                            <TableRow key={payment.id}>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {payment.gatewayTransactionId || payment.id.slice(0, 12)}
                              </TableCell>
                              <TableCell>NPR {payment.amountNpr?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip label={payment.gateway} size='small' variant='outlined' />
                              </TableCell>
                              <TableCell>
                                <Chip label={payment.status} size='small' color={statusColorMap[payment.status] || 'default'} />
                              </TableCell>
                              <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )
                )}
              </>
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
          <Button
            variant='contained'
            onClick={handleConfirmPay}
            disabled={!selectedGateway || paying}
            startIcon={paying ? <CircularProgress size={16} /> : <i className='tabler-credit-card' />}
          >
            Pay Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wallet Top-Up Dialog */}
      <Dialog open={topUpOpen} onClose={() => !toppingUp && setTopUpOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Top Up Wallet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField
              fullWidth
              label='Amount (NPR)'
              type='number'
              value={topUpAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopUpAmount(e.target.value)}
              placeholder='Min 100, Max 100,000'
              slotProps={{ htmlInput: { min: 100, max: 100000 } }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {gateways.filter(gw => gw.value !== 'WALLET').map(gw => (
                <Card
                  key={gw.value}
                  variant='outlined'
                  onClick={() => setTopUpGateway(gw.value)}
                  sx={{
                    cursor: 'pointer',
                    borderColor: topUpGateway === gw.value ? 'primary.main' : 'divider',
                    borderWidth: topUpGateway === gw.value ? 2 : 1,
                    bgcolor: topUpGateway === gw.value ? 'primary.lighter' : 'transparent',
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopUpOpen(false)} disabled={toppingUp}>Cancel</Button>
          <Button
            variant='contained'
            onClick={handleConfirmTopUp}
            disabled={!topUpGateway || !topUpAmount || parseInt(topUpAmount) < 100 || toppingUp}
            startIcon={toppingUp ? <CircularProgress size={16} /> : <i className='tabler-wallet' />}
          >
            Top Up
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

const BillingPage = () => (
  <Suspense>
    <BillingPageInner />
  </Suspense>
)

export default BillingPage
