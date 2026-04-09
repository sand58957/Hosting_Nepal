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
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import api from '@/lib/api'

interface InvoiceItem {
  description: string
  serviceType: string
  planName: string
  durationMonths: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface InvoicePdfData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  status: string
  customer: {
    name: string
    email: string
    phone: string | null
    companyName: string | null
  }
  company: {
    name: string
    address: string
    panNumber: string
    phone: string
    email: string
    website: string
  }
  items: InvoiceItem[]
  subtotal: number
  discount: number
  promoCode: string | null
  vatRate: number
  vatAmount: number
  total: number
  currency: string
  orderNumber: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PAID: 'success',
  DRAFT: 'warning',
  SENT: 'info',
  OVERDUE: 'error',
  CANCELLED: 'error',
  VOID: 'default'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const InvoiceDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [pdfData, setPdfData] = useState<InvoicePdfData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await api.get(`/billing/invoices/${invoiceId}/pdf`)
      const data = res.data?.data ?? res.data

      setPdfData(data)
    } catch (err: any) {
      if (err.response?.status === 404) setErrorMsg('Invoice not found')
      else if (err.response?.status === 403) setErrorMsg('You do not have access to this invoice')
      else setErrorMsg('Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}><Skeleton height={60} /></Grid>
        <Grid size={{ xs: 12 }}><Skeleton height={500} /></Grid>
      </Grid>
    )
  }

  if (!pdfData) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-file-invoice' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>{errorMsg || 'Invoice not found'}</Typography>
                <Button variant='outlined' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/billing?tab=invoices')} sx={{ mt: 3 }}>
                  Back to Invoices
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Header (hidden in print) */}
      <Grid size={{ xs: 12 }} sx={{ '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Button size='small' startIcon={<i className='tabler-arrow-left' />} onClick={() => router.push('/billing?tab=invoices')}>
            Back to Invoices
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={pdfData.status} color={statusColorMap[pdfData.status] || 'default'} />
            <Button variant='outlined' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
              Print
            </Button>
          </Box>
        </Box>
      </Grid>

      {/* Invoice Document */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ '@media print': { boxShadow: 'none', border: 'none' } }}>
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            {/* Company & Invoice Meta */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3, mb: 5 }}>
              <Box>
                <Typography variant='h5' fontWeight={700} color='primary.main' sx={{ mb: 1 }}>
                  {pdfData.company.name}
                </Typography>
                <Typography variant='body2' color='text.secondary'>{pdfData.company.address}</Typography>
                <Typography variant='body2' color='text.secondary'>PAN: {pdfData.company.panNumber}</Typography>
                <Typography variant='body2' color='text.secondary'>{pdfData.company.phone}</Typography>
                <Typography variant='body2' color='text.secondary'>{pdfData.company.email}</Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant='h4' fontWeight={800} color='text.secondary' sx={{ mb: 1 }}>INVOICE</Typography>
                <Typography variant='body1' fontWeight={600}>{pdfData.invoiceNumber}</Typography>
                <Typography variant='body2' color='text.secondary'>Date: {formatDate(pdfData.issueDate)}</Typography>
                <Typography variant='body2' color='text.secondary'>Due: {formatDate(pdfData.dueDate)}</Typography>
                {pdfData.paidAt && (
                  <Typography variant='body2' color='success.main' fontWeight={500}>Paid: {formatDate(pdfData.paidAt)}</Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  <Chip label={pdfData.status} size='small' color={statusColorMap[pdfData.status] || 'default'} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Customer Info */}
            <Box sx={{ mb: 4 }}>
              <Typography variant='overline' color='text.secondary'>Bill To</Typography>
              <Typography variant='body1' fontWeight={600}>{pdfData.customer.name}</Typography>
              <Typography variant='body2' color='text.secondary'>{pdfData.customer.email}</Typography>
              {pdfData.customer.phone && (
                <Typography variant='body2' color='text.secondary'>{pdfData.customer.phone}</Typography>
              )}
              {pdfData.customer.companyName && (
                <Typography variant='body2' color='text.secondary'>{pdfData.customer.companyName}</Typography>
              )}
            </Box>

            {/* Line Items */}
            <TableContainer sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><Typography variant='subtitle2'>Description</Typography></TableCell>
                    <TableCell align='center'><Typography variant='subtitle2'>Duration</Typography></TableCell>
                    <TableCell align='center'><Typography variant='subtitle2'>Qty</Typography></TableCell>
                    <TableCell align='right'><Typography variant='subtitle2'>Unit Price</Typography></TableCell>
                    <TableCell align='right'><Typography variant='subtitle2'>Total</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pdfData.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>{item.description}</Typography>
                        {item.planName && (
                          <Typography variant='caption' color='text.secondary'>{item.planName}</Typography>
                        )}
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2'>{item.durationMonths} mo</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2'>{item.quantity}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>NPR {item.unitPrice?.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>NPR {item.totalPrice?.toLocaleString()}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ width: { xs: '100%', sm: 300 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                  <Typography variant='body2'>NPR {pdfData.subtotal?.toLocaleString()}</Typography>
                </Box>
                {pdfData.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Discount {pdfData.promoCode && `(${pdfData.promoCode})`}
                    </Typography>
                    <Typography variant='body2' color='success.main'>-NPR {pdfData.discount?.toLocaleString()}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2' color='text.secondary'>VAT ({pdfData.vatRate}%)</Typography>
                  <Typography variant='body2'>NPR {pdfData.vatAmount?.toLocaleString()}</Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='h6' fontWeight={700}>Total</Typography>
                  <Typography variant='h6' fontWeight={700}>NPR {pdfData.total?.toLocaleString()}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Footer */}
            <Divider sx={{ my: 4 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant='caption' color='text.secondary'>
                Order Reference: {pdfData.orderNumber}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {pdfData.company.website}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .MuiDrawer-root, .MuiAppBar-root, nav, header, footer { display: none !important; }
          #__next { padding: 0 !important; margin: 0 !important; }
          .MuiCard-root { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .MuiCard-root * { visibility: visible !important; }
        }
      `}</style>
    </Grid>
  )
}

export default InvoiceDetailPage
