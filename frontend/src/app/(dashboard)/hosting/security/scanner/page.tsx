'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

const ScannerPage = () => {
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [threats, setThreats] = useState(0)

  const handleScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      setLastScan(new Date().toISOString())
      setThreats(0)
    }, 5000)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Site Scanner' subheader='Scan your website for malware and security vulnerabilities' />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <i className='tabler-shield-check' style={{ fontSize: 40, color: threats === 0 ? '#4caf50' : '#f44336' }} />
                    <Typography variant='h4' sx={{ mt: 1 }}>{threats}</Typography>
                    <Typography variant='body2' color='text.secondary'>Threats Found</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <i className='tabler-clock' style={{ fontSize: 40, color: '#7c3aed' }} />
                    <Typography variant='h6' sx={{ mt: 1 }}>{lastScan ? new Date(lastScan).toLocaleString() : 'Never'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Last Scan</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Chip label={threats === 0 ? 'Clean' : 'Threats Detected'} color={threats === 0 ? 'success' : 'error'} sx={{ mt: 1 }} />
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Status</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {scanning && (
              <Box sx={{ mb: 4 }}>
                <Typography variant='body2' sx={{ mb: 1 }}>Scanning in progress...</Typography>
                <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            )}

            <Button variant='contained' onClick={handleScan} disabled={scanning} startIcon={<i className='tabler-scan' />} size='large'>
              {scanning ? 'Scanning...' : 'Run Scan Now'}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Scan History' />
          <CardContent>
            {!lastScan ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-history' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>No scan history yet. Run your first scan above.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Threats</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow hover>
                      <TableCell>{new Date(lastScan).toLocaleString()}</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell><Chip label='Clean' size='small' color='success' /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ScannerPage
