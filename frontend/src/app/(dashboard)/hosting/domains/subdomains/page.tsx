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

interface Subdomain {
  name: string
  documentRoot: string
  createdAt: string
}

const SubdomainsPage = () => {
  const [subdomains, setSubdomains] = useState<Subdomain[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [docRoot, setDocRoot] = useState('')

  const handleAdd = () => {
    setSubdomains((prev) => [...prev, { name, documentRoot: docRoot || `/public_html/${name}`, createdAt: new Date().toISOString() }])
    setAddOpen(false)
    setName('')
    setDocRoot('')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Subdomains'
            subheader='Create and manage subdomains for your hosting account'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>Create Subdomain</Button>}
          />
          <CardContent>
            {subdomains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-sitemap' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No subdomains</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Create subdomains to organize your website sections.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Subdomain</TableCell>
                      <TableCell>Document Root</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subdomains.map((s, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell><Typography variant='body2' fontWeight={500}>{s.name}</Typography></TableCell>
                        <TableCell><code>{s.documentRoot}</code></TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
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
        <DialogTitle>Create Subdomain</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Subdomain Name' value={name} onChange={(e) => setName(e.target.value)} placeholder='blog.yourdomain.com' />
            <CustomTextField fullWidth label='Document Root (optional)' value={docRoot} onChange={(e) => setDocRoot(e.target.value)} placeholder='/public_html/blog' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!name}>Create</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SubdomainsPage
