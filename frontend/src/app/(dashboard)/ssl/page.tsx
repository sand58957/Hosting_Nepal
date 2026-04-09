'use client'

import { useState, useEffect } from 'react'

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
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface SSLCertificate {
  id: string
  domain: string
  type: string
  status: string
  issuedAt: string
  expiryDate: string
  issuer?: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  ISSUED: 'success',
  PENDING: 'warning',
  EXPIRED: 'error',
  REVOKED: 'error',
}

const SSLPage = () => {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newType, setNewType] = useState('DV')
  const [issuing, setIssuing] = useState(false)

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/ssl')
      const data = response.data.data
      setCertificates(Array.isArray(data?.certificates) ? data.certificates : Array.isArray(data) ? data : [])
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  const handleIssueSSL = async () => {
    if (!newDomain.trim()) return

    setIssuing(true)

    try {
      await api.post('/ssl', { domain: newDomain, type: newType })
      setDialogOpen(false)
      setNewDomain('')
      setNewType('DV')
      fetchCertificates()
    } catch {
      // silently handle
    } finally {
      setIssuing(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='SSL Certificates'
            action={
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setDialogOpen(true)}
              >
                Issue New SSL
              </Button>
            }
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : certificates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-lock-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No SSL certificates found
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  Secure your domains with an SSL certificate.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issued</TableCell>
                      <TableCell>Expiry</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>
                            {cert.domain}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={cert.type} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cert.status}
                            size='small'
                            color={statusColorMap[cert.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(cert.issuedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(cert.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title='Download'>
                            <IconButton size='small'>
                              <i className='tabler-download' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Renew'>
                            <IconButton size='small' color='primary'>
                              <i className='tabler-refresh' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
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

      {/* Issue SSL Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Issue New SSL Certificate</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '16px !important' }}>
          <CustomTextField
            fullWidth
            label='Domain Name'
            placeholder='example.com.np'
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <CustomTextField
            select
            fullWidth
            label='Certificate Type'
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            <MenuItem value='DV'>Domain Validation (DV)</MenuItem>
            <MenuItem value='OV'>Organization Validation (OV)</MenuItem>
            <MenuItem value='EV'>Extended Validation (EV)</MenuItem>
            <MenuItem value='WILDCARD'>Wildcard</MenuItem>
            <MenuItem value='LETS_ENCRYPT'>Let&apos;s Encrypt (Free)</MenuItem>
          </CustomTextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleIssueSSL} disabled={issuing || !newDomain.trim()}>
            {issuing ? 'Issuing...' : 'Issue Certificate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SSLPage
