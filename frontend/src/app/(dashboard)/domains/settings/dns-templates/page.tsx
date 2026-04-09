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
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface TemplateRecord {
  type: string
  host: string
  value: string
  ttl: number
}

interface DnsTemplate {
  id: string
  name: string
  records: TemplateRecord[]
  createdAt: string
}

const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']

const emptyRecord: TemplateRecord = { type: 'A', host: '@', value: '', ttl: 3600 }

const DnsTemplatesPage = () => {
  const [templates, setTemplates] = useState<DnsTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DnsTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateRecords, setTemplateRecords] = useState<TemplateRecord[]>([{ ...emptyRecord }])
  const [saving, setSaving] = useState(false)

  // Apply dialog
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [applyTemplateId, setApplyTemplateId] = useState('')
  const [applyDomainId, setApplyDomainId] = useState('')
  const [domains, setDomains] = useState<Array<{ id: string; name: string }>>([])
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, domainsRes] = await Promise.allSettled([
          api.get('/domains/settings/dns-templates'),
          api.get('/domains'),
        ])

        if (templatesRes.status === 'fulfilled') {
          const raw = templatesRes.value.data?.data?.data ?? templatesRes.value.data?.data ?? templatesRes.value.data
          setTemplates(Array.isArray(raw?.templates) ? raw.templates : Array.isArray(raw) ? raw : [])
        }

        if (domainsRes.status === 'fulfilled') {
          const raw = domainsRes.value.data?.data?.data ?? domainsRes.value.data?.data ?? domainsRes.value.data
          setDomains(Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const openCreateDialog = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateRecords([{ ...emptyRecord }])
    setDialogOpen(true)
  }

  const openEditDialog = (template: DnsTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateRecords([...template.records])
    setDialogOpen(true)
  }

  const handleAddRow = () => {
    setTemplateRecords((prev) => [...prev, { ...emptyRecord }])
  }

  const handleRemoveRow = (idx: number) => {
    setTemplateRecords((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleRecordChange = (idx: number, field: keyof TemplateRecord, value: string | number) => {
    setTemplateRecords((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    )
  }

  const handleSave = async () => {
    if (!templateName.trim()) return

    setSaving(true)

    try {
      const payload = { name: templateName.trim(), records: templateRecords }

      if (editingTemplate) {
        await api.put(`/domains/settings/dns-templates/${editingTemplate.id}`, payload)
      } else {
        await api.post('/domains/settings/dns-templates', payload)
      }

      setDialogOpen(false)

      // Refresh
      const res = await api.get('/domains/settings/dns-templates')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setTemplates(Array.isArray(raw?.templates) ? raw.templates : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    try {
      await api.delete(`/domains/settings/dns-templates/${templateId}`)
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    } catch {
      // silently handle
    }
  }

  const handleApply = async () => {
    if (!applyTemplateId || !applyDomainId) return

    setApplying(true)

    try {
      await api.post(`/domains/settings/dns-templates/${applyTemplateId}/apply`, {
        domainId: applyDomainId,
      })
      setApplyDialogOpen(false)
    } catch {
      // silently handle
    } finally {
      setApplying(false)
    }
  }

  const openApplyDialog = (templateId: string) => {
    setApplyTemplateId(templateId)
    setApplyDomainId('')
    setApplyDialogOpen(true)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>DNS Templates</Typography>
            <Typography variant='body2' color='text.secondary'>
              Create reusable DNS record templates
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={openCreateDialog}
          >
            Create Template
          </Button>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Templates' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : templates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-template' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No DNS templates yet. Create one to get started.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Record Count</TableCell>
                      <TableCell>Created Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{template.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${template.records.length} records`} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>{new Date(template.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title='Apply to Domain'>
                            <IconButton size='small' color='primary' onClick={() => openApplyDialog(template.id)}>
                              <i className='tabler-arrow-right' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Edit'>
                            <IconButton size='small' onClick={() => openEditDialog(template)}>
                              <i className='tabler-edit' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton size='small' color='error' onClick={() => handleDelete(template.id)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create DNS Template'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CustomTextField
              label='Template Name'
              placeholder='e.g. Standard Web Hosting'
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              fullWidth
            />

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant='subtitle2'>DNS Records</Typography>
              <Button size='small' startIcon={<i className='tabler-plus' />} onClick={handleAddRow}>
                Add Row
              </Button>
            </Box>

            {templateRecords.map((record, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CustomTextField
                  select
                  label='Type'
                  value={record.type}
                  onChange={(e) => handleRecordChange(idx, 'type', e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  {recordTypes.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  label='Host'
                  value={record.host}
                  onChange={(e) => handleRecordChange(idx, 'host', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <CustomTextField
                  label='Value'
                  value={record.value}
                  onChange={(e) => handleRecordChange(idx, 'value', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <CustomTextField
                  label='TTL'
                  type='number'
                  value={record.ttl}
                  onChange={(e) => handleRecordChange(idx, 'ttl', Number(e.target.value))}
                  sx={{ minWidth: 80 }}
                />
                <IconButton
                  size='small'
                  color='error'
                  onClick={() => handleRemoveRow(idx)}
                  disabled={templateRecords.length === 1}
                >
                  <i className='tabler-x' style={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editingTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply to Domain Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Apply Template to Domain</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <CustomTextField
              select
              label='Select Domain'
              value={applyDomainId}
              onChange={(e) => setApplyDomainId(e.target.value)}
              fullWidth
            >
              {domains.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </CustomTextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleApply} disabled={applying || !applyDomainId}>
            {applying ? <CircularProgress size={20} /> : 'Apply Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default DnsTemplatesPage
