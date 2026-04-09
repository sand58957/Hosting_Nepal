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
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface ExportRecord {
  id: string
  format: string
  domainCount: number
  createdAt: string
  downloadUrl: string
  fileSize?: string
}

const ExportedListsPage = () => {
  const [exports, setExports] = useState<ExportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [format, setFormat] = useState('CSV')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/settings/exports')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setExports(Array.isArray(raw?.exports) ? raw.exports : Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleExport = async () => {
    setExporting(true)

    try {
      await api.post('/domains/settings/exports', { format })

      // Refresh
      const res = await api.get('/domains/settings/exports')
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data
      setExports(Array.isArray(raw?.exports) ? raw.exports : Array.isArray(raw) ? raw : [])
    } catch {
      // silently handle
    } finally {
      setExporting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Exported Lists</Typography>
            <Typography variant='body2' color='text.secondary'>
              Export your domain portfolio data
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Export Action */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Export Domains' />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <CustomTextField
                select
                label='Format'
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value='CSV'>CSV</MenuItem>
                <MenuItem value='JSON'>JSON</MenuItem>
              </CustomTextField>
              <Button
                variant='contained'
                startIcon={<i className='tabler-download' />}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <CircularProgress size={20} /> : 'Export Now'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Previous Exports */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Previous Exports' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : exports.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-file-export' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No exports yet. Click Export Now to create your first export.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Format</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Domain Count</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exports.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          <Chip label={exp.format} size='small' variant='outlined' />
                        </TableCell>
                        <TableCell>{new Date(exp.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{exp.domainCount}</TableCell>
                        <TableCell>{exp.fileSize || '-'}</TableCell>
                        <TableCell>
                          <Button
                            size='small'
                            variant='outlined'
                            startIcon={<i className='tabler-download' />}
                            href={exp.downloadUrl}
                            target='_blank'
                          >
                            Download
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
    </Grid>
  )
}

export default ExportedListsPage
