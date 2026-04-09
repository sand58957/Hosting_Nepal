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
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'

interface ProtectedUrl {
  path: string
  username: string
  createdAt: string
}

const ProtectedUrlsPage = () => {
  const [urls, setUrls] = useState<ProtectedUrl[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [urlPath, setUrlPath] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleAdd = () => {
    setUrls((prev) => [...prev, { path: urlPath, username, createdAt: new Date().toISOString() }])
    setAddOpen(false)
    setUrlPath('')
    setUsername('')
    setPassword('')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Protected URLs'
            subheader='Password-protect specific directories on your website'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>
                Protect URL
              </Button>
            }
          />
          <CardContent>
            <Alert severity='info' sx={{ mb: 4 }}>
              Protected URLs require a username and password to access. Useful for staging areas, admin panels, or private content.
            </Alert>
            {urls.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-lock-access' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No protected URLs</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Add password protection to specific URLs on your website.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>URL Path</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {urls.map((u, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell><code>{u.path}</code></TableCell>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
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
        <DialogTitle>Protect URL</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='URL Path' value={urlPath} onChange={(e) => setUrlPath(e.target.value)} placeholder='/admin' />
            <CustomTextField fullWidth label='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
            <CustomTextField fullWidth label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!urlPath || !username || !password}>Protect</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ProtectedUrlsPage
