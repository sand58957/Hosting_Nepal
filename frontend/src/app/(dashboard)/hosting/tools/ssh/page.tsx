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

interface SshKey {
  id: string
  name: string
  fingerprint: string
  createdAt: string
}

const SshPage = () => {
  const [keys, setKeys] = useState<SshKey[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [publicKey, setPublicKey] = useState('')

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='SSH Keys Manager'
            subheader='Manage SSH keys for secure server access'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>
                Add SSH Key
              </Button>
            }
          />
          <CardContent>
            {keys.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-key' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No SSH keys added</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Add an SSH key for secure passwordless access to your server.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Fingerprint</TableCell>
                      <TableCell>Added</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id} hover>
                        <TableCell>{key.name}</TableCell>
                        <TableCell><code style={{ fontSize: 12 }}>{key.fingerprint}</code></TableCell>
                        <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
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
        <DialogTitle>Add SSH Key</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Key Name' value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder='My Laptop' />
            <CustomTextField fullWidth label='Public Key' multiline rows={4} value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder='ssh-rsa AAAA...' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' disabled={!keyName || !publicKey}>Add Key</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SshPage
