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
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import TablePagination from '@mui/material/TablePagination'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Domain {
  id: string
  name: string
  status: string
  expiryDate: string
  autoRenew: boolean
  locked: boolean
  privacy: boolean
  tld: string
  registrar?: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'error',
  SUSPENDED: 'error',
  PENDING: 'warning',
}

const statusOptions = ['All', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED', 'PENDING']
const tldFilterOptions = ['All', '.com', '.net', '.org', '.np', '.com.np']

const PortfolioPage = () => {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tldFilter, setTldFilter] = useState('All')
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await api.get('/domains/portfolio')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setDomains(Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchDomains()
  }, [])

  const filtered = domains.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'All' || d.status === statusFilter
    const matchTld = tldFilter === 'All' || d.name.endsWith(tldFilter)

    return matchSearch && matchStatus && matchTld
  })

  const paginatedDomains = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? paginatedDomains.map((d) => d.id) : [])
  }

  const handleSelectOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleToggleAutoRenew = async (domain: Domain) => {
    try {
      await api.put(`/domains/${domain.id}/auto-renew`, { autoRenew: !domain.autoRenew })
      setDomains((prev) =>
        prev.map((d) => (d.id === domain.id ? { ...d, autoRenew: !d.autoRenew } : d))
      )
    } catch {
      // silently handle
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selected.length === 0) return

    try {
      await api.post('/domains/bulk-action', { domainIds: selected, action })
      setSelected([])
    } catch {
      // silently handle
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Portfolio</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage all your registered domains
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
                label='Status'
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                sx={{ minWidth: 140 }}
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label='TLD'
                value={tldFilter}
                onChange={(e) => { setTldFilter(e.target.value); setPage(0) }}
                sx={{ minWidth: 140 }}
              >
                {tldFilterOptions.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                placeholder='Search domains...'
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
                sx={{ flex: 1, minWidth: 200 }}
                slotProps={{
                  input: {
                    startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#aaa' }} />,
                  },
                }}
              />
            </Box>

            {/* Bulk Action Bar */}
            {selected.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant='body2' sx={{ alignSelf: 'center' }}>
                  {selected.length} domain(s) selected
                </Typography>
                <Button size='small' variant='outlined' onClick={() => handleBulkAction('renew')}>
                  Bulk Renew
                </Button>
                <Button size='small' variant='outlined' onClick={() => handleBulkAction('lock')}>
                  Bulk Lock
                </Button>
                <Button size='small' variant='outlined' color='error' onClick={() => handleBulkAction('delete')}>
                  Bulk Delete
                </Button>
              </Box>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-world-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No domains found
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding='checkbox'>
                          <Checkbox
                            checked={selected.length === paginatedDomains.length && paginatedDomains.length > 0}
                            indeterminate={selected.length > 0 && selected.length < paginatedDomains.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Auto-Renew</TableCell>
                        <TableCell>Lock</TableCell>
                        <TableCell>Privacy</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedDomains.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell padding='checkbox'>
                            <Checkbox
                              checked={selected.includes(domain.id)}
                              onChange={() => handleSelectOne(domain.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>{domain.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={domain.status}
                              size='small'
                              color={statusColorMap[domain.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell>{new Date(domain.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Switch
                              checked={domain.autoRenew}
                              size='small'
                              onChange={() => handleToggleAutoRenew(domain)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={domain.locked ? 'Locked' : 'Unlocked'}
                              size='small'
                              color={domain.locked ? 'success' : 'default'}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={domain.privacy ? 'On' : 'Off'}
                              size='small'
                              color={domain.privacy ? 'success' : 'default'}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title='Manage DNS'>
                              <IconButton size='small'>
                                <i className='tabler-settings' style={{ fontSize: 18 }} />
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

export default PortfolioPage
