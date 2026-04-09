'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'

import CustomTextField from '@core/components/mui/TextField'

const MigratorPage = () => {
  const [sourceUrl, setSourceUrl] = useState('')
  const [ftpHost, setFtpHost] = useState('')
  const [ftpUser, setFtpUser] = useState('')
  const [ftpPass, setFtpPass] = useState('')
  const [ftpPort, setFtpPort] = useState('21')
  const [dbHost, setDbHost] = useState('localhost')
  const [dbName, setDbName] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [dbPass, setDbPass] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleMigrate = () => {
    setMigrating(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setMigrating(false)
          return 100
        }
        return prev + 10
      })
    }, 2000)
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='WordPress Migrator'
            subheader='Migrate your WordPress site from another host'
          />
          <CardContent>
            <Alert severity='info' sx={{ mb: 4 }}>
              Provide your source site credentials below. We will copy all files, database, and
              configurations to your Hosting Nepal account.
            </Alert>

            {migrating ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant='h6' sx={{ mb: 2 }}>
                  Migration in Progress
                </Typography>
                <LinearProgress variant='determinate' value={progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
                <Typography variant='body2' color='text.secondary'>
                  {progress}% complete - {progress < 30 ? 'Connecting to source...' : progress < 60 ? 'Copying files...' : progress < 90 ? 'Migrating database...' : 'Finalizing...'}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant='subtitle1' sx={{ mb: 2 }}>
                  Source WordPress Site
                </Typography>
                <CustomTextField
                  fullWidth
                  label='Source URL'
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder='https://oldsite.com'
                  sx={{ mb: 3 }}
                />

                <Typography variant='subtitle1' sx={{ mb: 2 }}>
                  FTP / SFTP Credentials
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='FTP Host' value={ftpHost} onChange={(e) => setFtpHost(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <CustomTextField fullWidth label='Port' value={ftpPort} onChange={(e) => setFtpPort(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <CustomTextField fullWidth label='Protocol' value='FTP' disabled />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='FTP Username' value={ftpUser} onChange={(e) => setFtpUser(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='FTP Password' type='password' value={ftpPass} onChange={(e) => setFtpPass(e.target.value)} />
                  </Grid>
                </Grid>

                <Typography variant='subtitle1' sx={{ mb: 2 }}>
                  Database Credentials
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='Database Host' value={dbHost} onChange={(e) => setDbHost(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='Database Name' value={dbName} onChange={(e) => setDbName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='Database Username' value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField fullWidth label='Database Password' type='password' value={dbPass} onChange={(e) => setDbPass(e.target.value)} />
                  </Grid>
                </Grid>

                <Button
                  variant='contained'
                  size='large'
                  onClick={handleMigrate}
                  disabled={!sourceUrl || !ftpHost || !ftpUser}
                  startIcon={<i className='tabler-transfer' />}
                >
                  Start Migration
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Migration History */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Migration History' />
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <i className='tabler-history' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                No migration history yet.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MigratorPage
