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
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'

import api from '@/lib/api'

interface AfternicListing {
  id: string
  domain: string
  listingPrice: number
  status: string
  views: number
  inquiries: number
}

const AfternicPage = () => {
  const [connected, setConnected] = useState(false)
  const [listings, setListings] = useState<AfternicListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/investor/afternic')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setConnected(raw?.connected ?? false)
        setListings(Array.isArray(raw?.listings) ? raw.listings : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleConnect = async () => {
    try {
      const res = await api.post('/domains/investor/afternic/connect')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data

      if (raw?.redirectUrl) {
        window.open(raw.redirectUrl, '_blank')
      }
    } catch {
      // silently handle
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Afternic Marketplace</Typography>
            <Typography variant='body2' color='text.secondary'>
              List and sell your domains on the Afternic marketplace
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Info Card */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <i className='tabler-building-store' style={{ fontSize: 28, color: '#fff' }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h5' sx={{ mb: 1 }}>Afternic Integration</Typography>
              <Typography variant='body2' color='text.secondary'>
                Afternic is one of the largest domain aftermarket platforms. Connect your account to list
                domains for sale and reach millions of potential buyers worldwide.
              </Typography>
            </Box>
            <Box>
              {connected ? (
                <Chip label='Connected' color='success' />
              ) : (
                <Button variant='contained' onClick={handleConnect}>
                  Connect Afternic Account
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Features */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48, mx: 'auto', mb: 2 }}>
              <i className='tabler-world' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
            <Typography variant='h6' sx={{ mb: 1 }}>Global Reach</Typography>
            <Typography variant='body2' color='text.secondary'>
              Access millions of domain buyers through a trusted marketplace
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48, mx: 'auto', mb: 2 }}>
              <i className='tabler-currency-dollar' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
            <Typography variant='h6' sx={{ mb: 1 }}>Competitive Pricing</Typography>
            <Typography variant='body2' color='text.secondary'>
              Set your own prices with flexible listing options
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48, mx: 'auto', mb: 2 }}>
              <i className='tabler-shield-check' style={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
            <Typography variant='h6' sx={{ mb: 1 }}>Secure Transfers</Typography>
            <Typography variant='body2' color='text.secondary'>
              Built-in escrow and secure domain transfer process
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Listed Domains */}
      {connected && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Your Afternic Listings' />
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : listings.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <i className='tabler-list' style={{ fontSize: 48, color: '#ccc' }} />
                  <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                    No domains listed on Afternic yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Domain</TableCell>
                        <TableCell>Listing Price</TableCell>
                        <TableCell>Views</TableCell>
                        <TableCell>Inquiries</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>{listing.domain}</Typography>
                          </TableCell>
                          <TableCell>NPR {listing.listingPrice?.toLocaleString()}</TableCell>
                          <TableCell>{listing.views}</TableCell>
                          <TableCell>{listing.inquiries}</TableCell>
                          <TableCell>
                            <Chip
                              label={listing.status}
                              size='small'
                              color={listing.status === 'ACTIVE' ? 'success' : 'default'}
                            />
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
      )}
    </Grid>
  )
}

export default AfternicPage
