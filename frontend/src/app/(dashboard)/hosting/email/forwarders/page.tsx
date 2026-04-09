'use client'

import { useState } from 'react'

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
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'

interface Forwarder {
  from: string
  to: string
}

const ForwardersPage = () => {
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const handleAdd = () => {
    setForwarders((prev) => [...prev, { from, to }])
    setAddOpen(false)
    setFrom('')
    setTo('')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Email Forwarders'
            subheader='Forward emails from one address to another'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Add Forwarder</Button>}
          />
          <CardContent>
            {forwarders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-mail-forward' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No email forwarders</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Set up email forwarding to redirect emails to another address.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {forwarders.map((f, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{f.from}</TableCell>
                        <TableCell>{f.to}</TableCell>
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
        <DialogTitle>Add Email Forwarder</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Forward From' value={from} onChange={(e) => setFrom(e.target.value)} placeholder='info@yourdomain.com' />
            <CustomTextField fullWidth label='Forward To' value={to} onChange={(e) => setTo(e.target.value)} placeholder='youremail@gmail.com' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!from || !to}>Add</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ForwardersPage
