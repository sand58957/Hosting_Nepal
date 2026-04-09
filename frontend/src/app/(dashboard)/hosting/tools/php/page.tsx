'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableRow from '@mui/material/TableRow'

import api from '@/lib/api'

interface Website { id: string; domain: string }

const phpVersions = ['7.4', '8.0', '8.1', '8.2', '8.3']

const phpSettings = [
  { key: 'memory_limit', label: 'Memory Limit', value: '256M' },
  { key: 'max_execution_time', label: 'Max Execution Time', value: '300' },
  { key: 'post_max_size', label: 'Post Max Size', value: '64M' },
  { key: 'upload_max_filesize', label: 'Upload Max Filesize', value: '64M' },
  { key: 'max_input_vars', label: 'Max Input Vars', value: '3000' },
  { key: 'max_input_time', label: 'Max Input Time', value: '300' },
]

const PhpPage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [currentVersion, setCurrentVersion] = useState('8.2')
  const [selectedVersion, setSelectedVersion] = useState('8.2')
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting/websites')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setWebsites(Array.isArray(raw) ? raw : [])
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChange = async () => {
    if (!selectedSite) return
    setChanging(true)
    setSuccess(false)
    try {
      await api.post(`/hosting/websites/${selectedSite}/php`, { version: selectedVersion })
      setCurrentVersion(selectedVersion)
      setSuccess(true)
    } catch {
      // handle error
    } finally {
      setChanging(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='PHP Manager' subheader='Change PHP version and configure PHP settings' />
          <CardContent>
            <FormControl sx={{ minWidth: 300, mb: 4 }}>
              <InputLabel>Select Website</InputLabel>
              <Select value={selectedSite} label='Select Website' onChange={(e) => setSelectedSite(e.target.value)} size='small'>
                {websites.map((w) => (<MenuItem key={w.id} value={w.id}>{w.domain}</MenuItem>))}
              </Select>
            </FormControl>

            {selectedSite ? (
              <Box>
                {success && <Alert severity='success' sx={{ mb: 3 }}>PHP version changed successfully to {currentVersion}</Alert>}

                <Typography variant='subtitle1' sx={{ mb: 2 }}>PHP Version</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 4 }}>
                  <Chip label={`Current: PHP ${currentVersion}`} color='primary' />
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>New Version</InputLabel>
                    <Select value={selectedVersion} label='New Version' onChange={(e) => setSelectedVersion(e.target.value)} size='small'>
                      {phpVersions.map((v) => (<MenuItem key={v} value={v}>PHP {v}</MenuItem>))}
                    </Select>
                  </FormControl>
                  <Button variant='contained' onClick={handleChange} disabled={changing || selectedVersion === currentVersion}
                    startIcon={changing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}>
                    {changing ? 'Changing...' : 'Apply'}
                  </Button>
                </Box>

                <Typography variant='subtitle1' sx={{ mb: 2 }}>PHP.ini Settings</Typography>
                <Card variant='outlined'>
                  <TableContainer>
                    <Table>
                      <TableBody>
                        {phpSettings.map((s) => (
                          <TableRow key={s.key} hover>
                            <TableCell><Typography variant='body2' fontWeight={500}>{s.label}</Typography></TableCell>
                            <TableCell><code>{s.key}</code></TableCell>
                            <TableCell align='right'><Typography variant='body2'>{s.value}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-brand-php' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>Select a website to manage PHP</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PhpPage
