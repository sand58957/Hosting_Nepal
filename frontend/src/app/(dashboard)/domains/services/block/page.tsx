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
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

const tldOptions = [
  { tld: '.com', price: 1500 },
  { tld: '.net', price: 1400 },
  { tld: '.org', price: 1600 },
  { tld: '.info', price: 1200 },
  { tld: '.biz', price: 1300 },
  { tld: '.co', price: 2500 },
  { tld: '.io', price: 4500 },
  { tld: '.np', price: 500 },
  { tld: '.com.np', price: 300 },
]

const DomainBlockPage = () => {
  const [domainName, setDomainName] = useState('')
  const [selectedTlds, setSelectedTlds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleTldToggle = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    )
  }

  const totalPrice = selectedTlds.reduce((sum, tld) => {
    const option = tldOptions.find((o) => o.tld === tld)

    return sum + (option?.price || 0)
  }, 0)

  const handleBlock = async () => {
    if (!domainName.trim() || selectedTlds.length === 0) return

    setSubmitting(true)
    setSuccess(false)

    try {
      await api.post('/domains/services/block', {
        domain: domainName.trim(),
        tlds: selectedTlds.map((t) => t.replace('.', '')),
      })
      setSuccess(true)
      setDomainName('')
      setSelectedTlds([])
    } catch {
      // silently handle
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Block</Typography>
            <Typography variant='body2' color='text.secondary'>
              Register a domain across multiple TLDs to protect your brand
            </Typography>
          </Box>
        </Box>
      </Grid>

      {success && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccess(false)}>
            Domain block request submitted successfully.
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader title='Select Domain and TLDs' />
          <CardContent>
            <CustomTextField
              label='Domain Name (without TLD)'
              placeholder='example'
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />

            <Typography variant='subtitle2' sx={{ mb: 2 }}>
              Select TLDs to block:
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tldOptions.map((option) => (
                <FormControlLabel
                  key={option.tld}
                  control={
                    <Checkbox
                      checked={selectedTlds.includes(option.tld)}
                      onChange={() => handleTldToggle(option.tld)}
                      size='small'
                    />
                  }
                  label={`${option.tld} (NPR ${option.price.toLocaleString()})`}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardHeader title='Price Estimate' />
          <CardContent>
            {selectedTlds.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  Select TLDs to see price estimate
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Domain</TableCell>
                        <TableCell align='right'>Price/yr</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedTlds.map((tld) => {
                        const option = tldOptions.find((o) => o.tld === tld)

                        return (
                          <TableRow key={tld}>
                            <TableCell>
                              <Typography variant='body2'>
                                {domainName || 'example'}{tld}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              NPR {option?.price?.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow>
                        <TableCell>
                          <Typography variant='subtitle2'>Total</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='subtitle2'>
                            NPR {totalPrice.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Chip label={`${selectedTlds.length} TLD(s)`} size='small' color='primary' />
                </Box>

                <Button
                  variant='contained'
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={handleBlock}
                  disabled={submitting || !domainName.trim()}
                >
                  {submitting ? <CircularProgress size={20} /> : `Block Domain - NPR ${totalPrice.toLocaleString()}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DomainBlockPage
