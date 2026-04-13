'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

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

import api from '@/lib/api'

interface Order {
  id: string
  orderNumber: string
  type: string
  description: string
  amount: number
  status: string
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
  paidAt?: string
  createdAt: string
}

interface Payment {
  id: string
  transactionId: string
  amount: number
  method: string
  status: string
  createdAt: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  OVERDUE: 'error',
  CANCELLED: 'error',
  FAILED: 'error',
  REFUNDED: 'info',
}

const tabParamMap: Record<string, number> = { orders: 0, invoices: 1, wallet: 2 }

const BillingPageInner = () => {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [currentTab, setCurrentTab] = useState(tabParam ? (tabParamMap[tabParam] ?? 0) : 0)
  const [orders, setOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, invoicesRes] = await Promise.allSettled([
          api.get('/billing/orders'),
          api.get('/billing/invoices'),
        ])

        if (ordersRes.status === 'fulfilled') {
          const data = ordersRes.value.data.data
          setOrders(Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [])
          if (data?.walletBalance !== undefined) {
            setWalletBalance(data.walletBalance)
          }
        }

        if (invoicesRes.status === 'fulfilled') {
          const data = invoicesRes.value.data.data
          setInvoices(Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data) ? data : [])
          if (data?.payments) {
            setPayments(Array.isArray(data.payments) ? data.payments : [])
          }
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <Grid container spacing={6}>
      {/* Wallet Balance */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Wallet Balance
              </Typography>
              <Typography variant='h4'>NPR {walletBalance.toLocaleString()}</Typography>
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
              <Typography variant='body2' color='text.secondary'>
                Total Orders
              </Typography>
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
              <Typography variant='body2' color='text.secondary'>
                Pending Invoices
              </Typography>
              <Typography variant='h4'>
                {invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE').length}
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
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                        No orders found.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order #</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.orderNumber || order.id}</TableCell>
                              <TableCell>{order.type}</TableCell>
                              <TableCell>{order.description}</TableCell>
                              <TableCell>NPR {order.amount?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={order.status}
                                  size='small'
                                  color={statusColorMap[order.status] || 'default'}
                                />
                              </TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                        No invoices found.
                      </Typography>
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
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>{invoice.invoiceNumber || invoice.id}</TableCell>
                              <TableCell>NPR {invoice.amount?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={invoice.status}
                                  size='small'
                                  color={statusColorMap[invoice.status] || 'default'}
                                />
                              </TableCell>
                              <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>
                                <Button size='small' variant='outlined'>
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
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                        No payment records found.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{payment.transactionId || payment.id}</TableCell>
                              <TableCell>NPR {payment.amount?.toLocaleString()}</TableCell>
                              <TableCell>{payment.method}</TableCell>
                              <TableCell>
                                <Chip
                                  label={payment.status}
                                  size='small'
                                  color={statusColorMap[payment.status] || 'default'}
                                />
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
    </Grid>
  )
}

const BillingPage = () => (
  <Suspense>
    <BillingPageInner />
  </Suspense>
)

export default BillingPage
