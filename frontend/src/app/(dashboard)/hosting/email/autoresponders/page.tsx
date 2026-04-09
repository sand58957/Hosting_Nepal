'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
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

import CustomTextField from '@core/components/mui/TextField'

interface Autoresponder {
  email: string
  subject: string
  message: string
  enabled: boolean
}

const AutorespondersPage = () => {
  const [responders, setResponders] = useState<Autoresponder[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const handleAdd = () => {
    setResponders((prev) => [...prev, { email, subject, message, enabled: true }])
    setAddOpen(false)
    setEmail('')
    setSubject('')
    setMessage('')
  }

  const toggleResponder = (idx: number) => {
    setResponders((prev) => prev.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)))
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Email Autoresponders'
            subheader='Set up automatic email replies'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Add Autoresponder</Button>}
          />
          <CardContent>
            {responders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-message-reply' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No autoresponders</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Set up automatic replies for your email accounts.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Enabled</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {responders.map((r, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.subject}</TableCell>
                        <TableCell><Switch checked={r.enabled} onChange={() => toggleResponder(idx)} /></TableCell>
                        <TableCell align='right'>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />}>Delete</Button>
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Autoresponder</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Email Account' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='info@yourdomain.com' />
            <CustomTextField fullWidth label='Subject' value={subject} onChange={(e) => setSubject(e.target.value)} placeholder='Out of Office' />
            <CustomTextField fullWidth label='Message' multiline rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder='Thank you for your email...' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!email || !subject || !message}>Add</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default AutorespondersPage
