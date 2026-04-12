'use client'

import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import Logo from '@core/svg/Logo'

const sections = [
  { title: '1. Introduction', body: 'Hosting Nepal ("Company", "we", "us", or "our"), operated by Marketminds Investment Group, located at Koteshwor-32, Kathmandu, Nepal, is committed to protecting the privacy and security of your personal information.\n\nThis Privacy Policy describes how we collect, use, store, and share your information when you use our website (https://hostingnepals.com), hosting services, domain registration, email hosting, and related services ("Services").\n\nBy using our Services, you consent to the data practices described in this policy.' },
  { title: '2. Information We Collect', body: '**Personal Information You Provide:**\n- Full name and contact information (email, phone number, address)\n- Billing and payment information (processed securely through payment gateways)\n- Account credentials (username, encrypted password)\n- Domain registration information (as required by ICANN and registries)\n- Business name and tax identification (if applicable)\n- Support ticket communications and chat transcripts\n\n**Information Collected Automatically:**\n- IP address and browser type\n- Device information (operating system, screen resolution)\n- Pages visited and time spent on our website\n- Referring website URLs\n- Cookie data and session information\n- Server access logs (for hosting customers)\n\n**Information from Third Parties:**\n- Payment verification data from payment processors (Khalti, eSewa, banks)\n- Domain WHOIS data from registries\n- Fraud prevention data from security partners' },
  { title: '3. How We Use Your Information', body: 'We use your information for the following purposes:\n\n**Service Delivery:**\n- Provisioning and managing your hosting accounts, domains, and email services\n- Processing payments and managing billing\n- Providing technical support and customer service\n- Sending service-related notifications (renewals, maintenance, security alerts)\n\n**Service Improvement:**\n- Analyzing usage patterns to improve our platform\n- Identifying and fixing technical issues\n- Developing new features and services\n- Monitoring service performance and uptime\n\n**Security:**\n- Detecting and preventing fraud, abuse, and security threats\n- Enforcing our Terms of Service and Acceptable Use Policy\n- Protecting our infrastructure and other customers\n\n**Communication:**\n- Responding to your inquiries and support requests\n- Sending important service announcements\n- Marketing communications (only with your consent, and you can opt-out at any time)\n\n**Legal Compliance:**\n- Complying with applicable Nepal laws and regulations\n- Responding to valid legal requests from authorities\n- Protecting our legal rights and interests' },
  { title: '4. Data Storage and Security', body: 'We implement industry-standard security measures to protect your personal information:\n\n**Technical Measures:**\n- SSL/TLS encryption for all data in transit\n- Encrypted storage for sensitive data (passwords, payment information)\n- Firewalls and intrusion detection systems\n- Regular security audits and vulnerability assessments\n- Access controls with principle of least privilege\n- Automated backup systems with encryption\n\n**Organizational Measures:**\n- Employee security training and awareness programs\n- Background checks for personnel with data access\n- Incident response procedures for data breaches\n- Regular review of security policies and procedures\n\n**Data Location:**\nYour hosting data is stored on servers in data centers operated by our infrastructure partner (Contabo) located in Germany, United States, United Kingdom, Japan, Singapore, and Australia. All data centers meet international security and compliance standards.\n\nWhile we implement robust security measures, no system is 100% secure. We cannot guarantee absolute security of your data and encourage you to take your own precautions.' },
  { title: '5. Data Sharing and Disclosure', body: 'We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:\n\n**Service Providers:**\nWe share data with trusted third-party service providers who assist in delivering our services:\n- Payment processors (Khalti, eSewa, bank payment gateways)\n- Domain registries and registrars (for domain registration)\n- Data center providers (for hosting infrastructure)\n- Email delivery services (for transactional emails)\n\nAll service providers are bound by data protection agreements.\n\n**Legal Requirements:**\nWe may disclose your information if required by:\n- Valid court orders or subpoenas\n- Nepal government regulatory requests\n- Law enforcement investigations (with proper legal authority)\n- Protection of our rights, property, or safety\n\n**Business Transfers:**\nIn the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction. We will notify you of any such change.\n\n**With Your Consent:**\nWe may share your information with third parties when you explicitly consent to such sharing.' },
  { title: '6. Cookies and Tracking', body: 'We use cookies and similar technologies to enhance your experience:\n\n**Essential Cookies:** Required for basic website functionality, account login, and security. Cannot be disabled.\n\n**Analytics Cookies:** Help us understand how visitors interact with our website. We use this data to improve our services.\n\n**Preference Cookies:** Remember your settings and preferences for a better experience on return visits.\n\nYou can control cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.\n\nWe do not use cookies for third-party advertising or cross-site tracking.' },
  { title: '7. Your Rights', body: 'You have the following rights regarding your personal data:\n\n**Right to Access:** You can request a copy of the personal data we hold about you.\n\n**Right to Correction:** You can request correction of inaccurate or incomplete personal data.\n\n**Right to Deletion:** You can request deletion of your personal data, subject to our legal retention obligations.\n\n**Right to Data Portability:** You can request your data in a structured, machine-readable format.\n\n**Right to Withdraw Consent:** You can withdraw consent for marketing communications at any time.\n\n**Right to Object:** You can object to certain processing of your data.\n\nTo exercise these rights, contact us at admin@hostingnepals.com. We will respond to your request within 30 days.\n\nNote: Certain data may need to be retained for legal, billing, or legitimate business purposes even after account deletion.' },
  { title: '8. Data Retention', body: 'We retain your personal data for as long as necessary to provide our services and comply with legal obligations:\n\n- **Active Account Data:** Retained for the duration of your account plus 30 days after termination\n- **Billing Records:** Retained for 7 years as required by Nepal tax regulations\n- **Support Communications:** Retained for 3 years for quality and training purposes\n- **Server Access Logs:** Retained for 90 days for security and troubleshooting\n- **Domain WHOIS Data:** Retained as required by ICANN regulations\n- **Marketing Consent Records:** Retained for 3 years after last interaction\n\nAfter the retention period, data is securely deleted or anonymized.' },
  { title: '9. Children\'s Privacy', body: 'Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we discover that a child under 18 has provided us with personal information, we will delete it promptly. If you believe a child has provided us with personal data, please contact us at admin@hostingnepals.com.' },
  { title: '10. International Data Transfers', body: 'As our hosting infrastructure spans multiple countries, your data may be transferred to and processed in countries outside Nepal. We ensure that such transfers are protected by:\n\n- Contractual data protection agreements with all service providers\n- Selection of data centers that meet international security standards\n- Implementation of encryption for data in transit and at rest\n\nBy using our services, you consent to the transfer of your data to our data center locations as described in Section 4.' },
  { title: '11. Third-Party Links', body: 'Our website may contain links to third-party websites and services. We are not responsible for the privacy practices of these external sites. We encourage you to review the privacy policies of any third-party websites you visit through links on our platform.' },
  { title: '12. Changes to This Policy', body: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Material changes will be communicated via:\n\n- Email notification to registered customers\n- Prominent notice on our website\n- Updated "Last Modified" date on this page\n\nContinued use of our services after changes take effect constitutes acceptance of the updated policy.' },
  { title: '13. Contact Us', body: 'For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:\n\n**Marketminds Investment Group**\nKoteshwor-32, Kathmandu, Nepal\n\n**Email:** admin@hostingnepals.com\n**Phone:** +977-9802348957\n**Website:** https://hostingnepals.com\n\nWe take all privacy concerns seriously and will respond to your inquiry within 30 days.' },
]

const PrivacyPage = () => {
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
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>Privacy Policy</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>Last updated: April 12, 2026</Typography>
        </Container>
      </Box>

      <Container maxWidth='md' sx={{ pb: 8 }}>
        {sections.map((section, i) => (
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

export default PrivacyPage
