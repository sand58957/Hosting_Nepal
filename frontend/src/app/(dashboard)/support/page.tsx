'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  category: string
  priority: string
  status: string
  updatedAt: string
  createdAt: string
}

interface TicketCategory {
  value: string
  label: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  WAITING_ON_CUSTOMER: 'warning',
  WAITING_ON_STAFF: 'info',
  RESOLVED: 'success',
  CLOSED: 'default'
}

const priorityColorMap: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  URGENT: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info'
}

const filterOptions = ['All', 'Open', 'In Progress', 'Waiting on Me', 'Resolved', 'Closed']

const filterMap: Record<string, string> = {
  Open: 'OPEN',
  'In Progress': 'IN_PROGRESS',
  'Waiting on Me': 'WAITING_ON_CUSTOMER',
  Resolved: 'RESOLVED',
  Closed: 'CLOSED'
}

const SupportPage = () => {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // Create ticket dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)

    try {
      const params: Record<string, any> = { page: page + 1, limit: rowsPerPage }

      if (activeFilter !== 'All') {
        params.status = filterMap[activeFilter]
      }

      const response = await api.get('/support', { params })
      const data = response.data?.data?.data ?? response.data?.data ?? response.data
      const ticketList = data?.tickets ?? data?.data ?? (Array.isArray(data) ? data : [])
      const meta = data?.meta

      setTickets(Array.isArray(ticketList) ? ticketList : [])
      setTotal(meta?.total ?? ticketList?.length ?? 0)
    } catch {
      // handled by interceptor for 401
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, activeFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/support/categories')
        const data = res.data?.data?.data ?? res.data?.data ?? res.data

        setCategories(Array.isArray(data) ? data : [])
      } catch {
        // categories will be empty
      }
    }

    fetchCategories()
  }, [])

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setPage(0)
  }

  const handleCloseDialog = () => {
    if (submitting) return

    setCreateOpen(false)
    setSubject('')
    setCategory('')
    setPriority('MEDIUM')
    setMessage('')
    setFormError(null)
    setSubmitted(false)
  }

  const handleCreateTicket = async () => {
    setSubmitted(true)

    if (!subject.trim() || !category || !message.trim()) {
      setFormError('Please fill in all required fields.')

      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      await api.post('/support', {
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority
      })

      handleCloseDialog()
      setSuccessMsg('Ticket created successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchTickets()
    } catch (err: any) {
      const msg = err.response?.data?.message

      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {successMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Support Tickets'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setCreateOpen(true)}
              >
                New Ticket
              </Button>
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap' }}>
              {filterOptions.map(filter => (
                <Chip
                  key={filter}
                  label={filter}
                  variant={activeFilter === filter ? 'filled' : 'outlined'}
                  color={activeFilter === filter ? 'primary' : 'default'}
                  onClick={() => handleFilterChange(filter)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : tickets.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-help-circle-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No tickets found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {activeFilter === 'All'
                    ? 'Create a new ticket if you need help.'
                    : `No ${activeFilter.toLowerCase()} tickets.`}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ticket #</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map(ticket => (
                        <TableRow
                          key={ticket.id}
                          onClick={() => router.push(`/support/${ticket.id}`)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>{ticket.ticketNumber || ticket.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>
                              {ticket.subject}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={ticket.category?.replace('_', ' ')} size='small' variant='outlined' />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.priority}
                              size='small'
                              color={priorityColorMap[ticket.priority] || 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.status?.replace(/_/g, ' ')}
                              size='small'
                              color={statusColorMap[ticket.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell>{new Date(ticket.updatedAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component='div'
                  count={total}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => {
                    setRowsPerPage(parseInt(e.target.value, 10))
                    setPage(0)
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Create Support Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {formError && (
              <Alert severity='error' onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <CustomTextField
              fullWidth
              label='Subject'
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder='Brief description of your issue'
              error={submitted && !subject.trim()}
              helperText={submitted && !subject.trim() ? 'Subject is required' : ''}
            />

            <FormControl fullWidth error={submitted && !category}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label='Category' onChange={e => setCategory(e.target.value as string)}>
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={priority} label='Priority' onChange={e => setPriority(e.target.value as string)}>
                <MenuItem value='LOW'>Low</MenuItem>
                <MenuItem value='MEDIUM'>Medium</MenuItem>
                <MenuItem value='HIGH'>High</MenuItem>
                <MenuItem value='URGENT'>Urgent</MenuItem>
              </Select>
            </FormControl>

            <CustomTextField
              fullWidth
              label='Message'
              value={message}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
              multiline
              rows={5}
              placeholder='Describe your issue in detail...'
              error={submitted && !message.trim()}
              helperText={submitted && !message.trim() ? 'Message is required' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateTicket}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <i className='tabler-send' />}
          >
            Submit Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SupportPage
