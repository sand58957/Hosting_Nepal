'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Drawer from '@mui/material/Drawer'

import CustomTextField from '@core/components/mui/TextField'
import Logo from '@core/svg/Logo'
import api from '@/lib/api'

// ── Types ───────────────────────────────────────────────────────────────────
interface Plan {
  id: string; name: string; type: string; priceMonthly: number; priceYearly: number
  currency: string; features: string[]; popular?: boolean
  specs: { diskGB: number; cpuCores?: number; ramGB?: number }
}
interface DomainPrice { tld: string; registerPrice: number; renewPrice: number; currency: string }
interface DomainResult { domain: string; available: boolean; price?: number }

// ── Hero Service Pills (SiteGround cascade style) ───────────────────────────
const heroPills = [
  { icon: 'tabler-world', label: 'Domain Registration', size: 'sm' as const, float: 'up' as const },
  { icon: 'tabler-brand-wordpress', label: 'WordPress Hosting', size: 'lg' as const, active: true, float: 'down' as const },
  { icon: 'tabler-server', label: 'VPS Hosting', size: 'md' as const, float: 'up' as const },
  { icon: 'tabler-server-cog', label: 'VDS Hosting', size: 'md' as const, float: 'down' as const },
  { icon: 'tabler-database', label: 'Dedicated Server', size: 'lg' as const, float: 'up' as const },
]

// ── Data ────────────────────────────────────────────────────────────────────
const productCategories = [
  { icon: 'tabler-world', title: 'Domain Names', desc: 'Register .com, .np, .com.np and 20+ extensions at the best prices in Nepal.', color: '#7367F0', link: '/domains' },
  { icon: 'tabler-brand-wordpress', title: 'WordPress Hosting', desc: 'Managed WordPress with CyberPanel, free SSL, and daily backups. From NPR 1,254/mo.', color: '#28C76F', link: '/hosting/plans' },
  { icon: 'tabler-server', title: 'VPS Servers', desc: 'Full root access, NVMe SSD, dedicated resources. Scale as you grow.', color: '#00BAD1', link: '/vps' },
  { icon: 'tabler-server-cog', title: 'Dedicated Servers', desc: 'Intel Xeon powered bare metal servers for maximum performance and control.', color: '#FF9F43', link: '/vps/dedicated' },
  { icon: 'tabler-mail', title: 'Business Email', desc: 'Professional email with your domain. Google Workspace and custom solutions.', color: '#FF4C51', link: '/email' },
  { icon: 'tabler-shield-lock', title: 'SSL Certificates', desc: 'Secure your website with trusted SSL certificates. Free SSL included with hosting.', color: '#7367F0', link: '/ssl' },
]

const stats = [
  { value: '99.9%', count: '99%', label: 'Uptime', icon: 'tabler-chart-line' },
  { value: '24/7', count: '', label: 'Support', icon: 'tabler-headset' },
  { value: '500+', count: '500+', label: 'Websites Hosted', icon: 'tabler-server' },
  { value: '5000+', count: '5000+', label: 'Happy Customers', icon: 'tabler-users' },
]

const whyUs = [
  { icon: 'tabler-rocket', title: 'Blazing Fast', desc: 'NVMe SSD + LiteSpeed for lightning-fast load times.' },
  { icon: 'tabler-shield-check', title: 'Rock-Solid Security', desc: 'Free SSL, DDoS protection, and automated daily backups.' },
  { icon: 'tabler-currency-rupee-nepalese', title: 'Pay in NPR', desc: 'Khalti, eSewa, and bank transfer. No currency conversion.' },
  { icon: 'tabler-headset', title: 'Local Support', desc: 'Nepal-based support team available via tickets 24/7.' },
  { icon: 'tabler-arrows-up', title: 'Easy Upgrades', desc: 'Scale resources instantly. Upgrade plans with one click.' },
  { icon: 'tabler-brand-open-source', title: 'CyberPanel Free', desc: 'Full CyberPanel + OpenLiteSpeed control panel included.' },
]

const testimonials = [
  { name: 'Rajesh Sharma', role: 'E-commerce Owner', text: 'The speed and local payment support made launching my online store incredibly smooth.', avatar: 'RS' },
  { name: 'Sita Thapa', role: 'Blogger & Content Creator', text: 'Migrating from a foreign host was seamless. eSewa payment and Nepali support are a game changer.', avatar: 'ST' },
  { name: 'Bikash Gurung', role: 'Full-Stack Developer', text: 'CyberPanel, SSH, Git — everything a developer needs. Best hosting service in Nepal, hands down.', avatar: 'BG' },
]

const faqs = [
  { q: 'What payment methods are available?', a: 'We accept Khalti, eSewa, and direct bank transfers. All prices are displayed in Nepali Rupees (NPR), so there is no currency conversion or hidden international transaction fees. Payments are processed securely and your hosting is activated instantly after successful payment.' },
  { q: 'What does the port speed information in your offers mean exactly?', a: 'Port speed refers to the maximum network bandwidth allocated to your server. For example, a 200 Mbit/s port means your server can transfer data at up to 200 megabits per second. Higher-tier plans offer up to 1 Gbit/s port speed. All plans include unlimited incoming and outgoing traffic — you are never charged extra for bandwidth usage regardless of how much traffic your website receives.' },
  { q: 'Do you manage your own data centers and where are they located?', a: 'Our infrastructure is powered by enterprise-grade Contabo data centers located in Germany (Nuremberg, Munich), the United States (St. Louis, Seattle), United Kingdom (London), Japan (Tokyo), Singapore, and Australia (Sydney). All data centers feature redundant power supplies, N+1 cooling systems, 24/7 on-site security, and are connected via multiple Tier-1 network providers for maximum reliability and low latency worldwide.' },
  { q: 'How can I contact your support in case of an inquiry?', a: 'You can reach our Nepal-based support team 24/7 through our built-in ticket system accessible from your dashboard. Simply navigate to the Support section, create a new ticket describing your issue, and our team will respond promptly. For billing inquiries, hosting setup assistance, or technical server issues — our support team is trained to handle it all in both English and Nepali languages.' },
  { q: 'Do I get a free SSL certificate with my hosting?', a: 'Yes! Every hosting plan — from WordPress Hosting to VPS and Dedicated Servers — includes a free SSL certificate powered by Let\'s Encrypt. The SSL certificate is automatically installed and renewed through CyberPanel, ensuring your website always shows the secure padlock icon and HTTPS connection. This improves both security and your Google search ranking.' },
  { q: 'Can I upgrade my hosting plan later?', a: 'Absolutely. You can upgrade your hosting plan at any time directly from your dashboard with zero downtime. When you upgrade, we automatically calculate the prorated balance from your current plan and apply it as credit toward your new plan. This means you only pay the difference for the remaining billing period. Downgrades are also supported — just contact our support team.' },
  { q: 'What control panel do you provide?', a: 'All our hosting plans come with CyberPanel pre-installed, paired with the OpenLiteSpeed web server. CyberPanel provides an intuitive web-based interface for managing websites, databases, email accounts, DNS records, SSL certificates, file manager, and backups. OpenLiteSpeed delivers significantly faster page load times compared to Apache or Nginx, especially for WordPress and PHP-based websites. CyberPanel is completely free — no additional license fees.' },
  { q: 'How long does server provisioning take and can I track progress?', a: 'WordPress Hosting plans are provisioned instantly — your website is ready within 2-3 minutes after payment. VPS servers are typically provisioned within 5-15 minutes. VDS and Dedicated Servers may take 1-4 hours depending on configuration and availability. You can track the provisioning status in real-time from your dashboard. Once ready, you will receive login credentials and server details via email and in your dashboard notification center.' },
  { q: 'Does my server come with DDoS protection?', a: 'Yes, all servers — VPS, VDS, and Dedicated — include always-on DDoS protection at no additional cost. Our infrastructure-level DDoS mitigation can handle volumetric attacks up to 1 Tbps, automatically detecting and filtering malicious traffic while allowing legitimate visitors through. This ensures your website stays online and responsive even during active attacks.' },
  { q: 'Do you offer a money-back guarantee?', a: 'Yes, we offer a 30-day money-back guarantee on all WordPress Hosting plans. If you are not satisfied with our service for any reason within the first 30 days, simply contact our support team and we will issue a full refund — no questions asked. VPS and Dedicated Server plans are eligible for a pro-rated refund within the first 14 days.' },
  { q: 'Can I host multiple websites on a single hosting plan?', a: 'Yes! Our WordPress Business plan and above support unlimited websites on a single hosting account. You can add multiple domains, set up separate WordPress installations for each, and manage them all from one CyberPanel dashboard. Each website gets its own isolated directory, database, and SSL certificate. For VPS and Dedicated Servers, you can host as many websites as your server resources allow.' },
  { q: 'What kind of backups do you provide?', a: 'All hosting plans include automated daily backups that are retained for 7 days. Backups include your complete website files, databases, email data, and server configurations. You can restore any backup with a single click from CyberPanel. VPS and Dedicated Server plans also support on-demand snapshots that you can create before making major changes. We recommend maintaining your own off-site backups as an additional safety measure.' },
]

