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
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'

interface DnsRecord {
  type: string
  name: string
  value: string
  ttl: number
}

const defaultRecords: DnsRecord[] = [
  { type: 'A', name: '@', value: '192.168.1.1', ttl: 3600 },
  { type: 'CNAME', name: 'www', value: 'example.com', ttl: 3600 },
  { type: 'MX', name: '@', value: 'mail.example.com', ttl: 3600 },
  { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600 },
]

const DnsPage = () => {
  const [records, setRecords] = useState<DnsRecord[]>(defaultRecords)
  const [addOpen, setAddOpen] = useState(false)
  const [type, setType] = useState('A')
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [ttl, setTtl] = useState('3600')

  const handleAdd = () => {
    setRecords((prev) => [...prev, { type, name, value, ttl: parseInt(ttl) }])
    setAddOpen(false)
    setType('A')
    setName('')
    setValue('')
    setTtl('3600')
  }

  const typeColors: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'error'> = {
    A: 'primary', AAAA: 'primary', CNAME: 'success', MX: 'info', TXT: 'warning', NS: 'error', SRV: 'error',
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='DNS Zone Editor'
            subheader='Manage DNS records for your hosting account'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Add Record</Button>}
          />
          <CardContent>
            <Alert severity='info' sx={{ mb: 3 }}>
              Changes to DNS records may take up to 24 hours to propagate globally.
            </Alert>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>TTL</TableCell>
                    <TableCell align='right'>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell><Chip label={r.type} size='small' color={typeColors[r.type] || 'default'} /></TableCell>
                      <TableCell><Typography variant='body2' fontWeight={500}>{r.name}</Typography></TableCell>
                      <TableCell><code style={{ fontSize: 13 }}>{r.value}</code></TableCell>
                      <TableCell>{r.ttl}s</TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button size='small' startIcon={<i className='tabler-edit' />}>Edit</Button>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />}>Delete</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add DNS Record</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Record Type</InputLabel>
              <Select value={type} label='Record Type' onChange={(e) => setType(e.target.value)}>
                {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
              </Select>
            </FormControl>
            <CustomTextField fullWidth label='Name' value={name} onChange={(e) => setName(e.target.value)} placeholder='@ or subdomain' />
            <CustomTextField fullWidth label='Value' value={value} onChange={(e) => setValue(e.target.value)} placeholder='IP address or hostname' />
            <CustomTextField fullWidth label='TTL (seconds)' value={ttl} onChange={(e) => setTtl(e.target.value)} type='number' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!name || !value}>Add Record</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DnsPage
