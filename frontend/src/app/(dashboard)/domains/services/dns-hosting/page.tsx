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

import api from '@/lib/api'

interface DnsHostingDomain {
  id: string
  name: string
  dnsHostingEnabled: boolean
  records: number
  status: string
}

const DnsHostingPage = () => {
  const [domains, setDomains] = useState<DnsHostingDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [enablingId, setEnablingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/services/dns-hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setDomains(Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleEnableDnsHosting = async (domainId: string) => {
    setEnablingId(domainId)

    try {
      await api.post(`/domains/services/dns-hosting/${domainId}/enable`)
      setDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, dnsHostingEnabled: true } : d))
      )
    } catch {
      // silently handle
    } finally {
      setEnablingId(null)
    }
  }

  const handleDisableDnsHosting = async (domainId: string) => {
    setEnablingId(domainId)

    try {
      await api.post(`/domains/services/dns-hosting/${domainId}/disable`)
      setDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, dnsHostingEnabled: false } : d))
      )
    } catch {
      // silently handle
    } finally {
      setEnablingId(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>DNS Hosting</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage DNS hosting service for your domains
            </Typography>
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Domains' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : domains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-dns' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No domains found. Register a domain first.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>DNS Hosting</TableCell>
                      <TableCell>Records</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {domains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{domain.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={domain.dnsHostingEnabled ? 'Enabled' : 'Disabled'}
                            size='small'
                            color={domain.dnsHostingEnabled ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{domain.records ?? 0}</TableCell>
                        <TableCell>
                          <Chip label={domain.status || 'N/A'} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>
                          {domain.dnsHostingEnabled ? (
                            <Button
                              size='small'
                              variant='outlined'
                              color='error'
                              disabled={enablingId === domain.id}
                              onClick={() => handleDisableDnsHosting(domain.id)}
                            >
                              {enablingId === domain.id ? <CircularProgress size={16} /> : 'Disable'}
                            </Button>
                          ) : (
                            <Button
                              size='small'
                              variant='contained'
                              disabled={enablingId === domain.id}
                              onClick={() => handleEnableDnsHosting(domain.id)}
                            >
                              {enablingId === domain.id ? <CircularProgress size={16} /> : 'Enable DNS Hosting'}
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
    </Grid>
  )
}

export default DnsHostingPage
