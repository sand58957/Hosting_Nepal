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
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'

interface ParkedDomain {
  domain: string
  createdAt: string
}

const ParkedDomainsPage = () => {
  const [domains, setDomains] = useState<ParkedDomain[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [domain, setDomain] = useState('')

  const handleAdd = () => {
    setDomains((prev) => [...prev, { domain, createdAt: new Date().toISOString() }])
    setAddOpen(false)
    setDomain('')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Parked Domains'
            subheader='Park additional domains that point to your main website'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Park Domain</Button>}
          />
          <CardContent>
            <Alert severity='info' sx={{ mb: 3 }}>
              Parked domains show the same content as your main domain. Point the parked domain's DNS to our nameservers first.
            </Alert>
            {domains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-parking' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No parked domains</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Park additional domains to display the same content as your main site.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Added</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {domains.map((d, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell><Typography variant='body2' fontWeight={500}>{d.domain}</Typography></TableCell>
                        <TableCell><Chip label='Active' size='small' color='success' /></TableCell>
                        <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />}>Remove</Button>
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
        <DialogTitle>Park a Domain</DialogTitle>
        <DialogContent>
          <CustomTextField fullWidth label='Domain Name' value={domain} onChange={(e) => setDomain(e.target.value)} placeholder='addon-domain.com' sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!domain}>Park Domain</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ParkedDomainsPage
