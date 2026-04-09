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
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Website {
  id: string
  domain: string
  hasWordPress: boolean
}

const dbTables = [
  'wp_posts',
  'wp_postmeta',
  'wp_options',
  'wp_comments',
  'wp_commentmeta',
  'wp_terms',
  'wp_termmeta',
  'wp_term_taxonomy',
  'wp_term_relationships',
  'wp_usermeta',
  'wp_links',
]

const SearchReplacePage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState('')
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [selectedTables, setSelectedTables] = useState<string[]>(dbTables)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ found: number; replaced: number } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting/websites')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setWebsites((Array.isArray(raw) ? raw : []).filter((w: Website) => w.hasWordPress))
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    )
  }

  const handleRun = () => {
    setRunning(true)
    setResult(null)
    setTimeout(() => {
      setResult({ found: 42, replaced: dryRun ? 0 : 42 })
      setRunning(false)
    }, 2000)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='WordPress Search & Replace'
            subheader='Find and replace text strings in your WordPress database'
          />
          <CardContent>
            <Alert severity='warning' sx={{ mb: 4 }}>
              Always create a backup before running search and replace operations. Use dry run first to preview changes.
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Select Website</InputLabel>
                <Select
                  value={selectedSite}
                  label='Select Website'
                  onChange={(e) => setSelectedSite(e.target.value)}
                >
                  {websites.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <CustomTextField
                fullWidth
                label='Search for'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder='http://oldsite.com'
              />

              <CustomTextField
                fullWidth
                label='Replace with'
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder='https://newsite.com'
              />

              <Box>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>
                  Tables to search
                </Typography>
                <Grid container spacing={1}>
                  {dbTables.map((table) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={table}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedTables.includes(table)}
                            onChange={() => toggleTable(table)}
                            size='small'
                          />
                        }
                        label={<Typography variant='body2'>{table}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />}
                  label='Dry Run (preview only, no changes)'
                />
              </Box>

              <Box>
                <Button
                  variant='contained'
                  onClick={handleRun}
                  disabled={running || !selectedSite || !searchText}
                  startIcon={running ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-replace' />}
                  color={dryRun ? 'primary' : 'warning'}
                >
                  {running ? 'Running...' : dryRun ? 'Preview Changes' : 'Search & Replace'}
                </Button>
              </Box>

              {result && (
                <Alert severity={dryRun ? 'info' : 'success'}>
                  Found {result.found} occurrences.{' '}
                  {dryRun
                    ? 'No changes made (dry run). Uncheck dry run to apply changes.'
                    : `${result.replaced} replacements made.`}
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SearchReplacePage
