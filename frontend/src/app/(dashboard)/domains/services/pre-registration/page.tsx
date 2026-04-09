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

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface PreRegistration {
  id: string
  domain: string
  tld: string
  status: string
  createdAt: string
  launchDate?: string
}

interface SearchResult {
  domain: string
  tld: string
  launchDate: string
  available: boolean
}

const statusColorMap: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  REGISTERED: 'success',
  PENDING: 'warning',
  INTERESTED: 'info',
}

const PreRegistrationPage = () => {
  const [registrations, setRegistrations] = useState<PreRegistration[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/services/pre-register')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setRegistrations(Array.isArray(raw?.registrations) ? raw.registrations : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)

    try {
      const res = await api.get(`/domains/services/pre-register/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setSearchResults(Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handlePreRegister = async (domain: string) => {
    setSubmittingId(domain)

    try {
      await api.post('/domains/services/pre-register', { domain })

      // Refresh
      const res = await api.get('/domains/services/pre-register')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setRegistrations(Array.isArray(raw?.registrations) ? raw.registrations : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Pre-Registration</Typography>
            <Typography variant='body2' color='text.secondary'>
              Reserve upcoming domains before they launch
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Search */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Search Upcoming Domains' />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <CustomTextField
                fullWidth
                placeholder='Search for upcoming TLDs or domains...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                slotProps={{
                  input: {
                    startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#aaa' }} />,
                  },
                }}
              />
              <Button variant='contained' onClick={handleSearch} disabled={searching} sx={{ minWidth: 100 }}>
                {searching ? <CircularProgress size={20} /> : 'Search'}
              </Button>
            </Box>

            {searchResults.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>TLD</TableCell>
                      <TableCell>Launch Date</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{result.domain}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={result.tld} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          {result.launchDate ? new Date(result.launchDate).toLocaleDateString() : 'TBD'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size='small'
                            variant='contained'
                            disabled={submittingId === result.domain}
                            onClick={() => handlePreRegister(result.domain)}
                          >
                            {submittingId === result.domain ? <CircularProgress size={16} /> : 'Pre-register'}
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

      {/* Pre-registered Interests */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Your Pre-Registrations' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : registrations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-calendar-plus' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No pre-registrations yet. Search and reserve domains above.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>TLD</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Launch Date</TableCell>
                      <TableCell>Registered On</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{reg.domain}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={reg.tld} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={reg.status}
                            size='small'
                            color={statusColorMap[reg.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {reg.launchDate ? new Date(reg.launchDate).toLocaleDateString() : 'TBD'}
                        </TableCell>
                        <TableCell>{new Date(reg.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
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

export default PreRegistrationPage
