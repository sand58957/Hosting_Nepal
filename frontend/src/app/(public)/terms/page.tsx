'use client'

import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import Logo from '@core/svg/Logo'

const legalContent = [
  { title: '1. Acceptance of Terms', body: 'By accessing or using the services provided by Hosting Nepal ("Company", "we", "us", or "our"), operated by Marketminds Investment Group, located at Koteshwor-32, Kathmandu, Nepal, you ("Customer", "you", or "your") agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not access or use our services.\n\nThese Terms apply to all visitors, users, and customers who access or use our hosting services, domain registration, email hosting, VPS, VDS, dedicated server, SSL certificate, and any related services.' },
  { title: '2. Services Provided', body: 'Hosting Nepal provides web hosting and related internet services including but not limited to:\n\n- Shared and managed WordPress hosting\n- Virtual Private Server (VPS) hosting\n- Virtual Dedicated Server (VDS) hosting\n- Dedicated server hosting\n- Domain name registration and management\n- Business email hosting\n- SSL certificate provisioning\n- DNS management and WHOIS privacy\n- Website backup and security services\n\nAll services are subject to availability and may be modified, suspended, or discontinued at our discretion with reasonable notice to affected customers.' },
  { title: '3. Account Registration', body: 'To use our services, you must create an account and provide accurate, complete, and current information. You are responsible for:\n\n- Maintaining the confidentiality of your account credentials\n- All activities that occur under your account\n- Notifying us immediately of any unauthorized access\n- Ensuring your contact information remains current\n\nYou must be at least 18 years of age to create an account. By registering, you represent that you meet this age requirement. We reserve the right to refuse service, terminate accounts, or cancel orders at our discretion.' },
  { title: '4. Payment Terms', body: 'All prices are listed in Nepali Rupees (NPR) unless otherwise stated. Payment is due at the time of service activation.\n\n**Payment Methods:** We accept Khalti, eSewa, bank transfers, and international credit/debit cards.\n\n**Billing Cycle:** Services are billed on a monthly, quarterly, semi-annual, or annual basis as selected during purchase.\n\n**Auto-Renewal:** Services automatically renew at the end of each billing cycle at the then-current renewal price unless cancelled before the renewal date.\n\n**Late Payments:** Failure to pay by the due date may result in service suspension. Services suspended for non-payment may be terminated after 15 days, and data may be permanently deleted after 30 days.\n\n**Price Changes:** We reserve the right to modify pricing with 30 days advance notice. Existing subscriptions are honored at the contracted rate until the next renewal period.' },
  { title: '5. Refund Policy', body: '**WordPress Hosting:** 30-day money-back guarantee on all WordPress hosting plans. Refund requests must be submitted within 30 days of initial purchase.\n\n**VPS and Dedicated Servers:** Eligible for pro-rated refund within 14 days of initial purchase.\n\n**Domain Registration:** Domain registration fees are non-refundable due to ICANN regulations. Once a domain is registered, the registration fee cannot be returned.\n\n**SSL Certificates:** Refundable within 7 days of purchase if the certificate has not been issued.\n\n**Add-On Services:** Refundable within 7 days if the service has not been activated or used.\n\nRefunds are processed within 7-14 business days to the original payment method. Setup fees, if any, are non-refundable.' },
  { title: '6. Acceptable Use Policy', body: 'You agree not to use our services for any unlawful or prohibited purpose. Specifically, you shall not:\n\n- Host, transmit, or distribute content that is illegal under Nepal law\n- Send unsolicited bulk email (spam) or engage in email abuse\n- Host phishing websites or malware distribution sites\n- Engage in copyright or intellectual property infringement\n- Conduct network abuse including DDoS attacks, port scanning, or unauthorized access attempts\n- Host content promoting violence, terrorism, or hate speech\n- Use excessive server resources that negatively impact other customers (on shared hosting)\n- Resell hosting services without a reseller agreement\n- Mine cryptocurrency on shared hosting or standard VPS plans\n\nViolation of this policy may result in immediate suspension or termination of services without refund.' },
  { title: '7. Resource Usage', body: '**Shared Hosting:** While we offer "unlimited" bandwidth on shared hosting plans, this is subject to our Fair Use Policy. Websites that consume excessive CPU, memory, or I/O resources may be asked to optimize or upgrade to VPS hosting.\n\n**VPS/VDS/Dedicated:** Resource limits are as specified in your service plan. Exceeding allocated resources may result in performance throttling or additional charges.\n\n**Storage:** All storage limits are for legitimate website hosting purposes. Using hosting storage as a file backup or archival service is not permitted on shared hosting plans.\n\n**Bandwidth:** All plans include generous bandwidth allocations. If you consistently exceed your allocation, we will work with you to find an appropriate solution.' },
  { title: '8. Data Backup and Recovery', body: 'We perform daily automated backups of all hosting accounts as a courtesy service. However:\n\n- Backups are not guaranteed and should not be relied upon as your sole backup strategy\n- You are ultimately responsible for maintaining your own backups\n- Backup restoration is provided on a best-effort basis\n- Backup retention period is 7 days for shared hosting and varies for VPS/dedicated plans\n\nWe strongly recommend maintaining independent backups of all critical data, files, and databases.' },
  { title: '9. Service Level Agreement (SLA)', body: '**Uptime Guarantee:** We guarantee 99.95% network uptime for all hosting services.\n\n**SLA Credits:** If uptime falls below the guaranteed level in any calendar month, you may request service credits:\n- 99.0% - 99.95% uptime: 5% credit of monthly fee\n- 98.0% - 99.0% uptime: 10% credit of monthly fee\n- Below 98.0% uptime: 25% credit of monthly fee\n\n**Exclusions:** Scheduled maintenance, force majeure events, DDoS attacks, customer-caused issues, and third-party service failures are excluded from SLA calculations.\n\n**Credit Requests:** SLA credits must be requested within 7 days of the incident. Credits are applied to future invoices and do not exceed 25% of the monthly service fee.' },
  { title: '10. Domain Registration Terms', body: 'Domain registration services are provided subject to the terms of the relevant domain registry (ICANN for gTLDs, Mercantile Communications for .np domains).\n\n- Domain registrations are non-refundable\n- You must provide accurate WHOIS information as required by ICANN\n- Domain transfers are subject to the gaining and losing registrar policies\n- We are not responsible for domain disputes between third parties\n- Domain auto-renewal failure due to expired payment methods is the customer\'s responsibility\n- We reserve the right to suspend domains used in violation of our Acceptable Use Policy' },
  { title: '11. Intellectual Property', body: 'You retain all ownership rights to content you upload to our servers. By using our services, you grant us a limited license to host, transmit, and display your content as necessary to provide the services.\n\nWe respect intellectual property rights and will respond to valid DMCA takedown notices. If you believe your copyright has been infringed, please contact us at admin@hostingnepals.com with the relevant details.\n\nOur brand, logo, website design, and proprietary software remain the intellectual property of Marketminds Investment Group and may not be used without written permission.' },
  { title: '12. Limitation of Liability', body: 'TO THE MAXIMUM EXTENT PERMITTED BY NEPAL LAW:\n\n- Our total liability for any claim arising from these Terms shall not exceed the amount paid by you for the specific service in the 12 months preceding the claim\n- We shall not be liable for any indirect, incidental, special, consequential, or punitive damages\n- We shall not be liable for any loss of data, profits, revenue, or business opportunities\n- We shall not be liable for service interruptions caused by factors beyond our reasonable control\n\nYou acknowledge that hosting services involve inherent risks and agree to maintain appropriate backups and insurance for your online operations.' },
  { title: '13. Termination', body: '**By Customer:** You may cancel your services at any time through your dashboard or by contacting support. Cancellation takes effect at the end of the current billing period.\n\n**By Company:** We may terminate or suspend your services immediately if you:\n- Violate these Terms or our Acceptable Use Policy\n- Fail to pay for services within 15 days of the due date\n- Engage in fraudulent or illegal activity\n- Cause harm to our infrastructure or other customers\n\n**Data Retention:** Upon termination, your data will be retained for 30 days, after which it will be permanently deleted. You are responsible for exporting your data before termination.' },
  { title: '14. Governing Law', body: 'These Terms shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising from these Terms shall be resolved through the courts of Kathmandu, Nepal.\n\nBefore initiating legal proceedings, both parties agree to attempt good-faith resolution through direct communication and, if necessary, mediation.' },
  { title: '15. Changes to Terms', body: 'We reserve the right to modify these Terms at any time. Material changes will be communicated via email to registered customers at least 30 days before taking effect.\n\nContinued use of our services after changes take effect constitutes acceptance of the modified Terms. If you do not agree with the changes, you may cancel your services before the effective date.' },
  { title: '16. Contact Information', body: 'For questions about these Terms of Service, please contact us:\n\n**Marketminds Investment Group**\nKoteshwor-32, Kathmandu, Nepal\nEmail: admin@hostingnepals.com\nPhone: +977-9802348957\nWebsite: https://hostingnepals.com' },
]

const TermsPage = () => {
  const router = useRouter()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a' }}>
      <Box sx={{ bgcolor: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 } }}>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/home')}>Home</Button>
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2 }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }}>
        <Container maxWidth='md'>
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>Terms of Service</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>Last updated: April 12, 2026</Typography>
        </Container>
      </Box>

      <Container maxWidth='md' sx={{ pb: 8 }}>
        {legalContent.map((section, i) => (
          <Box key={i} sx={{ mb: 5 }}>
            <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>{section.title}</Typography>
            {section.body.split('\n\n').map((para, j) => (
              <Typography key={j} variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, mb: 1.5, whiteSpace: 'pre-line' }}>
                {para}
              </Typography>
            ))}
          </Box>
        ))}
      </Container>

      <Box sx={{ bgcolor: '#131325', py: 4, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {new Date().getFullYear()} &copy; Marketminds Investment Group. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}

export default TermsPage
