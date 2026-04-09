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
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

import CustomTextField from '@core/components/mui/TextField'

interface Redirect {
  from: string
  to: string
  type: string
}

const RedirectsPage = () => {
  const [redirects, setRedirects] = useState<Redirect[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('301')

  const handleAdd = () => {
    setRedirects((prev) => [...prev, { from, to, type }])
    setAddOpen(false)
    setFrom('')
    setTo('')
    setType('301')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Domain Redirects'
            subheader='Set up URL redirections for your domains'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Add Redirect</Button>}
          />
          <CardContent>
            {redirects.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-arrows-right-left' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No redirects configured</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Set up domain redirections to forward visitors.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {redirects.map((r, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell><code>{r.from}</code></TableCell>
                        <TableCell><code>{r.to}</code></TableCell>
                        <TableCell><Chip label={r.type === '301' ? '301 Permanent' : '302 Temporary'} size='small' variant='outlined' /></TableCell>
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
        <DialogTitle>Add Redirect</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Redirect From' value={from} onChange={(e) => setFrom(e.target.value)} placeholder='/old-page' />
            <CustomTextField fullWidth label='Redirect To' value={to} onChange={(e) => setTo(e.target.value)} placeholder='https://example.com/new-page' />
            <FormControl fullWidth>
              <InputLabel>Redirect Type</InputLabel>
              <Select value={type} label='Redirect Type' onChange={(e) => setType(e.target.value)}>
                <MenuItem value='301'>301 - Permanent Redirect</MenuItem>
                <MenuItem value='302'>302 - Temporary Redirect</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!from || !to}>Add Redirect</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default RedirectsPage
