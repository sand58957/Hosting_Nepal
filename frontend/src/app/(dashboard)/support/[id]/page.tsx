'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface TicketMessage {
  id: string
  message: string
  attachments: string[]
  isInternal: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    email: string
  }
}

interface TicketDetail {
  id: string
  ticketNumber: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  messages: TicketMessage[]
  user?: { id: string; name: string; email: string }
  assignee?: { id: string; name: string; email: string } | null
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

const formatDateTime = (d: string) => {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const TicketDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const user = useAuthStore(s => s.user)

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 5000)
  }

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/support/${ticketId}`)
      const data = res.data?.data?.data ?? res.data?.data ?? res.data

      setTicket(data)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErrorMsg('Ticket not found')
      } else if (err.response?.status === 403) {
        setErrorMsg('You do not have access to this ticket')
      } else {
        setErrorMsg('Failed to load ticket')
      }
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [ticket?.messages?.length])

  const isOwnMessage = (senderId: string) => user?.id === senderId
  const isClosed = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED'

  const handleSendReply = async () => {
    if (!replyContent.trim()) return

    setSending(true)

    try {
      await api.post(`/support/${ticketId}/messages`, { content: replyContent.trim() })
      setReplyContent('')
      await fetchTicket()
      showSuccess('Reply sent')
    } catch {
      showError('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async () => {
    setActionLoading('close')

    try {
      await api.patch(`/support/${ticketId}/close`)
      await fetchTicket()
      showSuccess('Ticket closed')
    } catch {
      showError('Failed to close ticket')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReopenTicket = async () => {
    setActionLoading('reopen')

    try {
      await api.patch(`/support/${ticketId}/reopen`)
      await fetchTicket()
      showSuccess('Ticket reopened')
    } catch {
      showError('Failed to reopen ticket')
    } finally {
      setActionLoading(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && replyContent.trim() && !sending) {
      handleSendReply()
    }
  }

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Skeleton height={60} />
          <Skeleton height={200} sx={{ mt: 2 }} />
          <Skeleton height={300} sx={{ mt: 2 }} />
        </Grid>
      </Grid>
    )
  }

  if (!ticket) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-ticket-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  {errorMsg || 'Ticket not found'}
                </Typography>
                <Button
                  variant='outlined'
                  startIcon={<i className='tabler-arrow-left' />}
                  onClick={() => router.push('/support')}
                  sx={{ mt: 3 }}
                >
                  Back to Tickets
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
      {/* Alerts */}
      {successMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        </Grid>
      )}
      {errorMsg && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        </Grid>
      )}

      {/* Ticket Header */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Button
                  size='small'
                  startIcon={<i className='tabler-arrow-left' />}
                  onClick={() => router.push('/support')}
                  sx={{ mb: 2 }}
                >
                  Back to Tickets
                </Button>
                <Typography variant='h5' sx={{ mb: 2 }}>
                  {ticket.subject}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={ticket.ticketNumber} size='small' variant='outlined' icon={<i className='tabler-hash' />} />
                  <Chip label={ticket.category?.replace(/_/g, ' ')} size='small' variant='outlined' />
                  <Chip
                    label={ticket.priority}
                    size='small'
                    color={priorityColorMap[ticket.priority] || 'default'}
                  />
                  <Chip
                    label={ticket.status?.replace(/_/g, ' ')}
                    size='small'
                    color={statusColorMap[ticket.status] || 'default'}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Typography variant='caption' color='text.secondary'>
                    Created: {formatDateTime(ticket.createdAt)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Updated: {formatDateTime(ticket.updatedAt)}
                  </Typography>
                  {ticket.resolvedAt && (
                    <Typography variant='caption' color='text.secondary'>
                      Resolved: {formatDateTime(ticket.resolvedAt)}
                    </Typography>
                  )}
                  {ticket.assignee && (
                    <Typography variant='caption' color='text.secondary'>
                      Assigned to: {ticket.assignee.name}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box>
                {isClosed ? (
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={handleReopenTicket}
                    disabled={actionLoading === 'reopen'}
                    startIcon={
                      actionLoading === 'reopen' ? (
                        <CircularProgress size={16} />
                      ) : (
                        <i className='tabler-refresh' />
                      )
                    }
                  >
                    Reopen Ticket
                  </Button>
                ) : (
                  <Button
                    variant='outlined'
                    color='warning'
                    onClick={handleCloseTicket}
                    disabled={actionLoading === 'close'}
                    startIcon={
                      actionLoading === 'close' ? (
                        <CircularProgress size={16} />
                      ) : (
                        <i className='tabler-circle-check' />
                      )
                    }
                  >
                    Close Ticket
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Message Thread */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>
              Conversation
            </Typography>

            <Box
              sx={{
                maxHeight: 'calc(100vh - 450px)',
                minHeight: 200,
                overflowY: 'auto',
                py: 2,
                px: 1
              }}
            >
              {ticket.messages?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>
                    No messages yet.
                  </Typography>
                </Box>
              ) : (
                ticket.messages?.map(msg => {
                  const own = isOwnMessage(msg.sender.id)

                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        justifyContent: own ? 'flex-end' : 'flex-start',
                        mb: 2.5
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '75%',
                          display: 'flex',
                          gap: 1.5,
                          flexDirection: own ? 'row-reverse' : 'row'
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: own ? 'primary.main' : 'secondary.main',
                            flexShrink: 0
                          }}
                        >
                          <i className={own ? 'tabler-user' : 'tabler-headset'} style={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Box
                            sx={{
                              bgcolor: own ? 'primary.main' : 'action.hover',
                              color: own ? 'primary.contrastText' : 'text.primary',
                              borderRadius: 2,
                              px: 2.5,
                              py: 1.5
                            }}
                          >
                            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.message}
                            </Typography>
                          </Box>
                          {msg.attachments?.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              {msg.attachments.map((url, i) => (
                                <Chip
                                  key={i}
                                  label={`Attachment ${i + 1}`}
                                  size='small'
                                  variant='outlined'
                                  icon={<i className='tabler-paperclip' />}
                                  onClick={() => window.open(url, '_blank')}
                                  sx={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Box>
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              mt: 0.5,
                              justifyContent: own ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <Typography variant='caption' color='text.secondary'>
                              {msg.sender.name}
                            </Typography>
                            <Typography variant='caption' color='text.disabled'>
                              {formatDateTime(msg.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Reply Form */}
            {isClosed ? (
              <Alert severity='info'>This ticket is closed. Reopen it to send a reply.</Alert>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <CustomTextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder='Type your reply... (Ctrl+Enter to send)'
                  value={replyContent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <Button
                  variant='contained'
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || sending}
                  sx={{ minWidth: 100, height: 56 }}
                  startIcon={sending ? <CircularProgress size={16} /> : <i className='tabler-send' />}
                >
                  Send
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TicketDetailPage