const popularTlds = ['.com', '.np', '.com.np', '.net', '.org', '.in', '.xyz', '.io']
const planTabs = ['WORDPRESS', 'VPS', 'VDS', 'DEDICATED']
const planTabLabels = ['WordPress', 'VPS', 'VDS', 'Dedicated']

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// ── Glass pill style ────────────────────────────────────────────────────────
const glassPill = (active?: boolean) => ({
  display: 'flex', alignItems: 'center', gap: 2,
  px: active ? 4 : 3, py: active ? 2 : 1.5,
  borderRadius: 50,
  bgcolor: active ? 'rgba(115,103,240,0.2)' : 'rgba(255,255,255,0.07)',
  border: '1px solid',
  borderColor: active ? 'rgba(115,103,240,0.5)' : 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(16px)',
  cursor: 'pointer',
  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
  '&:hover': {
    bgcolor: active ? 'rgba(115,103,240,0.3)' : 'rgba(255,255,255,0.14)',
    borderColor: active ? 'rgba(115,103,240,0.7)' : 'rgba(255,255,255,0.25)',
    transform: 'scale(1.05)',
  },
})

// ── GitHub-style scroll animations: hero parallax + fade-up reveals ──
const useScrollAnimations = () => {
  useEffect(() => {
    const heroText = document.getElementById('hero-text')
    const heroPills = document.getElementById('hero-pills')

    const onScroll = () => {
      const scrollY = window.scrollY
      const vh = window.innerHeight

      // 1. Hero parallax: text fades + scales down, pills shift up
      if (heroText) {
        const progress = Math.min(scrollY / (vh * 0.5), 1)

        heroText.style.opacity = String(1 - progress)
        heroText.style.transform = `scale(${1 - progress * 0.15}) translateY(${scrollY * 0.3}px)`
      }

      if (heroPills) {
        const progress = Math.min(scrollY / (vh * 0.6), 1)

        heroPills.style.transform = `translateY(${-scrollY * 0.15}px)`
        heroPills.style.opacity = String(1 - progress * 0.7)
      }

      // 2. Section fade-ups
      document.querySelectorAll('.fade-up:not(.visible)').forEach(el => {
        if (el.getBoundingClientRect().top < vh - 30) {
          el.classList.add('visible')
        }
      })
    }

    // Fire on load + scroll
    onScroll()
    setTimeout(onScroll, 200)
    setTimeout(onScroll, 600)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
}

// ── Component ───────────────────────────────────────────────────────────────
const HomePage = () => {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [domainPrices, setDomainPrices] = useState<DomainPrice[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [pricingTab, setPricingTab] = useState(0)
  const [domainQuery, setDomainQuery] = useState('')
  const [domainResults, setDomainResults] = useState<DomainResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [activePill, setActivePill] = useState(1) // start on WordPress Hosting

  useEffect(() => { setMounted(true) }, [])

  // Rotate the active tick through each pill every 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePill(prev => (prev + 1) % heroPills.length)
    }, 2500)

    return () => clearInterval(timer)
  }, [])
  useScrollAnimations()

  useEffect(() => {
    const fetchData = async () => {
      const [plansRes, domainsRes, blogRes] = await Promise.allSettled([
        api.get('/hosting/plans'), api.get('/domains/pricing'), api.get('/blog/posts?limit=3')
      ])

      if (plansRes.status === 'fulfilled') {
        const raw = plansRes.value.data?.data?.data ?? plansRes.value.data?.data ?? plansRes.value.data
        setPlans(Array.isArray(raw) ? raw : Array.isArray(raw?.plans) ? raw.plans : [])
      }

      if (domainsRes.status === 'fulfilled') {
        const raw = domainsRes.value.data?.data?.data ?? domainsRes.value.data?.data ?? domainsRes.value.data
        setDomainPrices(Array.isArray(raw) ? raw : [])
      }

      if (blogRes.status === 'fulfilled') {
        const raw = blogRes.value.data?.data?.data ?? blogRes.value.data?.data ?? blogRes.value.data
        setBlogPosts(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [])
      }
    }

    fetchData()
  }, [])

  const handleDomainSearch = async () => {
    if (!domainQuery.trim()) return

    setSearching(true); setSearchError(''); setDomainResults([])

    try {
      const res = await api.get('/domains/search', { params: { domain: domainQuery.trim() } })
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data

      setDomainResults(Array.isArray(raw) ? raw : raw?.results ? raw.results : [raw].filter(Boolean))
    } catch { setSearchError('Domain search failed. Please try again.') }
    finally { setSearching(false) }
  }

  const filteredPlans = plans.filter(p => p.type === planTabs[pricingTab])
  const tldPriceMap = Object.fromEntries(domainPrices.map(d => [`.${d.tld}`, d.registerPrice]))

  const visiblePlans = filteredPlans.slice(0, 5)

  const specLabels = [
    { key: 'cpu', label: 'vCPU Cores', icon: 'tabler-cpu' },
    { key: 'ram', label: 'RAM (GB)', icon: 'tabler-device-desktop' },
    { key: 'disk', label: 'NVMe SSD (GB)', icon: 'tabler-device-sd-card' },
    { key: 'bandwidth', label: 'Traffic', icon: 'tabler-arrows-transfer-up' },
  ]

  const infraMap: Record<string, { cpu: number; ram: number; nvme: number; bw: string }> = {
    'wp-starter': { cpu: 4, ram: 8, nvme: 75, bw: '200 Mbit/s' },
    'wp-essential': { cpu: 4, ram: 8, nvme: 75, bw: '200 Mbit/s' },
    'wp-business': { cpu: 6, ram: 12, nvme: 100, bw: '300 Mbit/s' },
    'wp-developer': { cpu: 6, ram: 12, nvme: 100, bw: '300 Mbit/s' },
    'wp-starter-plus': { cpu: 8, ram: 24, nvme: 200, bw: '600 Mbit/s' },
    'wp-grow-big': { cpu: 8, ram: 24, nvme: 200, bw: '600 Mbit/s' },
    'wp-go-geek': { cpu: 12, ram: 48, nvme: 250, bw: '800 Mbit/s' },
    'wp-enterprise': { cpu: 16, ram: 64, nvme: 300, bw: '1 Gbit/s' },
  }

  const getSpec = (plan: Plan, key: string) => {
    const s: Record<string, any> = plan.specs || {}
    const slug = plan.name?.toLowerCase().replace(/\s+/g, '-')
    const infra = infraMap[plan.id] || infraMap[slug]

    if (key === 'cpu') return `${infra?.cpu || s.cpuCores || s.cpu || '—'} vCPU`
    if (key === 'ram') return `${infra?.ram || s.ramGB || s.ram || '—'} GB`
    if (key === 'disk') return `${infra?.nvme || s.diskGB || s.disk || s.storage || '—'} GB`
    if (key === 'bandwidth') return infra?.bw || s.bandwidth || 'Unlimited'
    return '—'
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a' }}>
      {/* ── CSS Keyframes ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(115,103,240,0.15)} 50%{box-shadow:0 0 40px rgba(115,103,240,0.3)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .hero-gradient { background:linear-gradient(-45deg,#0f0f1a,#1a1a2e,#16213e,#0f0f1a); background-size:300% 300%; animation:gradientShift 12s ease infinite; }
        @keyframes nodePulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.3);opacity:1} }
        @keyframes dataFlow { 0%{stroke-dashoffset:200} 100%{stroke-dashoffset:0} }
        @keyframes dataFlowReverse { 0%{stroke-dashoffset:-200} 100%{stroke-dashoffset:0} }
        @keyframes ringPulse { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(2.5);opacity:0} }
        @keyframes serverBlink { 0%,100%{fill:#28C76F} 50%{fill:#7367F0} }
        @keyframes cascadeIn { 0%{opacity:0;transform:translateY(-30px) scale(0.9)} 60%{opacity:1;transform:translateY(4px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tickPop { 0%{transform:scale(0) rotate(-45deg);opacity:0} 50%{transform:scale(1.3) rotate(0deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes tickDraw { 0%{stroke-dashoffset:20} 100%{stroke-dashoffset:0} }
        @keyframes pillFloatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pillFloatDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes activeGlow { 0%,100%{box-shadow:0 0 15px rgba(40,199,111,0.15), inset 0 0 15px rgba(40,199,111,0.05)} 50%{box-shadow:0 0 30px rgba(40,199,111,0.25), inset 0 0 20px rgba(40,199,111,0.08)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes orbit { 0%{transform:rotate(0deg) translateX(30px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(30px) rotate(-360deg)} }
        .card-hover-anim { position:relative; overflow:hidden; }
        .card-hover-anim::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(40,199,111,0.06),transparent); transition:left 0.6s ease; z-index:0; }
        .card-hover-anim:hover::before { left:100%; }
        .card-hover-anim::after { content:''; position:absolute; bottom:0; left:0; width:0; height:2px; background:linear-gradient(90deg,#28C76F,#7367F0); transition:width 0.4s ease; }
        .card-hover-anim:hover::after { width:100%; }
        .parallax-slow { will-change:transform; }
        .fade-up { opacity:0 !important; transform:translateY(50px) !important; transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1) !important; }
        .fade-up.visible { opacity:1 !important; transform:translateY(0) !important; }
        .fade-up-child { opacity:0 !important; transform:translateY(30px) !important; transition:opacity 0.5s ease, transform 0.6s ease !important; }
        .fade-up.visible .fade-up-child:nth-child(1) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0s; }
        .fade-up.visible .fade-up-child:nth-child(2) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0.1s; }
        .fade-up.visible .fade-up-child:nth-child(3) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0.2s; }
        .fade-up.visible .fade-up-child:nth-child(4) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0.3s; }
        .fade-up.visible .fade-up-child:nth-child(5) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0.4s; }
        .fade-up.visible .fade-up-child:nth-child(6) { opacity:1 !important; transform:translateY(0) !important; transition-delay:0.5s; }
      ` }} />

      {/* ════════════════════════ MEGA NAVBAR ════════════════════════ */}
      {(() => {
        const navMenus = [
          {
            label: 'Hosting', items: [
              { icon: 'tabler-brand-wordpress', title: 'WordPress Hosting', desc: 'Managed WP with LiteSpeed & CyberPanel', link: '/hosting/plans' },
              { icon: 'tabler-server', title: 'VPS Hosting', desc: 'Full root access, NVMe SSD, scalable', link: '/vps/order' },
              { icon: 'tabler-server-cog', title: 'VDS Hosting', desc: 'Dedicated CPU & RAM, enterprise grade', link: '/vps/vds/order' },
              { icon: 'tabler-database', title: 'Dedicated Server', desc: 'Bare metal, Intel Xeon, max performance', link: '/vps/dedicated/order' },
            ]
          },
          {
            label: 'Domains', items: [
              { icon: 'tabler-world', title: 'Register Domain', desc: '.com, .np, .com.np from NPR 1,200', link: '/domains/search' },
              { icon: 'tabler-transfer', title: 'Transfer Domain', desc: 'Move your domain with free extension', link: '/domains/transfers' },
              { icon: 'tabler-dns', title: 'DNS Management', desc: 'Advanced DNS with full record support', link: '/domains/dns' },
              { icon: 'tabler-shield-lock', title: 'WHOIS Privacy', desc: 'Protect your identity for free', link: '/domains' },
            ]
          },
          {
            label: 'Email', items: [
              { icon: 'tabler-mail', title: 'Business Email', desc: 'Professional email with your domain', link: '/email' },
              { icon: 'tabler-brand-google', title: 'Google Workspace', desc: 'Gmail, Drive, Meet for teams', link: '/email/google-workspace' },
              { icon: 'tabler-mail-cog', title: 'Titan Email', desc: 'Built for business communication', link: '/email/titan' },
            ]
          },
          {
            label: 'Security', items: [
              { icon: 'tabler-lock', title: 'SSL Certificates', desc: 'Free & premium SSL for every site', link: '/ssl' },
              { icon: 'tabler-shield-check', title: 'DDoS Protection', desc: 'Always-on attack mitigation', link: '/vps' },
              { icon: 'tabler-scan', title: 'Malware Scanner', desc: 'Auto-detect & remove threats', link: '/hosting/security/scanner' },
            ]
          },
        ]

        const [activeMenu, setActiveMenu] = useState<string | null>(null)
        const [mobileOpen, setMobileOpen] = useState(false)
        const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
        const navTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

        const handleEnter = (label: string) => {
          if (navTimeout.current) clearTimeout(navTimeout.current)
          setActiveMenu(label)
        }
        const handleLeave = () => {
          navTimeout.current = setTimeout(() => setActiveMenu(null), 200)
        }

        return (
          <>
            <Box sx={{
              position: 'sticky', top: 0, zIndex: 1100,
              bgcolor: 'rgba(15,15,26,0.92)', backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Container maxWidth='lg'>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
                  {/* Logo */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', minWidth: 0 }} onClick={() => scrollTo('hero')}>
                    <Logo />
                    <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', whiteSpace: 'nowrap' }}>Hosting Nepal</Typography>
                  </Box>

                  {/* Desktop Nav */}
                  <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5, alignItems: 'center' }}>
                    {navMenus.map(menu => (
                      <Box key={menu.label} onMouseEnter={() => handleEnter(menu.label)} onMouseLeave={handleLeave}
                        sx={{ position: 'relative' }}>
                        <Button size='small' endIcon={<i className='tabler-chevron-down' style={{ fontSize: 14, transition: '0.2s', transform: activeMenu === menu.label ? 'rotate(180deg)' : 'none' }} />}
                          sx={{
                            color: activeMenu === menu.label ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'none',
                            borderRadius: 2, px: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                          }}>
                          {menu.label}
                        </Button>

                        {/* Dropdown Mega Menu */}
                        <Box onMouseEnter={() => handleEnter(menu.label)} onMouseLeave={handleLeave}
                          sx={{
                            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                            pt: 1, opacity: activeMenu === menu.label ? 1 : 0,
                            pointerEvents: activeMenu === menu.label ? 'auto' : 'none',
                            transition: 'opacity 0.2s ease, transform 0.2s ease',
                          }}>
                          <Paper elevation={0} sx={{
                            bgcolor: 'rgba(20,20,38,0.98)', backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3,
                            p: 1.5, minWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                          }}>
                            {menu.items.map(item => (
                              <Box key={item.title} onClick={() => { router.push(item.link); setActiveMenu(null) }}
                                sx={{
                                  display: 'flex', gap: 2, p: 1.5, borderRadius: 2, cursor: 'pointer',
                                  transition: '0.2s', '&:hover': { bgcolor: 'rgba(115,103,240,0.08)' },
                                }}>
                                <Box sx={{
                                  width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  bgcolor: 'rgba(115,103,240,0.1)', color: '#7367F0', flexShrink: 0,
                                }}>
                                  <i className={item.icon} style={{ fontSize: 20 }} />
                                </Box>
                                <Box>
                                  <Typography variant='body2' fontWeight={600} sx={{ color: '#fff', lineHeight: 1.4 }}>{item.title}</Typography>
                                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{item.desc}</Typography>
                                </Box>
                              </Box>
                            ))}
                          </Paper>
                        </Box>
                      </Box>
                    ))}

                    {/* Direct links */}
                    <Button size='small' onClick={() => router.push('/articles')}
                      sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'none', borderRadius: 2, px: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                      Blog
                    </Button>
                    <Button size='small' onClick={() => scrollTo('faq')}
                      sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'none', borderRadius: 2, px: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                      FAQ
                    </Button>
                  </Box>

                  {/* Right Actions */}
                  <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center' }}>
                    <Button size='small' onClick={() => router.push('/login')}
                      sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}>
                      Sign In
                    </Button>
                    <Button variant='contained' size='small' disableElevation onClick={() => router.push('/register')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: { xs: 2, sm: 3 }, bgcolor: '#7367F0', '&:hover': { bgcolor: '#5E50EE' } }}>
                      Get Started
                    </Button>
                    {/* Mobile Menu Button */}
                    <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { xs: 'flex', lg: 'none' }, color: '#fff', ml: 0.5 }}>
                      <i className='tabler-menu-2' style={{ fontSize: 22 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Container>
            </Box>

            {/* Mobile Drawer */}
            <Drawer anchor='right' open={mobileOpen} onClose={() => setMobileOpen(false)}
              PaperProps={{ sx: { bgcolor: '#0f0f1a', width: 300, p: 0, borderLeft: '1px solid rgba(255,255,255,0.06)' } }}>
              <Box sx={{ p: 2.5 }}>
                {/* Drawer Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Logo />
                    <Typography variant='body1' fontWeight={800} sx={{ color: '#fff' }}>Hosting Nepal</Typography>
                  </Box>
                  <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    <i className='tabler-x' style={{ fontSize: 20 }} />
                  </IconButton>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

                {/* Mobile Menu Items */}
                {navMenus.map(menu => (
                  <Box key={menu.label} sx={{ mb: 0.5 }}>
                    <Button fullWidth onClick={() => setMobileExpanded(mobileExpanded === menu.label ? null : menu.label)}
                      endIcon={<i className={mobileExpanded === menu.label ? 'tabler-chevron-up' : 'tabler-chevron-down'} style={{ fontSize: 14 }} />}
                      sx={{
                        justifyContent: 'space-between', color: mobileExpanded === menu.label ? '#fff' : 'rgba(255,255,255,0.7)',
                        textTransform: 'none', fontWeight: 600, py: 1.2, px: 1.5, borderRadius: 2,
                        bgcolor: mobileExpanded === menu.label ? 'rgba(115,103,240,0.08)' : 'transparent',
                      }}>
                      {menu.label}
                    </Button>
                    {mobileExpanded === menu.label && (
                      <Box sx={{ pl: 1, pb: 1 }}>
                        {menu.items.map(item => (
                          <Box key={item.title} onClick={() => { router.push(item.link); setMobileOpen(false) }}
                            sx={{
                              display: 'flex', gap: 1.5, p: 1.2, borderRadius: 2, cursor: 'pointer',
                              transition: '0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                            }}>
                            <i className={item.icon} style={{ fontSize: 18, color: '#7367F0', marginTop: 2 }} />
                            <Box>
                              <Typography variant='body2' fontWeight={500} sx={{ color: '#fff', fontSize: '0.85rem' }}>{item.title}</Typography>
                              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>{item.desc}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />

                <Button fullWidth onClick={() => { router.push('/articles'); setMobileOpen(false) }}
                  sx={{ justifyContent: 'flex-start', color: 'rgba(255,255,255,0.7)', textTransform: 'none', fontWeight: 600, py: 1.2, px: 1.5, borderRadius: 2 }}>
                  <i className='tabler-article' style={{ fontSize: 18, marginRight: 10 }} /> Blog
                </Button>
                <Button fullWidth onClick={() => { scrollTo('faq'); setMobileOpen(false) }}
                  sx={{ justifyContent: 'flex-start', color: 'rgba(255,255,255,0.7)', textTransform: 'none', fontWeight: 600, py: 1.2, px: 1.5, borderRadius: 2 }}>
                  <i className='tabler-help-circle' style={{ fontSize: 18, marginRight: 10 }} /> FAQ
                </Button>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />

                <Button fullWidth variant='outlined' onClick={() => { router.push('/login'); setMobileOpen(false) }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, mb: 1.5, color: '#fff', borderColor: 'rgba(255,255,255,0.15)', '&:hover': { borderColor: 'rgba(255,255,255,0.3)' } }}>
                  Sign In
                </Button>
                <Button fullWidth variant='contained' disableElevation onClick={() => { router.push('/register'); setMobileOpen(false) }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: '#7367F0', '&:hover': { bgcolor: '#5E50EE' } }}>
                  Get Started
                </Button>
              </Box>
            </Drawer>
          </>
        )
      })()}

      {/* ════════════════════════ HERO — Dark + Floating Pills ════════════════════════ */}
      <Box id='hero' className='hero-gradient' sx={{
        position: 'relative', overflow: 'hidden',
        pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 16 },
        '&::before': {
          content: '""', position: 'absolute', top: '50%', left: '50%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(115,103,240,0.08) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none'
        }
      }}>
        <Container maxWidth='lg'>
          <Grid container spacing={4} alignItems='center'>
            {/* Left — Text + CTA */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box id='hero-text' sx={{ animation: mounted ? 'fadeSlideUp 0.8s ease-out' : 'none', willChange: 'transform, opacity' }}>
                <Chip label='TRUSTED BY 5,000+ BUSINESSES' size='small' sx={{
                  mb: 3, fontWeight: 700, letterSpacing: 1.5, fontSize: '0.65rem',
                  bgcolor: 'rgba(115,103,240,0.15)', color: '#A89CF5', border: '1px solid rgba(115,103,240,0.3)'
                }} />
                <Typography variant='h2' fontWeight={800} sx={{
                  color: '#fff', mb: 2.5, lineHeight: 1.15,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3.2rem' }
                }}>
                  Build Your
                  <Box component='span' sx={{
                    background: 'linear-gradient(135deg, #7367F0, #CE9FFC)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}> Digital Presence</Box>
                  <br />in Nepal
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.55)', mb: 4, maxWidth: 440, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  Domains, hosting, VPS, and SSL — all with local pricing in NPR and Nepal payment support. Start from NPR 599/mo.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant='contained' size='large' disableElevation onClick={() => router.push('/register')}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 4, py: 1.5, fontSize: '1rem', bgcolor: '#28C76F', '&:hover': { bgcolor: '#1FAF5E' } }}>
                    Get Started Free
                  </Button>
                  <Button variant='outlined' size='large' onClick={() => scrollTo('pricing')}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 4, py: 1.5, fontSize: '1rem',
                      borderColor: 'rgba(255,255,255,0.15)', color: '#fff',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.04)' }
                    }}>
                    View Plans
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Right — SiteGround-style Cascading Pills with rotating tick */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box id='hero-pills' sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 4, willChange: 'transform, opacity' }}>
                {heroPills.map((pill, idx) => {
                  const delay = 0.3 + idx * 0.15
                  const isActive = activePill === idx
                  const isLg = pill.size === 'lg'
                  const isSm = pill.size === 'sm'

                  return (
                    <Box
                      key={pill.label}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2, position: 'relative',
                        px: isLg ? 4 : isSm ? 2.5 : 3,
                        py: isLg ? 2.2 : isSm ? 1.2 : 1.5,
                        borderRadius: isLg ? 4 : 3,
                        width: isLg ? '100%' : isSm ? '70%' : '85%',
                        maxWidth: isLg ? 420 : isSm ? 300 : 360,
                        bgcolor: isActive ? 'rgba(40,199,111,0.08)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid',
                        borderColor: isActive ? 'rgba(40,199,111,0.3)' : 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(12px)',
                        cursor: 'pointer',
                        opacity: mounted ? 1 : 0,
                        animation: mounted
                          ? `cascadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both, ${pill.float === 'up' ? 'pillFloatUp' : 'pillFloatDown'} ${3.5 + idx * 0.4}s ease-in-out ${delay + 0.8}s infinite`
                          : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        boxShadow: isActive ? '0 0 25px rgba(40,199,111,0.2), inset 0 0 15px rgba(40,199,111,0.05)' : 'none',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          borderColor: isActive ? 'rgba(40,199,111,0.5)' : 'rgba(255,255,255,0.2)',
                          bgcolor: isActive ? 'rgba(40,199,111,0.12)' : 'rgba(255,255,255,0.08)',
                        },
                      }}
                      onClick={() => router.push('/register')}
                    >
                      {/* Icon */}
                      <Box sx={{
                        width: isLg ? 44 : isSm ? 32 : 38,
                        height: isLg ? 44 : isSm ? 32 : 38,
                        borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: isActive ? 'rgba(40,199,111,0.15)' : 'rgba(255,255,255,0.06)',
                        flexShrink: 0, transition: 'all 0.4s ease',
                      }}>
                        <i className={pill.icon} style={{
                          fontSize: isLg ? 22 : isSm ? 16 : 18,
                          color: isActive ? '#28C76F' : 'rgba(255,255,255,0.4)',
                          transition: 'color 0.4s ease',
                        }} />
                      </Box>

                      {/* Label */}
                      <Typography variant={isLg ? 'body1' : 'body2'} sx={{
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontWeight: isActive ? 700 : 500,
                        flex: 1, transition: 'all 0.4s ease',
                      }}>
                        {pill.label}
                      </Typography>

                      {/* Tick — shows on active pill with pop animation */}
                      <Box sx={{
                        width: 30, height: 30, borderRadius: '50%',
                        bgcolor: isActive ? '#28C76F' : 'transparent',
                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transform: isActive ? 'scale(1)' : 'scale(0.7)',
                        opacity: isActive ? 1 : 0,
                        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: isActive ? '0 0 12px rgba(40,199,111,0.4)' : 'none',
                      }}>
                        <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                          <path
                            d='M3 8.5L6.5 12L13 4'
                            stroke='#fff'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            style={{
                              strokeDasharray: 20,
                              strokeDashoffset: isActive ? 0 : 20,
                              transition: 'stroke-dashoffset 0.3s ease 0.1s',
                            }}
                          />
                        </svg>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ════════════════════════ STATS ════════════════════════ */}
      <Box className='fade-up' sx={{ bgcolor: '#131325', py: 5, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth='lg'>
          <Grid container spacing={3}>
            {stats.map(s => (
              <Grid size={{ xs: 6, md: 3 }} key={s.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', width: 44, height: 44 }}>
                    <i className={s.icon} style={{ fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='h5' fontWeight={800} sx={{ color: '#fff', lineHeight: 1 }}
                      {...(s.count ? { 'data-count': s.count } : {})}
                    >{s.value}</Typography>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      

      {/* ════════════════════════ HOSTING CONNECTION ANIMATION ════════════════════════ */}
      <Box className='fade-up' sx={{ bgcolor: '#0f0f1a', py: { xs: 8, md: 12 }, overflow: 'hidden', position: 'relative' }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 5, position: 'relative', zIndex: 2 }}>
            <Chip label='INFRASTRUCTURE' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(115,103,240,0.15)', color: '#A89CF5', border: '1px solid rgba(115,103,240,0.3)' }} />
            <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.5rem', md: '2.2rem' } }}>
              Global Network, Local Speed
            </Typography>
            <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, maxWidth: 500, mx: 'auto' }}>
              Your website connects through our optimized infrastructure for blazing-fast performance.
            </Typography>
          </Box>

          {/* SVG Network Animation */}
          <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto', height: { xs: 300, md: 400 } }}>
            <svg viewBox='0 0 800 400' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ width: '100%', height: '100%' }}>
              {/* Connection Lines */}
              {/* User → CDN */}
              <path d='M150 200 Q300 120 400 200' stroke='url(#lineGrad1)' strokeWidth='1.5' strokeDasharray='6 4' style={{ animation: 'dataFlow 3s linear infinite' }} />
              {/* CDN → Server */}
              <path d='M400 200 Q500 280 650 200' stroke='url(#lineGrad2)' strokeWidth='1.5' strokeDasharray='6 4' style={{ animation: 'dataFlowReverse 3.5s linear infinite' }} />
              {/* User → Server direct */}
              <path d='M150 200 Q400 340 650 200' stroke='rgba(115,103,240,0.15)' strokeWidth='1' strokeDasharray='4 6' style={{ animation: 'dataFlow 5s linear infinite' }} />
              {/* CDN → Nepal */}
              <path d='M400 200 Q350 60 200 80' stroke='url(#lineGrad3)' strokeWidth='1' strokeDasharray='5 5' style={{ animation: 'dataFlow 4s linear infinite' }} />
              {/* Server → Nepal */}
              <path d='M650 200 Q550 60 420 80' stroke='url(#lineGrad3)' strokeWidth='1' strokeDasharray='5 5' style={{ animation: 'dataFlowReverse 4.5s linear infinite' }} />
              {/* Extra decorative connections */}
              <path d='M400 200 Q450 120 550 100' stroke='rgba(40,199,111,0.2)' strokeWidth='1' strokeDasharray='3 5' style={{ animation: 'dataFlow 6s linear infinite' }} />
              <path d='M150 200 Q120 130 180 80' stroke='rgba(115,103,240,0.12)' strokeWidth='1' strokeDasharray='3 5' style={{ animation: 'dataFlowReverse 5.5s linear infinite' }} />

              {/* Flowing Data Packets on User→CDN */}
              <circle r='3' fill='#7367F0' opacity='0.9'>
                <animateMotion dur='2.5s' repeatCount='indefinite' path='M150 200 Q300 120 400 200' />
                <animate attributeName='opacity' values='0;1;1;0' dur='2.5s' repeatCount='indefinite' />
              </circle>
              <circle r='3' fill='#28C76F' opacity='0.9'>
                <animateMotion dur='3s' repeatCount='indefinite' path='M400 200 Q500 280 650 200' />
                <animate attributeName='opacity' values='0;1;1;0' dur='3s' repeatCount='indefinite' />
              </circle>
              <circle r='2.5' fill='#A89CF5' opacity='0.8'>
                <animateMotion dur='4s' repeatCount='indefinite' path='M150 200 Q400 340 650 200' begin='1s' />
                <animate attributeName='opacity' values='0;0.8;0.8;0' dur='4s' repeatCount='indefinite' begin='1s' />
              </circle>
              <circle r='2' fill='#00BAD1' opacity='0.8'>
                <animateMotion dur='3.5s' repeatCount='indefinite' path='M400 200 Q350 60 200 80' begin='0.5s' />
                <animate attributeName='opacity' values='0;0.8;0.8;0' dur='3.5s' repeatCount='indefinite' begin='0.5s' />
              </circle>

              {/* ── NODE: Your Website (User) ── */}
              {/* Pulse ring */}
              <circle cx='150' cy='200' r='24' fill='none' stroke='#7367F0' strokeWidth='1' opacity='0.3'>
                <animate attributeName='r' values='24;48' dur='2s' repeatCount='indefinite' />
                <animate attributeName='opacity' values='0.3;0' dur='2s' repeatCount='indefinite' />
              </circle>
              <circle cx='150' cy='200' r='28' fill='rgba(115,103,240,0.15)' stroke='rgba(115,103,240,0.4)' strokeWidth='1.5' />
              <circle cx='150' cy='200' r='6' fill='#7367F0' style={{ animation: 'nodePulse 2s ease-in-out infinite' }} />
              <text x='150' y='252' textAnchor='middle' fill='rgba(255,255,255,0.7)' fontSize='12' fontWeight='600' fontFamily='inherit'>Your Website</text>

              {/* ── NODE: CDN (Center) ── */}
              <circle cx='400' cy='200' r='24' fill='none' stroke='#28C76F' strokeWidth='1' opacity='0.3'>
                <animate attributeName='r' values='24;52' dur='2.5s' repeatCount='indefinite' />
                <animate attributeName='opacity' values='0.3;0' dur='2.5s' repeatCount='indefinite' />
              </circle>
              <circle cx='400' cy='200' r='36' fill='rgba(40,199,111,0.1)' stroke='rgba(40,199,111,0.4)' strokeWidth='1.5' />
              <circle cx='400' cy='200' r='8' style={{ animation: 'serverBlink 3s ease-in-out infinite' }} />
              {/* Server icon lines inside */}
              <rect x='389' y='192' width='22' height='5' rx='1' fill='rgba(255,255,255,0.3)' />
              <rect x='389' y='200' width='22' height='5' rx='1' fill='rgba(255,255,255,0.2)' />
              <text x='400' y='258' textAnchor='middle' fill='rgba(255,255,255,0.7)' fontSize='12' fontWeight='600' fontFamily='inherit'>CDN Edge</text>

              {/* ── NODE: Data Center (Right) ── */}
              <circle cx='650' cy='200' r='24' fill='none' stroke='#FF9F43' strokeWidth='1' opacity='0.3'>
                <animate attributeName='r' values='24;48' dur='3s' repeatCount='indefinite' />
                <animate attributeName='opacity' values='0.3;0' dur='3s' repeatCount='indefinite' />
              </circle>
              <circle cx='650' cy='200' r='32' fill='rgba(255,159,67,0.1)' stroke='rgba(255,159,67,0.4)' strokeWidth='1.5' />
              <circle cx='650' cy='200' r='7' fill='#FF9F43' style={{ animation: 'nodePulse 2.5s ease-in-out infinite 0.5s' }} />
              <text x='650' y='255' textAnchor='middle' fill='rgba(255,255,255,0.7)' fontSize='12' fontWeight='600' fontFamily='inherit'>Data Center</text>

              {/* ── NODE: Nepal (Top-left) ── */}
              <circle cx='200' cy='80' r='18' fill='rgba(0,186,209,0.1)' stroke='rgba(0,186,209,0.35)' strokeWidth='1' />
              <circle cx='200' cy='80' r='4' fill='#00BAD1' style={{ animation: 'nodePulse 3s ease-in-out infinite 1s' }} />
              <text x='200' y='112' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='10' fontWeight='500' fontFamily='inherit'>Nepal</text>

              {/* ── NODE: Global (Top-center) ── */}
              <circle cx='420' cy='80' r='18' fill='rgba(115,103,240,0.08)' stroke='rgba(115,103,240,0.3)' strokeWidth='1' />
              <circle cx='420' cy='80' r='4' fill='#A89CF5' style={{ animation: 'nodePulse 2.8s ease-in-out infinite 0.3s' }} />
              <text x='420' y='112' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='10' fontWeight='500' fontFamily='inherit'>Global</text>

              {/* ── NODE: SSL (Top-right) ── */}
              <circle cx='550' cy='100' r='15' fill='rgba(40,199,111,0.08)' stroke='rgba(40,199,111,0.3)' strokeWidth='1' />
              <circle cx='550' cy='100' r='3.5' fill='#28C76F' style={{ animation: 'nodePulse 3.2s ease-in-out infinite 0.8s' }} />
              <text x='550' y='128' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='10' fontWeight='500' fontFamily='inherit'>SSL</text>

              {/* ── NODE: DNS (Bottom) ── */}
              <circle cx='300' cy='330' r='16' fill='rgba(255,76,81,0.08)' stroke='rgba(255,76,81,0.25)' strokeWidth='1' />
              <circle cx='300' cy='330' r='3.5' fill='#FF4C51' style={{ animation: 'nodePulse 3.5s ease-in-out infinite 1.5s' }} />
              <text x='300' y='358' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='10' fontWeight='500' fontFamily='inherit'>DNS</text>
              <path d='M300 330 Q320 270 400 200' stroke='rgba(255,76,81,0.15)' strokeWidth='1' strokeDasharray='3 5' style={{ animation: 'dataFlow 5s linear infinite' }} />

              {/* ── NODE: Firewall (Bottom-right) ── */}
              <circle cx='530' cy='320' r='16' fill='rgba(255,159,67,0.08)' stroke='rgba(255,159,67,0.25)' strokeWidth='1' />
              <circle cx='530' cy='320' r='3.5' fill='#FF9F43' style={{ animation: 'nodePulse 2.7s ease-in-out infinite 0.7s' }} />
              <text x='530' y='348' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='10' fontWeight='500' fontFamily='inherit'>Firewall</text>
              <path d='M530 320 Q580 260 650 200' stroke='rgba(255,159,67,0.15)' strokeWidth='1' strokeDasharray='3 5' style={{ animation: 'dataFlowReverse 4.5s linear infinite' }} />

              {/* Gradient definitions */}
              <defs>
                <linearGradient id='lineGrad1' x1='0' y1='0' x2='1' y2='0'>
                  <stop offset='0%' stopColor='#7367F0' stopOpacity='0.6' />
                  <stop offset='100%' stopColor='#28C76F' stopOpacity='0.4' />
                </linearGradient>
                <linearGradient id='lineGrad2' x1='0' y1='0' x2='1' y2='0'>
                  <stop offset='0%' stopColor='#28C76F' stopOpacity='0.5' />
                  <stop offset='100%' stopColor='#FF9F43' stopOpacity='0.4' />
                </linearGradient>
                <linearGradient id='lineGrad3' x1='0' y1='0' x2='1' y2='0'>
                  <stop offset='0%' stopColor='#00BAD1' stopOpacity='0.4' />
                  <stop offset='100%' stopColor='#7367F0' stopOpacity='0.3' />
                </linearGradient>
              </defs>
            </svg>
          </Box>

          {/* Connection Info Cards */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {[
              { icon: 'tabler-bolt', label: '<50ms', desc: 'Latency in Nepal', color: '#7367F0' },
              { icon: 'tabler-server', label: 'NVMe SSD', desc: 'Storage on all plans', color: '#28C76F' },
              { icon: 'tabler-shield-check', label: 'DDoS Shield', desc: 'Always-on protection', color: '#FF9F43' },
              { icon: 'tabler-world', label: 'Global CDN', desc: 'Edge caching', color: '#00BAD1' },
            ].map(item => (
              <Grid size={{ xs: 6, md: 3 }} key={item.label}>
                <Box sx={{
                  textAlign: 'center', p: 2.5, borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)', transition: '0.3s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: `${item.color}40`, transform: 'translateY(-2px)' }
                }}>
                  <i className={item.icon} style={{ fontSize: 24, color: item.color, marginBottom: 8, display: 'block' }} />
                  <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#fff' }}>{item.label}</Typography>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.45)' }}>{item.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      

      {/* ════════════════════════ DOMAIN SEARCH ════════════════════════ */}
      
      <Box id='domains' className='fade-up' sx={{ py: { xs: 8, md: 12 }, bgcolor: '#131325' }}>
        <Container maxWidth='md' sx={{ textAlign: 'center' }}>
          <Chip label='DOMAINS' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.25)' }} />
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 1, fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
            Find Your Perfect Domain
          </Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}>
            Search from .com, .np, .com.np and 20+ extensions.
          </Typography>

          <Paper elevation={0} sx={{
            display: 'flex', alignItems: 'center', maxWidth: 640, mx: 'auto',
            border: '2px solid #28C76F', borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.04)',
            transition: '0.2s', '&:focus-within': { boxShadow: '0 0 0 4px rgba(40,199,111,0.15)' }
          }}>
            <CustomTextField fullWidth placeholder='Search your domain name...' value={domainQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDomainQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleDomainSearch()}
              sx={{ '& .MuiInputBase-root': { border: 'none', borderRadius: 0, bgcolor: 'transparent', color: '#fff' }, '& fieldset': { border: 'none' }, '& input::placeholder': { color: 'rgba(255,255,255,0.35)' } }}
              slotProps={{ input: { startAdornment: <InputAdornment position='start'><i className='tabler-search' style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }} /></InputAdornment> } }}
            />
            <Button variant='contained' disableElevation onClick={handleDomainSearch} disabled={searching}
              sx={{ borderRadius: 0, height: 52, minWidth: { xs: 80, sm: 130 }, textTransform: 'none', fontWeight: 700, bgcolor: '#28C76F', '&:hover': { bgcolor: '#1FAF5E' } }}>
              {searching ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Search'}
            </Button>
          </Paper>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
            {popularTlds.map(tld => (
              <Chip key={tld} variant='outlined' sx={{ borderRadius: 2, fontWeight: 500, borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#28C76F' } }}
                label={<span><strong style={{ color: '#fff' }}>{tld}</strong>{tldPriceMap[tld] ? ` NPR ${tldPriceMap[tld]?.toLocaleString()}` : ''}</span>}
              />
            ))}
          </Box>

          {searchError && <Alert severity='error' sx={{ mt: 3, maxWidth: 640, mx: 'auto' }}>{searchError}</Alert>}
          {domainResults.length > 0 && (
            <Card sx={{ mt: 3, maxWidth: 640, mx: 'auto', textAlign: 'left', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent sx={{ p: 0 }}>
                {domainResults.map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, borderBottom: i < domainResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <i className={r.available ? 'tabler-circle-check' : 'tabler-circle-x'} style={{ fontSize: 22, color: r.available ? '#28C76F' : '#FF4C51' }} />
                      <Typography variant='body1' fontWeight={600} sx={{ color: '#fff' }}>{r.domain}</Typography>
                      <Chip label={r.available ? 'Available' : 'Taken'} size='small' color={r.available ? 'success' : 'error'} sx={{ fontWeight: 600 }} />
                    </Box>
                    {r.available && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {r.price && <Typography variant='body2' fontWeight={700} sx={{ color: '#28C76F' }}>NPR {r.price?.toLocaleString()}/yr</Typography>}
                        <Button size='small' variant='contained' disableElevation sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#28C76F', '&:hover': { bgcolor: '#1FAF5E' } }} onClick={() => router.push('/register')}>Register</Button>
                      </Box>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
      

      {/* ════════════════════════ PRODUCTS ════════════════════════ */}
      <Box className='fade-up' sx={{ py: { xs: 8, md: 12 }, bgcolor: '#0f0f1a' }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label='OUR PRODUCTS' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.25)' }} />
            <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
              Everything for Your Online Presence
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {productCategories.map(cat => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.title} className='fade-up-child'>
                <Card className='card-hover-anim' onClick={() => router.push(cat.link)} sx={{
                  height: '100%', cursor: 'pointer', borderRadius: 3, transition: '0.3s cubic-bezier(0.4,0,0.2,1)',
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  '&:hover': { borderColor: cat.color, transform: 'translateY(-8px) scale(1.02)', boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 20px ${cat.color}15` },
                  '&:hover .card-icon': { transform: 'scale(1.15) rotate(5deg)', transition: '0.3s' },
                }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Avatar className='card-icon' sx={{ bgcolor: `${cat.color}20`, color: cat.color, width: 52, height: 52, mb: 2.5, borderRadius: 2.5, transition: '0.3s' }}>
                      <i className={cat.icon} style={{ fontSize: 26 }} />
                    </Avatar>
                    <Typography variant='h6' fontWeight={700} sx={{ mb: 1, color: '#fff' }}>{cat.title}</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{cat.desc}</Typography>
                    <Typography variant='body2' sx={{ mt: 2, color: cat.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Learn more <i className='tabler-arrow-right' style={{ fontSize: 16 }} />
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      

      {/* ════════════════════════ HOSTING PLANS — Contabo-style ════════════════════════ */}
      
      <Box id='pricing' className='fade-up' sx={{ bgcolor: '#0f0f1a', py: { xs: 6, md: 10 } }}>
        <Container maxWidth='lg'>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.6rem', md: '2.4rem' } }}>
              The Best Value Hosting in Nepal
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 4 }, flexWrap: 'wrap', mt: 2.5 }}>
              {['Best Price-to-Performance', 'Unlimited Traffic up to 1 Gbit/s', 'Always-on DDoS Protection'].map(t => (
                <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <i className='tabler-circle-check-filled' style={{ fontSize: 18, color: '#28C76F' }} />
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }}>{t}</Typography>
                </Box>
              ))}
            </Box>
            {/* Trust bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 2.5 }}>
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)' }}>Our customers say</Typography>
              <Typography variant='body1' fontWeight={700} sx={{ color: '#fff' }}>Excellent</Typography>
              <Box sx={{ display: 'flex', gap: 0.3 }}>
                {[...Array(5)].map((_, i) => <i key={i} className='tabler-star-filled' style={{ fontSize: 16, color: '#FF9F43' }} />)}
              </Box>
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)' }}>4.5/5</Typography>
            </Box>
          </Box>

          {/* Plan type tabs */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 5 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex' }}>
              <Tabs value={pricingTab} onChange={(_, v) => setPricingTab(v)} variant='scrollable' scrollButtons='auto'
                sx={{
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44, color: 'rgba(255,255,255,0.5)' },
                  '& .Mui-selected': { color: '#fff !important' },
                  '& .MuiTabs-indicator': { bgcolor: '#7367F0', borderRadius: 2 }
                }}>
                {planTabLabels.map(l => <Tab key={l} label={l} />)}
              </Tabs>
            </Paper>
          </Box>

          {/* Pricing Cards Grid */}
          {filteredPlans.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={32} sx={{ color: '#7367F0' }} /></Box>
          ) : (
            <Grid container spacing={3} justifyContent='center'>
              {visiblePlans.map((plan, planIdx) => {
                const isBest = plan.popular || planIdx === 1
                return (
                  <Grid size={{ xs: 12, sm: 6, md: visiblePlans.length <= 3 ? 4 : visiblePlans.length <= 4 ? 3 : 2.4 }} key={plan.id}>
                    <Box sx={{
                      border: '2px solid', borderColor: isBest ? '#28C76F' : 'rgba(255,255,255,0.1)',
                      borderRadius: 3, overflow: 'hidden',
                      bgcolor: isBest ? 'rgba(40,199,111,0.04)' : 'rgba(255,255,255,0.02)',
                      transition: '0.3s', height: '100%',
                      '&:hover': { borderColor: isBest ? '#28C76F' : '#7367F0', transform: 'translateY(-6px)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }
                    }}>
                      {/* Best selling badge */}
                      {isBest && (
                        <Box sx={{ bgcolor: '#28C76F', py: 0.6, textAlign: 'center' }}>
                          <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.5, fontSize: '0.7rem' }}>
                            BEST SELLING
                          </Typography>
                        </Box>
                      )}

                      {/* Plan header */}
                      <Box sx={{ textAlign: 'center', py: 3, px: 2, bgcolor: isBest ? 'rgba(40,199,111,0.06)' : 'transparent' }}>
                        <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>{plan.name}</Typography>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through' }}>
                          NPR {Math.round(plan.priceMonthly * 1.2).toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mt: 0.5, mb: 0.5 }}>
                          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.6rem', md: '2rem' }, lineHeight: 1 }}>
                            {Math.floor(plan.priceMonthly).toLocaleString()}
                          </Typography>
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant='caption' sx={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}>
                              .{String(plan.priceMonthly % 1 > 0 ? Math.round((plan.priceMonthly % 1) * 100) : '00').padStart(2, '0')}
                            </Typography>
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', display: 'block' }}>NPR/mo</Typography>
                          </Box>
                        </Box>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)' }}>
                          NPR {plan.priceYearly?.toLocaleString()}/yr
                        </Typography>
                      </Box>

                      {/* Spec rows */}
                      <Box sx={{ px: 2, py: 1 }}>
                        {specLabels.map((spec, i) => (
                          <Box key={spec.key} sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            py: 1.2, borderBottom: i < specLabels.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className={spec.icon} style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }} />
                              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.5)' }}>{spec.label}</Typography>
                            </Box>
                            <Typography variant='body2' fontWeight={700} sx={{ color: '#fff' }}>
                              {getSpec(plan, spec.key)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* CTA */}
                      <Box sx={{ px: 2, pb: 2.5, pt: 1 }}>
                        <Button variant='contained' disableElevation fullWidth onClick={() => router.push('/register')}
                          sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2,
                            bgcolor: isBest ? '#28C76F' : '#7367F0',
                            '&:hover': { bgcolor: isBest ? '#1FAF5E' : '#5E50EE' }
                          }}>
                          Get Started
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          )}

          {filteredPlans.length > 5 && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button variant='outlined' onClick={() => router.push('/hosting/plans')}
                sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 2, '&:hover': { borderColor: '#7367F0', bgcolor: 'rgba(115,103,240,0.1)' } }}>
                View All {planTabLabels[pricingTab]} Plans <i className='tabler-arrow-right' style={{ marginLeft: 6 }} />
              </Button>
            </Box>
          )}
        </Container>
      </Box>
      

      {/* ════════════════════════ WHY US ════════════════════════ */}
      
      <Box id='features' className='fade-up' sx={{ bgcolor: '#0f0f1a', py: { xs: 8, md: 12 } }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Chip label='WHY HOSTING NEPAL' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(115,103,240,0.15)', color: '#A89CF5', border: '1px solid rgba(115,103,240,0.3)' }} />
            <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
              Built for Nepal. Built for Speed.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {whyUs.map(f => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title} className='fade-up-child'>
                <Box sx={{
                  display: 'flex', gap: 2.5, p: 3, borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)', height: '100%',
                  transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(115,103,240,0.3)', transform: 'translateY(-4px)' }
                }}>
                  <Avatar sx={{ bgcolor: 'rgba(115,103,240,0.15)', color: '#A89CF5', width: 48, height: 48, borderRadius: 2.5, flexShrink: 0 }}>
                    <i className={f.icon} style={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>{f.title}</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{f.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      

      {/* ════════════════════════ TESTIMONIALS ════════════════════════ */}
      <Box className='fade-up' sx={{ py: { xs: 8, md: 12 }, bgcolor: '#131325' }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant='h4' fontWeight={800} sx={{ color: '#fff' }}>Trusted by Businesses Across Nepal</Typography>
          </Box>
          <Grid container spacing={3}>
            {testimonials.map(t => (
              <Grid size={{ xs: 12, md: 4 }} key={t.name} className='fade-up-child'>
                <Card sx={{ height: '100%', borderRadius: 3, transition: '0.25s', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { borderColor: '#28C76F', transform: 'translateY(-4px)' } }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      {[...Array(5)].map((_, i) => <i key={i} className='tabler-star-filled' style={{ fontSize: 18, color: '#FF9F43' }} />)}
                    </Box>
                    <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, fontStyle: 'italic', lineHeight: 1.8 }}>&ldquo;{t.text}&rdquo;</Typography>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#28C76F', fontWeight: 700, width: 42, height: 42 }}>{t.avatar}</Avatar>
                      <Box>
                        <Typography variant='body2' fontWeight={700} sx={{ color: '#fff' }}>{t.name}</Typography>
                        <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      

      {/* ════════════════════════ LATEST BLOG ════════════════════════ */}
      {blogPosts.length > 0 && (
        <Box className='fade-up' sx={{ bgcolor: '#0f0f1a', py: { xs: 8, md: 12 } }}>
          <Container maxWidth='lg'>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Chip label='BLOG' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.25)' }} />
              <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
                Latest from Our Blog
              </Typography>
              <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)', mt: 1 }}>
                Insights, guides, and tips for your online journey.
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Featured Post (first post - large) */}
              {blogPosts[0] && (
                <Grid size={{ xs: 12, md: 7 }} className='fade-up-child'>
                  <Card onClick={() => router.push(`/articles/${blogPosts[0].slug}`)} sx={{
                    height: '100%', cursor: 'pointer', borderRadius: 4, overflow: 'hidden',
                    bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                    '&:hover': { borderColor: '#28C76F', transform: 'translateY(-6px)', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
                    '&:hover .blog-title': { color: '#28C76F' },
                  }}>
                    {blogPosts[0].featuredImage && (
                      <Box sx={{ position: 'relative', height: 280, overflow: 'hidden' }}>
                        <Box component='img' src={blogPosts[0].featuredImage} alt={blogPosts[0].title} sx={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          transition: 'transform 0.6s ease', '&:hover': { transform: 'scale(1.05)' },
                        }} />
                        <Box sx={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
                          background: 'linear-gradient(transparent, rgba(15,15,26,0.95))',
                        }} />
                        {blogPosts[0].category && (
                          <Chip label={blogPosts[0].category.name} size='small' sx={{
                            position: 'absolute', top: 16, left: 16,
                            bgcolor: 'rgba(40,199,111,0.9)', color: '#fff', fontWeight: 700, backdropFilter: 'blur(8px)',
                          }} />
                        )}
                      </Box>
                    )}
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Typography className='blog-title' variant='h5' fontWeight={800} sx={{
                        color: '#fff', mb: 1.5, lineHeight: 1.3, transition: 'color 0.3s',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {blogPosts[0].title}
                      </Typography>
                      {blogPosts[0].excerpt && (
                        <Typography variant='body2' sx={{
                          color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, mb: 3,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {blogPosts[0].excerpt}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#28C76F', fontSize: 13, fontWeight: 700 }}>
                            {blogPosts[0].author?.name?.charAt(0) || 'A'}
                          </Avatar>
                          <Box>
                            <Typography variant='caption' sx={{ color: '#fff', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                              {blogPosts[0].author?.name}
                            </Typography>
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)' }}>
                              {blogPosts[0].publishedAt ? new Date(blogPosts[0].publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          {blogPosts[0].readTime && (
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <i className='tabler-clock' style={{ fontSize: 14 }} /> {blogPosts[0].readTime} min
                            </Typography>
                          )}
                          <Typography variant='caption' sx={{ color: '#28C76F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            Read more <i className='tabler-arrow-right' style={{ fontSize: 14 }} />
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Side Posts (2nd and 3rd - stacked) */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
                  {blogPosts.slice(1, 3).map((post, idx) => (
                    <Card key={post.id} className='fade-up-child' onClick={() => router.push(`/articles/${post.slug}`)} sx={{
                      flex: 1, cursor: 'pointer', borderRadius: 3, display: 'flex', overflow: 'hidden',
                      bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                      '&:hover': { borderColor: '#28C76F', transform: 'translateX(4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
                      '&:hover .side-title': { color: '#28C76F' },
                    }}>
                      {post.featuredImage && (
                        <Box sx={{ width: 140, minHeight: 140, flexShrink: 0, overflow: 'hidden' }}>
                          <Box component='img' src={post.featuredImage} alt={post.title} sx={{
                            width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s',
                          }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                        {post.category && (
                          <Chip label={post.category.name} size='small' sx={{
                            width: 'fit-content', mb: 1, height: 22, fontSize: '0.65rem',
                            bgcolor: 'rgba(115,103,240,0.12)', color: '#A89CF5', fontWeight: 600,
                          }} />
                        )}
                        <Typography className='side-title' variant='subtitle2' fontWeight={700} sx={{
                          color: '#fff', mb: 0.5, lineHeight: 1.4, transition: 'color 0.3s',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {post.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.3)' }}>
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </Typography>
                          {post.readTime && (
                            <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.25)' }}>
                              &bull; {post.readTime} min read
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Grid>
            </Grid>

            {/* View All Button */}
            <Box sx={{ textAlign: 'center', mt: 5 }}>
              <Button variant='outlined' size='large' onClick={() => router.push('/articles')}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 2.5, px: 4,
                  borderColor: 'rgba(255,255,255,0.12)', color: '#fff',
                  '&:hover': { borderColor: '#28C76F', bgcolor: 'rgba(40,199,111,0.06)' },
                }}>
                View All Articles <i className='tabler-arrow-right' style={{ marginLeft: 8, fontSize: 18 }} />
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      {/* ════════════════════════ FAQ ════════════════════════ */}
      <Box id='faq' className='fade-up' sx={{ bgcolor: '#0f0f1a', py: { xs: 8, md: 12 } }}>
        <Container maxWidth='md'>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Chip label='FAQ' size='small' sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, bgcolor: 'rgba(40,199,111,0.12)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.25)' }} />
            <Typography variant='h4' fontWeight={800} sx={{ color: '#fff' }}>Hosting Nepal FAQs</Typography>
            <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)', mt: 1 }}>
              Frequently Asked Questions about our VPS, WordPress Hosting, and Dedicated Servers
            </Typography>
          </Box>
          {faqs.map((faq, i) => (
            <Accordion key={i} disableGutters sx={{
              mb: 1.5, borderRadius: '12px !important', overflow: 'hidden',
              bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { borderColor: '#28C76F', bgcolor: 'rgba(40,199,111,0.04)' },
              '& .MuiAccordionSummary-root': { color: '#fff !important' },
              '& .MuiAccordionDetails-root': { color: 'rgba(255,255,255,0.7) !important' },
            }}>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' style={{ fontSize: 20, color: '#fff' }} />} sx={{ py: 1, px: 3 }}>
                <Typography variant='body1' fontWeight={600} sx={{ color: '#fff !important' }}>{faq.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 3, pb: 2.5 }}>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7) !important', lineHeight: 1.8 }}>{faq.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>
      

      {/* ════════════════════════ CTA ════════════════════════ */}
      
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#131325' }}>
        <Container maxWidth='md'>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'rgba(40,199,111,0.06)', border: '1px solid rgba(40,199,111,0.2)' }}>
            <CardContent sx={{ py: { xs: 5, md: 8 }, px: { xs: 3, md: 6 }, textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 2, fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
                Ready to Get Online?
              </Typography>
              <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.55)', mb: 4, maxWidth: 440, mx: 'auto' }}>
                Join hundreds of Nepali businesses. Set up your website in minutes.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant='contained' size='large' disableElevation onClick={() => router.push('/register')}
                  sx={{ bgcolor: '#28C76F', color: '#fff', '&:hover': { bgcolor: '#1FAF5E' }, borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 4 }}>
                  Create Free Account
                </Button>
                <Button variant='outlined' size='large' onClick={() => scrollTo('pricing')}
                  sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.3)' }, borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4 }}>
                  Compare Plans
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
      

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <Box sx={{ bgcolor: '#0f0f1a', color: '#fff', py: { xs: 6, md: 8 } }}>
        <Container maxWidth='lg'>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Logo />
                <Typography variant='h6' fontWeight={800}>Hosting Nepal</Typography>
              </Box>
              <Typography variant='body2' sx={{ color: '#fff', mb: 2, maxWidth: 280, lineHeight: 1.8 }}>
                Nepal&apos;s trusted web hosting provider. Fast servers, local payments, and expert support.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['tabler-brand-facebook', 'tabler-brand-twitter', 'tabler-brand-instagram'].map(icon => (
                  <IconButton key={icon} size='small' sx={{ color: '#fff', '&:hover': { color: '#28C76F' } }}>
                    <i className={icon} style={{ fontSize: 20 }} />
                  </IconButton>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 2.5, color: '#fff' }}>Products</Typography>
              {[
                { label: 'WordPress Hosting', link: '/hosting/plans' },
                { label: 'VPS Servers', link: '/vps/order' },
                { label: 'VDS Servers', link: '/vps/vds/order' },
                { label: 'Dedicated Servers', link: '/vps/dedicated/order' },
                { label: 'Domain Names', link: '/domains/search' },
                { label: 'Business Email', link: '/email' },
                { label: 'SSL Certificates', link: '/ssl' },
              ].map(l => (
                <Typography key={l.label} variant='body2' onClick={() => router.push(l.link)}
                  sx={{ color: '#fff', mb: 1.2, cursor: 'pointer', '&:hover': { color: '#28C76F' }, lineHeight: 1.6 }}>{l.label}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 2.5, color: '#fff' }}>Company</Typography>
              {[
                { label: 'About Us', link: '/about' },
                { label: 'Contact', link: '/contact' },
                { label: 'Support Center', link: '/support' },
                { label: 'Blog', link: '/articles' },
                { label: 'Terms of Service', link: '/terms' },
                { label: 'Privacy Policy', link: '/privacy' },
              ].map(l => (
                <Typography key={l.label} variant='body2' onClick={() => router.push(l.link)}
                  sx={{ color: '#fff', mb: 1.2, cursor: 'pointer', '&:hover': { color: '#28C76F' }, lineHeight: 1.6 }}>{l.label}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 2.5, color: '#fff' }}>Payment Methods</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {[{ name: 'Khalti', color: '#5C2D91' }, { name: 'eSewa', color: '#60BB46' }, { name: 'Bank Transfer', color: '#00BAD1' }].map(p => (
                  <Chip key={p.name} label={p.name} size='small' sx={{ bgcolor: `${p.color}25`, color: '#fff', fontWeight: 600, borderRadius: 2 }} />
                ))}
              </Box>
              <Typography variant='subtitle2' fontWeight={700} sx={{ mb: 1.5, color: '#fff' }}>Contact</Typography>
              <Typography variant='body2' sx={{ color: '#fff', lineHeight: 1.8 }}>
                Koteshwor, Kathmandu, Nepal<br />
                admin@hostingnepals.com<br />
                +977-9802348957
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant='body2' sx={{ color: '#fff', textAlign: 'center' }}>
            {new Date().getFullYear()} &copy; Marketminds Investment Group. All rights reserved.
          </Typography>
        </Container>
      </Box>

      {/* ════════════════════════ WHATSAPP FLOATING BUTTON ════════════════════════ */}
      <Box
        onClick={() => window.open('https://wa.me/9779802348957?text=Hello%20Hosting%20Nepal!%20I%20need%20help%20with%20your%20hosting%20services.', '_blank')}
        sx={{
          position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 }, zIndex: 1200,
          width: 60, height: 60, borderRadius: '50%',
          bgcolor: '#25D366', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
          transition: 'all 0.3s ease',
          '&:hover': { transform: 'scale(1.1)', boxShadow: '0 6px 28px rgba(37,211,102,0.55)' },
          '&::before': {
            content: '""', position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            bgcolor: '#25D366', opacity: 0.3, animation: 'whatsappPulse 2s ease-in-out infinite',
          },
          '@keyframes whatsappPulse': {
            '0%': { transform: 'scale(1)', opacity: 0.3 },
            '50%': { transform: 'scale(1.4)', opacity: 0 },
            '100%': { transform: 'scale(1)', opacity: 0 },
          },
        }}
      >
        <i className='tabler-brand-whatsapp' style={{ fontSize: 32, position: 'relative', zIndex: 1 }} />
      </Box>
    </Box>
  )
}

export default HomePage
