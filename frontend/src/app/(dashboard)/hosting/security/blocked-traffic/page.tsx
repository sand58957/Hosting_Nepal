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
import Chip from '@mui/material/Chip'

import CustomTextField from '@core/components/mui/TextField'

interface BlockedIp {
  ip: string
  reason: string
  blockedAt: string
}

const BlockedTrafficPage = () => {
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')

  const handleAdd = () => {
    setBlockedIps((prev) => [...prev, { ip, reason, blockedAt: new Date().toISOString() }])
    setAddOpen(false)
    setIp('')
    setReason('')
  }

  const handleRemove = (ipToRemove: string) => {
    setBlockedIps((prev) => prev.filter((b) => b.ip !== ipToRemove))
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Blocked Traffic'
            subheader='Block specific IP addresses from accessing your website'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>
                Block IP Address
              </Button>
            }
          />
          <CardContent>
            {blockedIps.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-ban' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No blocked IPs</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Add IP addresses to block unwanted traffic to your website.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Blocked On</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {blockedIps.map((b) => (
                      <TableRow key={b.ip} hover>
                        <TableCell><Chip label={b.ip} size='small' variant='outlined' /></TableCell>
                        <TableCell>{b.reason || '-'}</TableCell>
                        <TableCell>{new Date(b.blockedAt).toLocaleDateString()}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />} onClick={() => handleRemove(b.ip)}>
                            Unblock
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Block IP Address</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='IP Address' value={ip} onChange={(e) => setIp(e.target.value)} placeholder='192.168.1.1 or 192.168.1.0/24' />
            <CustomTextField fullWidth label='Reason (optional)' value={reason} onChange={(e) => setReason(e.target.value)} placeholder='Suspicious activity' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' color='error' onClick={handleAdd} disabled={!ip}>Block</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default BlockedTrafficPage
