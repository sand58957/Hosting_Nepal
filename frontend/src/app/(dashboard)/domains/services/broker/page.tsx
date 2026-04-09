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

interface BrokerRequest {
  id: string
  targetDomain: string
  maxBudget: number
  contactEmail: string
  message: string
  status: string
  createdAt: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
}

const BrokerPage = () => {
  const [requests, setRequests] = useState<BrokerRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [targetDomain, setTargetDomain] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/services/broker')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setRequests(Array.isArray(raw?.requests) ? raw.requests : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!targetDomain.trim() || !maxBudget || !contactEmail.trim()) return

    setSubmitting(true)

    try {
      await api.post('/domains/services/broker', {
        targetDomain: targetDomain.trim(),
        maxBudget: Number(maxBudget),
        contactEmail: contactEmail.trim(),
        message: message.trim(),
      })

      setTargetDomain('')
      setMaxBudget('')
      setContactEmail('')
      setMessage('')

      // Refresh
      const res = await api.get('/domains/services/broker')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setRequests(Array.isArray(raw?.requests) ? raw.requests : Array.isArray(raw) ? raw : [])
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
            <Typography variant='h4'>Domain Broker Service</Typography>
            <Typography variant='body2' color='text.secondary'>
              Let us acquire premium domains on your behalf
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Request Form */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardHeader title='Request Domain Broker' />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <CustomTextField
                label='Target Domain'
                placeholder='example.com'
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                fullWidth
              />
              <CustomTextField
                label='Max Budget (NPR)'
                type='number'
                placeholder='50000'
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                fullWidth
              />
              <CustomTextField
                label='Contact Email'
                placeholder='you@example.com'
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                fullWidth
              />
              <CustomTextField
                label='Message'
                placeholder='Tell us why you want this domain...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                rows={4}
                fullWidth
              />
              <Button
                variant='contained'
                onClick={handleSubmit}
                disabled={submitting || !targetDomain.trim() || !maxBudget || !contactEmail.trim()}
                fullWidth
              >
                {submitting ? <CircularProgress size={20} /> : 'Submit Broker Request'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Previous Requests */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader title='Previous Requests' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : requests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-briefcase' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No broker requests yet
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Budget</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{req.targetDomain}</Typography>
                        </TableCell>
                        <TableCell>NPR {req.maxBudget?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={req.status}
                            size='small'
                            color={statusColorMap[req.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
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

export default BrokerPage
