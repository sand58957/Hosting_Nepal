'use client'

import { useState, useEffect } from 'react'

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
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Divider from '@mui/material/Divider'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Transfer {
  id: string
  domain: string
  status: string
  type: string
  initiatedAt: string
  completedAt?: string
}

interface OwnedDomain {
  id: string
  name: string
  authCode?: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
}

const TransfersPage = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [ownedDomains, setOwnedDomains] = useState<OwnedDomain[]>([])
  const [loading, setLoading] = useState(true)

  // Transfer dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferDomain, setTransferDomain] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [ns1, setNs1] = useState('')
  const [ns2, setNs2] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transfersRes, domainsRes] = await Promise.allSettled([
          api.get('/domains/transfers'),
          api.get('/domains'),
        ])

        if (transfersRes.status === 'fulfilled') {
          const raw = transfersRes.value.data?.data?.data ?? transfersRes.value.data?.data ?? transfersRes.value.data
          setTransfers(Array.isArray(raw?.transfers) ? raw.transfers : Array.isArray(raw) ? raw : [])
        }

        if (domainsRes.status === 'fulfilled') {
          const raw = domainsRes.value.data?.data?.data ?? domainsRes.value.data?.data ?? domainsRes.value.data
          setOwnedDomains(Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleTransfer = async () => {
    if (!transferDomain.trim() || !authCode.trim()) return

    setSubmitting(true)

    try {
      await api.post('/domains/transfers', {
        domain: transferDomain,
        authCode,
        nameservers: [ns1, ns2].filter(Boolean),
      })

      setDialogOpen(false)
      setTransferDomain('')
      setAuthCode('')
      setNs1('')
      setNs2('')

      // Refresh
      const res = await api.get('/domains/transfers')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setTransfers(Array.isArray(raw?.transfers) ? raw.transfers : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setSubmitting(false)
    }
  }

  const handleGetAuthCode = async (domainId: string) => {
    try {
      const res = await api.get(`/domains/${domainId}/auth-code`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const code = raw?.authCode || raw?.code

      setOwnedDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, authCode: code || 'N/A' } : d))
      )
    } catch {
      // silently handle
    }
  }

  const inboundTransfers = transfers.filter((t) => t.type === 'INBOUND' || t.type === 'IN')
  const outboundTransfers = transfers.filter((t) => t.type === 'OUTBOUND' || t.type === 'OUT')

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Transfers</Typography>
            <Typography variant='body2' color='text.secondary'>
              Transfer domains in or out of your account
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-transfer' />}
            onClick={() => setDialogOpen(true)}
          >
            Transfer Domain
          </Button>
        </Box>
      </Grid>

      {/* Active/Inbound Transfers */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Inbound Transfers' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : inboundTransfers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-transfer-in' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No inbound transfers
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Initiated</TableCell>
                      <TableCell>Completed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inboundTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{transfer.domain}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transfer.status}
                            size='small'
                            color={statusColorMap[transfer.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(transfer.initiatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {transfer.completedAt ? new Date(transfer.completedAt).toLocaleDateString() : '-'}
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

      {/* Outbound Transfers / Auth Codes */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Outbound Transfers - Get Auth Codes' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : ownedDomains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-world-off' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No domains available for transfer
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Auth/EPP Code</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ownedDomains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{domain.name}</Typography>
                        </TableCell>
                        <TableCell>
                          {domain.authCode ? (
                            <Chip label={domain.authCode} size='small' variant='outlined' />
                          ) : (
                            <Typography variant='body2' color='text.secondary'>Hidden</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size='small'
                            variant='outlined'
                            onClick={() => handleGetAuthCode(domain.id)}
                          >
                            Get Auth Code
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

      {/* Transfer Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Transfer Domain to Your Account</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='Domain Name'
              placeholder='example.com'
              value={transferDomain}
              onChange={(e) => setTransferDomain(e.target.value)}
              fullWidth
            />
            <CustomTextField
              label='Auth/EPP Code'
              placeholder='Enter the authorization code'
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              fullWidth
            />
            <Divider />
            <Typography variant='body2' color='text.secondary'>
              Nameservers (optional)
            </Typography>
            <CustomTextField
              label='Nameserver 1'
              placeholder='ns1.example.com'
              value={ns1}
              onChange={(e) => setNs1(e.target.value)}
              fullWidth
            />
            <CustomTextField
              label='Nameserver 2'
              placeholder='ns2.example.com'
              value={ns2}
              onChange={(e) => setNs2(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleTransfer} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Start Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default TransfersPage
