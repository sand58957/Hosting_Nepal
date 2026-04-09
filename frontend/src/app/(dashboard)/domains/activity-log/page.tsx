'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface ActivityEntry {
  id: string
  action: string
  domain: string
  details: string
  user: string
  createdAt: string
}

const actionTypes = ['All', 'REGISTERED', 'RENEWED', 'TRANSFERRED', 'DNS_UPDATED', 'LOCKED', 'UNLOCKED', 'DELETED', 'EXPIRED', 'AUTO_RENEWED']

const actionColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default'> = {
  REGISTERED: 'success',
  RENEWED: 'primary',
  TRANSFERRED: 'info',
  DNS_UPDATED: 'info',
  LOCKED: 'warning',
  UNLOCKED: 'warning',
  DELETED: 'error',
  EXPIRED: 'error',
  AUTO_RENEWED: 'success',
}

const ActivityLogPage = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('All')
  const [domainSearch, setDomainSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/activity-log')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setEntries(Array.isArray(raw?.entries) ? raw.entries : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filtered = entries.filter((e) => {
    const matchAction = actionFilter === 'All' || e.action === actionFilter
    const matchDomain = !domainSearch || e.domain?.toLowerCase().includes(domainSearch.toLowerCase())

    let matchDate = true

    if (dateFrom) {
      matchDate = matchDate && new Date(e.createdAt) >= new Date(dateFrom)
    }

    if (dateTo) {
      matchDate = matchDate && new Date(e.createdAt) <= new Date(dateTo + 'T23:59:59')
    }

    return matchAction && matchDomain && matchDate
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Activity Log</Typography>
            <Typography variant='body2' color='text.secondary'>
              Track all domain-related activities
            </Typography>
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <CustomTextField
                select
                label='Action Type'
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
                sx={{ minWidth: 160 }}
              >
                {actionTypes.map((a) => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                placeholder='Search domain...'
                value={domainSearch}
                onChange={(e) => { setDomainSearch(e.target.value); setPage(0) }}
                sx={{ minWidth: 200 }}
                slotProps={{
                  input: {
                    startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#aaa' }} />,
                  },
                }}
              />
              <CustomTextField
                label='From'
                type='date'
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 150 }}
              />
              <CustomTextField
                label='To'
                type='date'
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 150 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-history' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No activity log entries found
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell>User</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Typography variant='body2'>
                              {new Date(entry.createdAt).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.action}
                              size='small'
                              color={actionColorMap[entry.action] || 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>{entry.domain}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {entry.details}
                            </Typography>
                          </TableCell>
                          <TableCell>{entry.user}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component='div'
                  count={filtered.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ActivityLogPage
