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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Domain {
  id: string
  name: string
}

interface DnsRecord {
  id: string
  type: string
  host: string
  value: string
  ttl: number
  priority?: number
}

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']

const typeColorMap: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'secondary' | 'error' | 'default'> = {
  A: 'primary',
  AAAA: 'info',
  CNAME: 'success',
  MX: 'warning',
  TXT: 'secondary',
  NS: 'default',
  SRV: 'error',
  CAA: 'default',
}

const DnsManagementPage = () => {
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState('')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [domainsLoading, setDomainsLoading] = useState(true)

  // Add/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null)
  const [formType, setFormType] = useState('A')
  const [formHost, setFormHost] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formTtl, setFormTtl] = useState(3600)
  const [formPriority, setFormPriority] = useState(10)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await api.get('/domains')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : []
        setDomains(list)
        if (list.length > 0) setSelectedDomain(list[0].id)
      } catch {
        // silently handle
      } finally {
        setDomainsLoading(false)
      }
    }

    fetchDomains()
  }, [])

  useEffect(() => {
    if (!selectedDomain) return

    const fetchRecords = async () => {
      setLoading(true)

      try {
        const res = await api.get(`/domains/${selectedDomain}/dns`)
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setRecords(Array.isArray(raw?.records) ? raw.records : Array.isArray(raw) ? raw : [])
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [selectedDomain])

  const openAddDialog = () => {
    setEditingRecord(null)
    setFormType('A')
    setFormHost('')
    setFormValue('')
    setFormTtl(3600)
    setFormPriority(10)
    setDialogOpen(true)
  }

  const openEditDialog = (record: DnsRecord) => {
    setEditingRecord(record)
    setFormType(record.type)
    setFormHost(record.host)
    setFormValue(record.value)
    setFormTtl(record.ttl)
    setFormPriority(record.priority ?? 10)
    setDialogOpen(true)
  }

  const handleSaveRecord = async () => {
    setSaving(true)

    try {
      const payload = {
        type: formType,
        host: formHost,
        value: formValue,
        ttl: formTtl,
        priority: ['MX', 'SRV'].includes(formType) ? formPriority : undefined,
      }

      if (editingRecord) {
        await api.put(`/domains/${selectedDomain}/dns/${editingRecord.id}`, payload)
      } else {
        await api.post(`/domains/${selectedDomain}/dns`, payload)
      }

      // Refresh records
      const res = await api.get(`/domains/${selectedDomain}/dns`)
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setRecords(Array.isArray(raw?.records) ? raw.records : Array.isArray(raw) ? raw : [])
      setDialogOpen(false)
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await api.delete(`/domains/${selectedDomain}/dns/${recordId}`)
      setRecords((prev) => prev.filter((r) => r.id !== recordId))
    } catch {
      // silently handle
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>DNS Management</Typography>
            <Typography variant='body2' color='text.secondary'>
              Manage DNS records for your domains
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={openAddDialog}
            disabled={!selectedDomain}
          >
            Add Record
          </Button>
        </Box>
      </Grid>

      {/* Domain Selector */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {domainsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <CustomTextField
                select
                label='Select Domain'
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                fullWidth
              >
                {domains.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* DNS Records Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='DNS Records' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-dns' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No DNS records found. Add your first record.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Host</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>TTL</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Chip
                            label={record.type}
                            size='small'
                            color={typeColorMap[record.type] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{record.host}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.value}
                          </Typography>
                        </TableCell>
                        <TableCell>{record.ttl}</TableCell>
                        <TableCell>{record.priority ?? '-'}</TableCell>
                        <TableCell>
                          <Tooltip title='Edit'>
                            <IconButton size='small' onClick={() => openEditDialog(record)}>
                              <i className='tabler-edit' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton size='small' color='error' onClick={() => handleDeleteRecord(record.id)}>
                              <i className='tabler-trash' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{editingRecord ? 'Edit DNS Record' : 'Add DNS Record'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              select
              label='Record Type'
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              fullWidth
            >
              {recordTypes.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              label='Host'
              placeholder='@ or subdomain'
              value={formHost}
              onChange={(e) => setFormHost(e.target.value)}
              fullWidth
            />
            <CustomTextField
              label='Value'
              placeholder='IP address or hostname'
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              fullWidth
            />
            <CustomTextField
              label='TTL (seconds)'
              type='number'
              value={formTtl}
              onChange={(e) => setFormTtl(Number(e.target.value))}
              fullWidth
            />
            {['MX', 'SRV'].includes(formType) && (
              <CustomTextField
                label='Priority'
                type='number'
                value={formPriority}
                onChange={(e) => setFormPriority(Number(e.target.value))}
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSaveRecord} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editingRecord ? 'Update' : 'Add Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DnsManagementPage
