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
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Auction {
  id: string
  domain: string
  currentBid: number
  minBid: number
  bidders: number
  endTime: string
  status: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  ENDING_SOON: 'warning',
  ENDED: 'error',
  UPCOMING: 'default',
}

const AuctionsPage = () => {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  // Bid dialog
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/investor/auctions')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setAuctions(Array.isArray(raw?.auctions) ? raw.auctions : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getTimeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now()

    if (diff <= 0) return 'Ended'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`

    return `${hours}h ${minutes}m`
  }

  const handlePlaceBid = async () => {
    if (!selectedAuction || !bidAmount) return

    setBidding(true)

    try {
      await api.post(`/domains/investor/auctions/${selectedAuction.id}/bid`, {
        amount: Number(bidAmount),
      })

      setBidDialogOpen(false)
      setSelectedAuction(null)
      setBidAmount('')

      // Refresh
      const res = await api.get('/domains/investor/auctions')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setAuctions(Array.isArray(raw?.auctions) ? raw.auctions : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setBidding(false)
    }
  }

  const openBidDialog = (auction: Auction) => {
    setSelectedAuction(auction)
    setBidAmount(String((auction.currentBid || auction.minBid || 0) + 100))
    setBidDialogOpen(true)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Auctions</Typography>
            <Typography variant='body2' color='text.secondary'>
              Bid on premium domains in active auctions
            </Typography>
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Auction Listings' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : auctions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-gavel' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No active auctions at the moment
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Current Bid</TableCell>
                      <TableCell>Time Left</TableCell>
                      <TableCell>Bidders</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auctions.map((auction) => (
                      <TableRow key={auction.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{auction.domain}</Typography>
                        </TableCell>
                        <TableCell>NPR {auction.currentBid?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant='body2' color={
                            getTimeLeft(auction.endTime) === 'Ended' ? 'error.main' : 'text.primary'
                          }>
                            {getTimeLeft(auction.endTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>{auction.bidders}</TableCell>
                        <TableCell>
                          <Chip
                            label={auction.status}
                            size='small'
                            color={statusColorMap[auction.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size='small'
                            variant='contained'
                            disabled={auction.status === 'ENDED'}
                            onClick={() => openBidDialog(auction)}
                          >
                            Place Bid
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

      {/* Bid Dialog */}
      <Dialog open={bidDialogOpen} onClose={() => setBidDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Place Bid on {selectedAuction?.domain}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant='body2' color='text.secondary'>
              Current bid: NPR {selectedAuction?.currentBid?.toLocaleString()}
            </Typography>
            <CustomTextField
              label='Your Bid (NPR)'
              type='number'
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handlePlaceBid} disabled={bidding}>
            {bidding ? <CircularProgress size={20} /> : 'Place Bid'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default AuctionsPage
