'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'

interface DomainHttps {
  domain: string
  httpsEnforced: boolean
  sslActive: boolean
}

const HttpsPage = () => {
  const [domains, setDomains] = useState<DomainHttps[]>([
    { domain: 'example.com', httpsEnforced: true, sslActive: true },
  ])

  const toggleHttps = (domain: string) => {
    setDomains((prev) =>
      prev.map((d) => (d.domain === domain ? { ...d, httpsEnforced: !d.httpsEnforced } : d))
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='HTTPS Enforce' subheader='Force HTTPS connections for your domains' />
          <CardContent>
            <Alert severity='info' sx={{ mb: 4 }}>
              Enabling HTTPS enforce will redirect all HTTP traffic to HTTPS. Make sure you have an active SSL certificate installed.
            </Alert>
            {domains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-shield-lock' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No domains found</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>SSL Status</TableCell>
                      <TableCell align='right'>HTTPS Enforce</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {domains.map((d) => (
                      <TableRow key={d.domain} hover>
                        <TableCell><Typography variant='body2' fontWeight={500}>{d.domain}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <i className={d.sslActive ? 'tabler-lock' : 'tabler-lock-off'} style={{ fontSize: 16, color: d.sslActive ? '#4caf50' : '#f44336' }} />
                            <Typography variant='body2'>{d.sslActive ? 'Active' : 'Inactive'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align='right'>
                          <Switch checked={d.httpsEnforced} onChange={() => toggleHttps(d.domain)} disabled={!d.sslActive} />
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

export default HttpsPage
