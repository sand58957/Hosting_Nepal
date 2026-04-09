'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'

const SpamPage = () => {
  const [spamFilter, setSpamFilter] = useState(true)
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [blacklist, setBlacklist] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<'whitelist' | 'blacklist'>('whitelist')
  const [emailToAdd, setEmailToAdd] = useState('')

  const handleAdd = () => {
    if (addType === 'whitelist') {
      setWhitelist((prev) => [...prev, emailToAdd])
    } else {
      setBlacklist((prev) => [...prev, emailToAdd])
    }
    setAddOpen(false)
    setEmailToAdd('')
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Spam Protection' subheader='Configure spam filtering for your email accounts' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className='tabler-mail-off' style={{ fontSize: 32, color: spamFilter ? '#4caf50' : '#999' }} />
                <Box>
                  <Typography variant='subtitle1'>SpamAssassin Filter</Typography>
                  <Typography variant='body2' color='text.secondary'>Automatically filter spam emails</Typography>
                </Box>
              </Box>
              <Switch checked={spamFilter} onChange={() => setSpamFilter(!spamFilter)} />
            </Box>
            <Divider />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title='Whitelist'
            subheader='Always allow emails from these addresses'
            action={<Button size='small' startIcon={<i className='tabler-plus' />} onClick={() => { setAddType('whitelist'); setAddOpen(true) }}>Add</Button>}
          />
          <CardContent>
            {whitelist.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='body2' color='text.secondary'>No whitelisted addresses</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {whitelist.map((e, idx) => (
                  <Chip key={idx} label={e} onDelete={() => setWhitelist((prev) => prev.filter((_, i) => i !== idx))} color='success' variant='outlined' />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader
            title='Blacklist'
            subheader='Always block emails from these addresses'
            action={<Button size='small' startIcon={<i className='tabler-plus' />} onClick={() => { setAddType('blacklist'); setAddOpen(true) }}>Add</Button>}
          />
          <CardContent>
            {blacklist.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='body2' color='text.secondary'>No blacklisted addresses</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {blacklist.map((e, idx) => (
                  <Chip key={idx} label={e} onDelete={() => setBlacklist((prev) => prev.filter((_, i) => i !== idx))} color='error' variant='outlined' />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add to {addType === 'whitelist' ? 'Whitelist' : 'Blacklist'}</DialogTitle>
        <DialogContent>
          <CustomTextField fullWidth label='Email Address or Domain' value={emailToAdd} onChange={(e) => setEmailToAdd(e.target.value)} placeholder='spam@example.com or @example.com' sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!emailToAdd} color={addType === 'whitelist' ? 'success' : 'error'}>
            Add to {addType === 'whitelist' ? 'Whitelist' : 'Blacklist'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SpamPage
