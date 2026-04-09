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
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

import CustomTextField from '@core/components/mui/TextField'

interface CronJob {
  id: string
  command: string
  schedule: string
  lastRun: string
}

const CronPage = () => {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [frequency, setFrequency] = useState('daily')

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Cron Jobs'
            subheader='Schedule automated tasks for your hosting account'
            action={
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setCreateOpen(true)}>
                Add Cron Job
              </Button>
            }
          />
          <CardContent>
            {cronJobs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-clock-cog' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No cron jobs configured</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Add a cron job to automate recurring tasks.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Command</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Last Run</TableCell>
                      <TableCell align='right'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cronJobs.map((job) => (
                      <TableRow key={job.id} hover>
                        <TableCell><code>{job.command}</code></TableCell>
                        <TableCell>{job.schedule}</TableCell>
                        <TableCell>{job.lastRun}</TableCell>
                        <TableCell align='right'>
                          <Button size='small' color='error' startIcon={<i className='tabler-trash' />}>Delete</Button>
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Add Cron Job</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Command' value={command} onChange={(e) => setCommand(e.target.value)} placeholder='/usr/bin/php /home/user/public_html/cron.php' />
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select value={frequency} label='Frequency' onChange={(e) => setFrequency(e.target.value)}>
                <MenuItem value='every-minute'>Every Minute</MenuItem>
                <MenuItem value='every-5-min'>Every 5 Minutes</MenuItem>
                <MenuItem value='every-15-min'>Every 15 Minutes</MenuItem>
                <MenuItem value='hourly'>Hourly</MenuItem>
                <MenuItem value='daily'>Daily</MenuItem>
                <MenuItem value='weekly'>Weekly</MenuItem>
                <MenuItem value='monthly'>Monthly</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant='contained' disabled={!command}>Add Cron Job</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CronPage
