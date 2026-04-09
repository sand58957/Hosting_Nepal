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
import LinearProgress from '@mui/material/LinearProgress'

import CustomTextField from '@core/components/mui/TextField'

interface EmailAccount {
  email: string
  quota: number
  usedMb: number
  status: string
}

const EmailAccountsPage = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [quota, setQuota] = useState('500')

  const handleCreate = () => {
    setAccounts((prev) => [...prev, { email: email + '@example.com', quota: parseInt(quota), usedMb: 0, status: 'ACTIVE' }])
    setCreateOpen(false)
    setEmail('')
    setPassword('')
    setQuota('500')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Email Accounts'
            subheader='Create and manage email accounts for your domains'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setCreateOpen(true)}>
                Create Email Account
              </Button>
            }
          />
          <CardContent>
            {accounts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-mail' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No email accounts</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Create professional email accounts for your domain.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email Address</TableCell>
                      <TableCell>Usage</TableCell>
                      <TableCell>Quota</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.map((acc, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell><Typography variant='body2' fontWeight={500}>{acc.email}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                            <LinearProgress variant='determinate' value={acc.quota > 0 ? (acc.usedMb / acc.quota) * 100 : 0} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                            <Typography variant='caption'>{acc.usedMb} MB</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{acc.quota} MB</TableCell>
                        <TableCell><Chip label={acc.status} size='small' color='success' /></TableCell>
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create Email Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Email Address' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='info' helperText='Enter the part before @' />
            <CustomTextField fullWidth label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            <CustomTextField fullWidth label='Quota (MB)' type='number' value={quota} onChange={(e) => setQuota(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleCreate} disabled={!email || !password}>Create</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default EmailAccountsPage
