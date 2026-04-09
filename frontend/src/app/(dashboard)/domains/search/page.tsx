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
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface SearchResult {
  domain: string
  available: boolean
  price: number
  renewPrice: number
  tld: string
  currency: string
  status: string
  premium?: boolean
}

const tldOptions = ['.com', '.net', '.org', '.np', '.com.np', '.io', '.co', '.ai', '.dev', '.app', '.xyz', '.me', '.in', '.tech', '.online', '.site', '.store', '.cloud', '.blog', '.shop']

const DomainSearchPage = () => {
  const [query, setQuery] = useState('')
  const [selectedTlds, setSelectedTlds] = useState<string[]>(['.com', '.net', '.org'])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Registration dialog
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<SearchResult | null>(null)
  const [regYears, setRegYears] = useState(1)
  const [ns1, setNs1] = useState('')
  const [ns2, setNs2] = useState('')
  const [registering, setRegistering] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const tlds = selectedTlds.map((t) => t.replace('.', '')).join(',')
      const res = await api.get(`/domains/search?q=${encodeURIComponent(query.trim())}&tlds=${tlds}`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      const list = Array.isArray(raw) ? raw : raw?.results ?? raw?.data ?? []
      setResults(Array.isArray(list) ? list : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleTldToggle = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    )
  }

  const handleRegister = async () => {
    if (!selectedDomain) return

    setRegistering(true)

    try {
      await api.post('/domains/register', {
        domain: selectedDomain.domain,
        years: regYears,
        nameservers: [ns1, ns2].filter(Boolean),
      })
      setRegisterOpen(false)
      setSelectedDomain(null)
      handleSearch()
    } catch {
      // silently handle
    } finally {
      setRegistering(false)
    }
  }

  const openRegisterDialog = (domain: SearchResult) => {
    setSelectedDomain(domain)
    setRegYears(1)
    setNs1('ns1.hostingnepals.com')
    setNs2('ns2.hostingnepals.com')
    setRegisterOpen(true)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Search & Register Domains</Typography>
            <Typography variant='body2' color='text.secondary'>
              Find your perfect domain name
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Search Card */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <CustomTextField
                fullWidth
                placeholder='Enter domain name to search...'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                slotProps={{
                  input: {
                    startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#aaa' }} />,
                  },
                }}
              />
              <Button variant='contained' onClick={handleSearch} disabled={loading} sx={{ minWidth: 120 }}>
                {loading ? <CircularProgress size={20} /> : 'Search'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {tldOptions.map((tld) => (
                <FormControlLabel
                  key={tld}
                  control={
                    <Checkbox
                      checked={selectedTlds.includes(tld)}
                      onChange={() => handleTldToggle(tld)}
                      size='small'
                    />
                  }
                  label={tld}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Results */}
      {searched && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Search Results' />
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : results.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <i className='tabler-search-off' style={{ fontSize: 48, color: '#ccc' }} />
                  <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                    No results found. Try a different domain name.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Domain Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Register Price</TableCell>
                        <TableCell>Renew Price</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>
                              {result.domain}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={result.available ? 'Available' : 'Taken'}
                              size='small'
                              color={result.available ? 'success' : 'error'}
                            />
                            {result.premium && (
                              <Chip label='Premium' size='small' color='warning' sx={{ ml: 1 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            {result.price ? (
                              <Typography variant='body2' fontWeight={600} color='primary'>
                                NPR {result.price?.toLocaleString()}/yr
                              </Typography>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {result.renewPrice ? (
                              <Typography variant='body2' color='text.secondary'>
                                NPR {result.renewPrice?.toLocaleString()}/yr
                              </Typography>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {result.available ? (
                              <Button
                                size='small'
                                variant='contained'
                                onClick={() => openRegisterDialog(result)}
                              >
                                Register
                              </Button>
                            ) : (
                              <Button size='small' variant='outlined' disabled>
                                Unavailable
                              </Button>
                            )}
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

      {/* Registration Dialog */}
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Register {selectedDomain?.domain}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              select
              label='Registration Period'
              value={regYears}
              onChange={(e) => setRegYears(Number(e.target.value))}
              fullWidth
            >
              {[1, 2, 3, 5, 10].map((y) => (
                <MenuItem key={y} value={y}>
                  {y} {y === 1 ? 'Year' : 'Years'}
                </MenuItem>
              ))}
            </CustomTextField>
            <Typography variant='body2' color='text.secondary' sx={{ mt: -1 }}>
              Default nameservers are pre-filled. You can change them later from DNS Management.
            </Typography>
            <CustomTextField
              label='Nameserver 1'
              placeholder='ns1.hostingnepals.com'
              value={ns1}
              onChange={(e) => setNs1(e.target.value)}
              fullWidth
              helperText='You can update nameservers anytime after registration'
            />
            <CustomTextField
              label='Nameserver 2'
              placeholder='ns2.hostingnepals.com'
              value={ns2}
              onChange={(e) => setNs2(e.target.value)}
              fullWidth
            />
            {selectedDomain && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant='body2'>
                  Total: NPR {((selectedDomain.price || 0) * regYears).toLocaleString()} for {regYears} {regYears === 1 ? 'year' : 'years'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleRegister} disabled={registering}>
            {registering ? <CircularProgress size={20} /> : 'Register'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DomainSearchPage
