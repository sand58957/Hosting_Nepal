'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface HostingPlan {
  id: string
  name: string
  type: string
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  popular?: boolean
  specs: {
    diskGB: number
    bandwidthGB: number
    emailAccounts: number
    subdomains: number
    databases: number
  }
}

const steps = ['Choose Domain', 'Set Up Site', 'Add Extras & Review']

const AddWebsitePage = () => {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<HostingPlan[]>([])
  const [error, setError] = useState('')

  // Step 1 - Domain
  const [domainType, setDomainType] = useState('existing')
  const [domain, setDomain] = useState('')

  // Step 2 - Application
  const [appType, setAppType] = useState('wordpress')
  const [wpAdminEmail, setWpAdminEmail] = useState('')
  const [wpAdminUser, setWpAdminUser] = useState('admin')
  const [wpAdminPass, setWpAdminPass] = useState('')
  const [wpTitle, setWpTitle] = useState('')

  // Step 3 - Plan & Extras
  const [selectedPlan, setSelectedPlan] = useState('')
  const [siteScanner, setSiteScanner] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      try {
        const res = await api.get('/hosting/plans')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const allPlans = Array.isArray(raw?.plans) ? raw.plans : Array.isArray(raw) ? raw : []
        setPlans(allPlans.filter((p: HostingPlan) => p.type === 'SHARED' || p.type === 'WORDPRESS'))
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const canProceed = () => {
    if (activeStep === 0) return domain.trim().length > 0
    if (activeStep === 1) {
      if (appType === 'wordpress' || appType === 'woocommerce') {
        return wpAdminEmail.trim().length > 0 && wpAdminPass.trim().length >= 6
      }
      return true
    }
    if (activeStep === 2) return selectedPlan.length > 0
    return false
  }

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleFinish = async () => {
    setSubmitting(true)
    setError('')
    try {
      await api.post('/hosting/websites', {
        domain,
        planId: selectedPlan,
        applicationType: appType,
        wpAdminEmail: appType !== 'blank' ? wpAdminEmail : undefined,
        wpAdminUser: appType !== 'blank' ? wpAdminUser : undefined,
        wpAdminPass: appType !== 'blank' ? wpAdminPass : undefined,
        wpTitle: appType !== 'blank' ? wpTitle : undefined,
      })
      router.push('/hosting')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create website')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='Add New Website'
            subheader='Set up a new website in just a few steps'
            action={
              <Button variant='text' onClick={() => router.push('/hosting')}>
                Cancel
              </Button>
            }
          />
          <CardContent>
            <Stepper activeStep={activeStep} sx={{ mb: 6 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {error}
              </Alert>
            )}

            {/* Step 1: Choose Domain */}
            {activeStep === 0 && (
              <Box>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Choose how to add your domain
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    {
                      value: 'new',
                      icon: 'tabler-circle-plus',
                      title: 'New Domain',
                      desc: 'Register a new domain name',
                    },
                    {
                      value: 'existing',
                      icon: 'tabler-world',
                      title: 'Existing Domain',
                      desc: 'Point an existing domain you own',
                    },
                    {
                      value: 'temporary',
                      icon: 'tabler-clock',
                      title: 'Temporary Domain',
                      desc: 'Use a free subdomain to start',
                    },
                  ].map((opt) => (
                    <Grid size={{ xs: 12, sm: 4 }} key={opt.value}>
                      <Card
                        variant='outlined'
                        sx={{
                          cursor: 'pointer',
                          borderColor: domainType === opt.value ? 'primary.main' : 'divider',
                          borderWidth: domainType === opt.value ? 2 : 1,
                          bgcolor: domainType === opt.value ? 'primary.lighter' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setDomainType(opt.value)}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <i className={opt.icon} style={{ fontSize: 40, color: '#7c3aed' }} />
                          <Typography variant='h6' sx={{ mt: 2 }}>
                            {opt.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {opt.desc}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <CustomTextField
                  fullWidth
                  label='Domain Name'
                  placeholder={
                    domainType === 'temporary'
                      ? 'mysite.hostingnepal.com'
                      : 'example.com'
                  }
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  helperText={
                    domainType === 'new'
                      ? 'We will register this domain for you'
                      : domainType === 'existing'
                        ? 'Point your domain DNS to our nameservers'
                        : 'You can change to a custom domain later'
                  }
                />
              </Box>
            )}

            {/* Step 2: Set Up Site */}
            {activeStep === 1 && (
              <Box>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Choose your application
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    {
                      value: 'wordpress',
                      icon: 'tabler-brand-wordpress',
                      title: 'WordPress',
                      desc: 'Most popular CMS',
                      tag: 'CMS',
                    },
                    {
                      value: 'blank',
                      icon: 'tabler-file-code',
                      title: 'Blank Site',
                      desc: 'Start with an empty site',
                      tag: 'Custom',
                    },
                    {
                      value: 'woocommerce',
                      icon: 'tabler-shopping-cart',
                      title: 'WooCommerce',
                      desc: 'WordPress + eCommerce',
                      tag: 'Ecommerce',
                    },
                  ].map((opt) => (
                    <Grid size={{ xs: 12, sm: 4 }} key={opt.value}>
                      <Card
                        variant='outlined'
                        sx={{
                          cursor: 'pointer',
                          borderColor: appType === opt.value ? 'primary.main' : 'divider',
                          borderWidth: appType === opt.value ? 2 : 1,
                          bgcolor: appType === opt.value ? 'primary.lighter' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setAppType(opt.value)}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 4, position: 'relative' }}>
                          <Chip
                            label={opt.tag}
                            size='small'
                            color='primary'
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                          />
                          <i className={opt.icon} style={{ fontSize: 40, color: '#7c3aed' }} />
                          <Typography variant='h6' sx={{ mt: 2 }}>
                            {opt.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {opt.desc}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {(appType === 'wordpress' || appType === 'woocommerce') && (
                  <Box>
                    <Typography variant='subtitle1' sx={{ mb: 2 }}>
                      WordPress Admin Credentials
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label='Admin Email'
                          type='email'
                          value={wpAdminEmail}
                          onChange={(e) => setWpAdminEmail(e.target.value)}
                          placeholder='admin@example.com'
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label='Admin Username'
                          value={wpAdminUser}
                          onChange={(e) => setWpAdminUser(e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label='Admin Password'
                          type='password'
                          value={wpAdminPass}
                          onChange={(e) => setWpAdminPass(e.target.value)}
                          helperText='Minimum 6 characters'
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          label='Site Title'
                          value={wpTitle}
                          onChange={(e) => setWpTitle(e.target.value)}
                          placeholder='My Awesome Site'
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* Step 3: Plan & Review */}
            {activeStep === 2 && (
              <Box>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Choose your hosting plan
                </Typography>

                {loading ? (
                  <Grid container spacing={3}>
                    {[...Array(3)].map((_, i) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                        <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 1 }} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    {plans.map((plan) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
                        <Card
                          variant='outlined'
                          sx={{
                            cursor: 'pointer',
                            borderColor: selectedPlan === plan.id ? 'primary.main' : 'divider',
                            borderWidth: selectedPlan === plan.id ? 2 : 1,
                            position: 'relative',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.popular && (
                            <Chip
                              label='Most Popular'
                              color='primary'
                              size='small'
                              sx={{ position: 'absolute', top: 8, right: 8 }}
                            />
                          )}
                          <CardContent sx={{ textAlign: 'center' }}>
                            <RadioGroup value={selectedPlan}>
                              <FormControlLabel
                                value={plan.id}
                                control={<Radio />}
                                label=''
                                sx={{ position: 'absolute', top: 4, left: 4 }}
                              />
                            </RadioGroup>
                            <Typography variant='h6' sx={{ mt: 1 }}>
                              {plan.name}
                            </Typography>
                            <Typography variant='h4' color='primary.main' sx={{ my: 1 }}>
                              NPR {plan.priceMonthly?.toLocaleString()}
                              <Typography variant='caption' color='text.secondary'>
                                /mo
                              </Typography>
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ textAlign: 'left' }}>
                              {plan.features.slice(0, 5).map((f, i) => (
                                <Typography key={i} variant='body2' sx={{ mb: 0.5 }}>
                                  <i
                                    className='tabler-check'
                                    style={{ fontSize: 14, marginRight: 6, color: '#4caf50' }}
                                  />
                                  {f}
                                </Typography>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* Extras */}
                <Typography variant='subtitle1' sx={{ mb: 2 }}>
                  Add-ons
                </Typography>
                <Card variant='outlined' sx={{ mb: 4 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant='body1' fontWeight={500}>
                        SG Site Scanner
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Daily malware scanning and vulnerability monitoring
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant='body2' color='text.secondary'>
                        NPR 299/mo
                      </Typography>
                      <Switch checked={siteScanner} onChange={(e) => setSiteScanner(e.target.checked)} />
                    </Box>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h6' sx={{ mb: 2 }}>
                      Order Summary
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2'>Domain</Typography>
                      <Typography variant='body2' fontWeight={500}>
                        {domain}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2'>Application</Typography>
                      <Typography variant='body2' fontWeight={500}>
                        {appType === 'wordpress'
                          ? 'WordPress'
                          : appType === 'woocommerce'
                            ? 'WooCommerce'
                            : 'Blank Site'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2'>Hosting Plan</Typography>
                      <Typography variant='body2' fontWeight={500}>
                        {selectedPlanData?.name || '-'}
                      </Typography>
                    </Box>
                    {siteScanner && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant='body2'>SG Site Scanner</Typography>
                        <Typography variant='body2' fontWeight={500}>
                          NPR 299/mo
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='h6'>Total</Typography>
                      <Typography variant='h6' color='primary.main'>
                        NPR{' '}
                        {(
                          (selectedPlanData?.priceMonthly || 0) + (siteScanner ? 299 : 0)
                        ).toLocaleString()}
                        /mo
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant='outlined'
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<i className='tabler-arrow-left' />}
              >
                Back
              </Button>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant='contained'
                  onClick={handleNext}
                  disabled={!canProceed()}
                  endIcon={<i className='tabler-arrow-right' />}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant='contained'
                  onClick={handleFinish}
                  disabled={!canProceed() || submitting}
                  startIcon={
                    submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />
                  }
                >
                  {submitting ? 'Creating...' : 'Finish'}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AddWebsitePage
