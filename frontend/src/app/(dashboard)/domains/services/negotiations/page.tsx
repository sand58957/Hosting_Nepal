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

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Negotiation {
  id: string
  domain: string
  maxBudget: number
  message: string
  status: string
  currentOffer?: number
  createdAt: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
}

const NegotiationsPage = () => {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [domain, setDomain] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/services/negotiate')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setNegotiations(Array.isArray(raw?.negotiations) ? raw.negotiations : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!domain.trim() || !maxBudget) return

    setSubmitting(true)

    try {
      await api.post('/domains/services/negotiate', {
        domain: domain.trim(),
        maxBudget: Number(maxBudget),
        message: message.trim(),
      })

      setDomain('')
      setMaxBudget('')
      setMessage('')

      // Refresh
      const res = await api.get('/domains/services/negotiate')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setNegotiations(Array.isArray(raw?.negotiations) ? raw.negotiations : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Negotiations</Typography>
            <Typography variant='body2' color='text.secondary'>
              Negotiate to acquire domains from current owners
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Negotiation Form */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardHeader title='Start Negotiation' />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <CustomTextField
                label='Domain Name'
                placeholder='premium-domain.com'
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                fullWidth
              />
              <CustomTextField
                label='Max Budget (NPR)'
                type='number'
                placeholder='100000'
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                fullWidth
              />
              <CustomTextField
                label='Message'
                placeholder='Your proposal or reason for acquisition...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                rows={4}
                fullWidth
              />
              <Button
                variant='contained'
                onClick={handleSubmit}
                disabled={submitting || !domain.trim() || !maxBudget}
                fullWidth
              >
                {submitting ? <CircularProgress size={20} /> : 'Start Negotiation'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Negotiations */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader title='Active Negotiations' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : negotiations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-messages' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No active negotiations
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Budget</TableCell>
                      <TableCell>Current Offer</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {negotiations.map((neg) => (
                      <TableRow key={neg.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{neg.domain}</Typography>
                        </TableCell>
                        <TableCell>NPR {neg.maxBudget?.toLocaleString()}</TableCell>
                        <TableCell>
                          {neg.currentOffer ? `NPR ${neg.currentOffer.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={neg.status}
                            size='small'
                            color={statusColorMap[neg.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(neg.createdAt).toLocaleDateString()}</TableCell>
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

export default NegotiationsPage
