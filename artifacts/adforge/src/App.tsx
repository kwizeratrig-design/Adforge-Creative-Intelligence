import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useGetDashboard, getGetDashboardQueryKey, useGetCurrentBrand, getGetCurrentBrandQueryKey,
  useCreateBrand, useUpdateCurrentBrand, useListBrandAssets, getListBrandAssetsQueryKey,
  useCreateBrandAsset, useDeleteBrandAsset, useRequestUploadUrl, useListCampaigns,
  getListCampaignsQueryKey, useCreateCampaign, useGetCampaign, getGetCampaignQueryKey,
  useUpdateCampaign, useListCampaignConcepts, getListCampaignConceptsQueryKey,
  useGenerateCampaignConcepts, useListCreatives, getListCreativesQueryKey,
  useGenerateCreatives, useGetCreative, getGetCreativeQueryKey, useUpdateCreative,
  useListCreativeVariations, getListCreativeVariationsQueryKey, useGenerateCreativeVariations,
  useGetCreativeIntelligence,
  setBaseUrl,
} from '@workspace/api-client-react';
import {
  ArrowUpRight, BarChart3, BookOpen, ChevronRight, CircleHelp,
  Download, FileImage, FolderKanban, Heart, Home, ImagePlus, Layers3, Lightbulb, Loader2, Menu,
  MoreHorizontal, Palette, Plus, Search, Settings2, Sparkles, Target, Trash2, Upload,
  WandSparkles, X, Zap,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const onRetry = () => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
setBaseUrl(apiBaseUrl || null);
const configuredClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const clerkPubKey = /^pk_(test|live)_[^\s]+$/.test(configuredClerkKey) && !configuredClerkKey.includes('your_key_here') ? configuredClerkKey : '';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type AnyRecord = Record<string, any>;
const lime = 'text-[#d7f36b]';
const buttonPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#d7f36b] px-4 py-2.5 text-sm font-semibold text-[#202215] shadow-[0_12px_30px_rgba(215,243,107,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e9fb8f] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45';
const buttonGhost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#3a3d2b] bg-[#1b1d17]/80 px-4 py-2.5 text-sm font-medium text-[#e8e8d9] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#697346] hover:bg-[#2a2d20]';
const inputClass = 'w-full rounded-xl border border-[#3a3d2b] bg-[#1b1d17] px-3.5 py-3 text-sm text-[#eeeede] outline-none transition-all placeholder:text-[#696c5b] focus:border-[#a9c34e] focus:ring-2 focus:ring-[#d7f36b]/12';

function cn(...classes: Array<string | false | undefined>) { return classes.filter(Boolean).join(' '); }
function money(value: any) { return value ? String(value) : '—'; }
function shortDate(value: any) { if (!value) return 'recently'; return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'error' | 'success' }) {
  return <div className={cn('rounded-xl border px-4 py-3 text-sm', tone === 'error' ? 'border-red-900/70 bg-red-950/20 text-red-200' : tone === 'success' ? 'border-[#65752d] bg-[#344016]/40 text-[#e0f88c]' : 'border-[#3a3d2b] bg-[#24261c] text-[#b8b9a4]')} data-testid="status-notice">{children}</div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={cn('animate-pulse rounded-lg bg-[#292c20]', className)} />; }
function EmptyState({ icon: Icon = Sparkles, title, body, action }: { icon?: any; title: string; body: string; action?: ReactNode }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#3a3d2b] bg-[#1c1e18]/60 px-6 text-center"><Icon className="mb-4 h-8 w-8 text-[#9cad4b]" /><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#858774]">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

const navItems = [
  { href: '/workspace', label: 'Overview', icon: Home },
  { href: '/brand-dna', label: 'Brand DNA', icon: Palette },
  { href: '/campaigns', label: 'Campaigns', icon: FolderKanban },
  { href: '/creative-lab', label: 'Creative Lab', icon: WandSparkles },
  { href: '/intelligence', label: 'Intelligence', icon: BarChart3 },
];

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]">
    <aside className={cn('fixed inset-y-0 left-0 z-40 w-[248px] border-r border-[#282b20] bg-[#141610]/95 px-5 py-6 backdrop-blur-xl transition-transform lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')} data-testid="navigation-sidebar">
       <div className="flex items-center justify-between px-2"><Link href="/workspace" className="flex items-center gap-2.5" data-testid="link-logo"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><button className="lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X className="h-5 w-5" /></button></div>
      <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Workspace</div>
      <nav className="mt-3 space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active(href) ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]')} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon className="h-[17px] w-[17px]" /><span>{label}</span>{active(href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" />}</Link>)}</nav>
      <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Manage</div>
      <nav className="mt-3 space-y-1"><Link href="/settings" className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active('/settings') ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]')} data-testid="link-nav-settings"><Settings2 className="h-[17px] w-[17px]" /><span>Settings</span></Link></nav>
      <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 truncate text-xs text-[#777a69]">kora.coffee</p><Link href="/brand-dna" className="mt-3 flex items-center gap-1 text-xs font-medium text-[#d7f36b]" data-testid="link-edit-brand">Edit brand brain <ChevronRight className="h-3 w-3" /></Link></div>
    </aside>
    <div className="lg:pl-[248px]">
       <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#24271d] bg-[#10110d]/85 px-5 backdrop-blur-xl lg:px-10"><button className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-xs text-[#777a69] lg:flex"><span className="font-mono-ui uppercase tracking-[.18em]">KORA / workspace</span><ChevronRight className="h-3 w-3" /><span className="text-[#b7b9a5]">{navItems.find((n) => active(n.href))?.label || 'Workspace'}</span></div><div className="ml-auto flex items-center gap-4"><div className="hidden items-center gap-2 text-xs text-[#777a69] sm:flex"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</div><ProfileMenu /></div></header>
      <main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>;
}

function ProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || 'A';
  return <div className="relative"><button className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3e2e] bg-[#272a1f] text-xs font-semibold text-[#d7f36b]" onClick={() => setOpen(!open)} data-testid="button-profile" aria-label="Open profile menu">{initials}</button>{open && <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-[#3a3d2b] bg-[#1a1c16] p-2 shadow-2xl"><div className="border-b border-[#2b2e22] px-3 py-2"><p className="truncate text-sm font-medium">{user?.firstName || 'Studio member'}</p><p className="mt-1 truncate text-xs text-[#777a69]">{user?.primaryEmailAddress?.emailAddress || 'Signed in'}</p></div><button className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-[#b7b9a5] transition hover:bg-[#292c20] hover:text-[#d7f36b]" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out">Sign out</button></div>}</div>;
}

function PageHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 border-b border-[#2a2d21] pb-7 md:flex-row md:items-end md:justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">{eyebrow}</div><h1 className="mt-2 font-editorial text-4xl leading-none tracking-[-.03em] text-[#f1f0dd] md:text-5xl">{title}</h1>{body && <p className="mt-3 max-w-2xl text-sm leading-6 text-[#878a76]">{body}</p>}</div>{action}</div>;
}

function Dashboard() {
  const { data, isLoading, isError } = useGetDashboard();
  const summary: AnyRecord = data || {};
  if (isLoading) return <LoadingPage title="Reading the studio" />;
  if (isError) return <ErrorPage title="Dashboard unavailable" retry={() => queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })} />;
  const campaigns = summary.recentCampaigns || [];
  const creatives = summary.recentCreatives || [];
  return <div className="page-in mx-auto max-w-[1440px]"><PageHeading eyebrow="Studio overview" title="Make something worth stopping for." body="Your brand brain is active. Here’s what the studio is seeing across KORA Coffee." action={<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-new-campaign"><Plus className="h-4 w-4" />New campaign</Link>} />
    <div className="grid gap-4 md:grid-cols-4">{[['Brand health', `${summary.brandHealth ?? 82}%`, 'Signal strength', Palette], ['Credits remaining', summary.creditsRemaining ?? '1,248', 'This workspace', Zap], ['Active campaigns', summary.activeCampaigns ?? campaigns.length, 'In motion', Target], ['Saved creatives', summary.savedCreatives ?? 12, 'Worth another look', Heart]].map(([label, value, sub, Icon]: any, i) => <div key={label} className={cn('page-in rounded-[24px] border border-[#2b2e22] bg-[linear-gradient(180deg,#1a1c16_0%,#151812_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)]', `stagger-${i + 1}`)} data-testid={`card-metric-${String(label).toLowerCase().replace(' ', '-')}`}><div className="flex items-start justify-between"><span className="text-xs text-[#888b76]">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#252b16] text-[#d7f36b]"><Icon className="h-4 w-4" /></span></div><p className="mt-5 text-3xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-[#6e715e]">{sub}</p></div>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-[28px] border border-[#2b2e22] bg-[linear-gradient(180deg,#1a1c16_0%,#151812_100%)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.18)]"><div className="flex items-center justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Recent work</div><h2 className="mt-2 text-xl font-semibold">Campaigns in motion</h2></div><Link href="/campaigns" className="text-xs text-[#d7f36b]" data-testid="link-view-campaigns">View all <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link></div><div className="mt-6 divide-y divide-[#292c20]">{campaigns.slice(0, 4).map((c: AnyRecord) => <Link href={`/campaigns/${c.id}`} key={c.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 transition hover:translate-x-0.5" data-testid={`row-campaign-${c.id}`}><div className="grid h-10 w-10 place-items-center rounded-lg bg-[#303524] text-[#d7f36b]"><Target className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{c.name}</p>{c.isDemo && <span className="rounded bg-[#323a1d] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#b7d354]">Demo</span>}</div><p className="mt-1 text-xs text-[#747866]">{c.productName} · {c.platform || 'multi-channel'} · {shortDate(c.createdAt)}</p></div><span className="rounded-full border border-[#41462e] px-2 py-1 text-[10px] capitalize text-[#a9ae8d]">{c.status || 'draft'}</span><ChevronRight className="h-4 w-4 text-[#646856]" /></Link>)}</div>{campaigns.length === 0 && <div className="mt-6"><EmptyState icon={FolderKanban} title="Your first campaign starts here" body="Give the studio a brief and we’ll map the creative territory." action={<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-empty-new-campaign">Start a campaign</Link>} /></div>}</section>
      <section className="rounded-[28px] border border-[#2b2e22] bg-[linear-gradient(180deg,#1a1c16_0%,#151812_100%)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.18)]"><div className="flex items-center justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Studio feed</div><h2 className="mt-2 text-xl font-semibold">Recent signals</h2></div><CircleHelp className="h-4 w-4 text-[#747866]" /></div><div className="mt-6 space-y-5">{(summary.activity || []).slice(0, 5).map((item: AnyRecord) => <div className="flex gap-3 rounded-xl border border-[#2b2e22] bg-[#161912] p-3" key={item.id} data-testid={`activity-${item.id}`}><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d7f36b]" /><div><p className="text-sm text-[#d6d7c4]">{item.label}</p><p className="mt-1 text-xs text-[#727663]">{item.detail} · {shortDate(item.timestamp)}</p></div></div>)}{!(summary.activity || []).length && <p className="text-sm text-[#777a69]">Your studio signals will appear here as work moves.</p>}</div></section></div>
    <section className="mt-5 rounded-[28px] border border-[#2b2e22] bg-[linear-gradient(180deg,#1a1c16_0%,#151812_100%)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.18)]"><div className="flex items-center justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Saved for later</div><h2 className="mt-2 text-xl font-semibold">Creative shelf</h2></div><Link href="/creative-lab" className="text-xs text-[#d7f36b]" data-testid="link-view-creatives">Open creative lab <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link></div><CreativeGrid creatives={creatives.slice(0, 4)} /></section>
  </div>;
}

function BrandDNA() {
  const qc = useQueryClient();
  const brandQ = useGetCurrentBrand();
  const assetsQ = useListBrandAssets();
  const create = useCreateBrand();
  const update = useUpdateCurrentBrand();
  const assetCreate = useCreateBrandAsset();
  const assetDelete = useDeleteBrandAsset();
  const requestUpload = useRequestUploadUrl();
  const brand: AnyRecord = brandQ.data || {};
  const [form, setForm] = useState<AnyRecord>({});
  const [tagline, setTagline] = useState('');
  const [notice, setNotice] = useState('');
  const current = (key: string, fallback: any = '') => form[key] ?? brand[key] ?? fallback;
  const save = () => { const payload: any = { name: current('name', 'KORA Coffee'), website: current('website'), description: current('description'), industry: current('industry', 'Coffee'), audience: current('audience'), personality: current('personality', ['Considered', 'Warm', 'Curious']), visualStyle: current('visualStyle', 'Editorial, tactile, quietly bold'), typography: current('typography', 'Contemporary grotesk with expressive serif moments'), primaryColor: current('primaryColor', '#24251e'), secondaryColors: brand.secondaryColors || ['#e7dfc8', '#9caa54'], accentColor: current('accentColor', '#d7f36b'), logoPath: brand.logoPath }; const request = brandQ.data && !brand.isDemo ? update : create; request.mutate({ data: payload }, { onSuccess: () => { setNotice('Brand brain saved.'); qc.invalidateQueries({ queryKey: getGetCurrentBrandQueryKey() }); } }); };
  const onFile = async (file: File) => { try { const url = await requestUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type } }); await fetch(url.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file }); await assetCreate.mutateAsync({ data: { name: file.name, type: file.type, objectPath: url.objectPath, previewUrl: `${apiBaseUrl}/api/storage${url.objectPath}`, tags: tagline ? [tagline] : [] } }); setNotice('Asset added to your brand library.'); qc.invalidateQueries({ queryKey: getListBrandAssetsQueryKey() }); } catch { setNotice('Upload could not be completed. Try again.'); } };
  if (brandQ.isLoading) return <LoadingPage title="Loading your brand brain" />;
  return <div className="page-in mx-auto max-w-[1260px]"><PageHeading eyebrow="Brand intelligence" title="The brand brain." body="Give the studio the details that make KORA unmistakably KORA. Changes ripple into every new concept." action={<button className={buttonPrimary} onClick={save} disabled={update.isPending} data-testid="button-save-brand">{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}Save changes</button>} />{notice && <div className="mb-5"><Notice tone={notice.includes('could') ? 'error' : 'success'}>{notice}</Notice></div>}
    {!brandQ.data && <Notice tone="default">No brand brain yet. We’ll create the KORA workspace when you save this form.</Notice>}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="space-y-5"><div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="mb-6 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><BookOpen className="h-4 w-4" /></div><div><h2 className="font-semibold">Core identity</h2><p className="text-xs text-[#747866]">The facts behind the feeling.</p></div></div><div className="grid gap-4 md:grid-cols-2">{[['name', 'Brand name'], ['website', 'Website'], ['industry', 'Industry'], ['audience', 'Core audience']].map(([key, label]) => <label key={key} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} value={current(key)} onChange={(e) => setForm({ ...form, [key]: e.target.value })} data-testid={`input-brand-${key}`} /></label>)}</div><label className="mt-4 block text-sm text-[#9b9d89]">Description<textarea className={cn(inputClass, 'mt-2 min-h-[105px] resize-y')} value={current('description')} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should every creative know about this brand?" data-testid="input-brand-description" /></label></div>
      <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="mb-6"><h2 className="font-semibold">Creative direction</h2><p className="mt-1 text-xs text-[#747866]">These become the studio’s internal guardrails.</p></div><div className="space-y-4">{[['visualStyle', 'Visual language'], ['typography', 'Typography'], ['primaryColor', 'Primary color'], ['accentColor', 'Accent color']].map(([key, label]) => <label key={key} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} value={current(key)} onChange={(e) => setForm({ ...form, [key]: e.target.value })} data-testid={`input-brand-${key}`} /></label>)}</div></div></section>
      <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold">Asset library</h2><span className="rounded bg-[#323a1d] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#b7d354]">{(assetsQ.data || []).length} files</span></div><p className="mt-1 text-xs text-[#747866]">Reference material the studio can see.</p></div><label className={cn(buttonGhost, 'cursor-pointer')}><Upload className="h-4 w-4" />Upload<input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} data-testid="input-upload-asset" /></label></div><input className={cn(inputClass, 'mt-5')} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Optional tag for the next upload" data-testid="input-asset-tag" /><div className="mt-5 grid grid-cols-2 gap-3">{(assetsQ.data || []).map((asset: AnyRecord) => <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[#36392a] bg-[#25281d]" data-testid={`card-asset-${asset.id}`}>{asset.previewUrl ? <img src={asset.previewUrl} alt={asset.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#777a69]"><FileImage className="h-6 w-6" /></div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#10110d] p-3 pt-8"><p className="truncate text-xs font-medium">{asset.name}</p><button className="mt-1 text-[10px] text-red-300 opacity-0 transition group-hover:opacity-100" onClick={() => assetDelete.mutate({ assetId: asset.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListBrandAssetsQueryKey() }) })} data-testid={`button-delete-asset-${asset.id}`}><Trash2 className="mr-1 inline h-3 w-3" />Remove</button></div></div>)}</div>{!(assetsQ.data || []).length && <div className="mt-5"><EmptyState icon={ImagePlus} title="No reference assets yet" body="Upload packaging, campaigns, photography, or anything that teaches visual taste." /></div>}</section></div>
  </div>;
}

function Campaigns() {
  const { data, isLoading, isError } = useListCampaigns();
  const [search, setSearch] = useState('');
  const campaigns: AnyRecord[] = (data || []) as AnyRecord[];
  const filtered = campaigns.filter((campaign) => `${campaign.name} ${campaign.productName} ${campaign.objective}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-in mx-auto max-w-[1260px]"><PageHeading eyebrow="Campaign studio" title="Campaigns with a point of view." body="Every brief becomes a territory: a strategic north star, distinct concept families, and a clear path to production." action={<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-create-campaign"><Plus className="h-4 w-4" />New campaign</Link>} /><div className="mb-6 flex flex-col gap-3 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#6f725f]" /><input className={cn(inputClass, 'pl-9')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaigns" data-testid="input-search-campaigns" /></div><div className="rounded-lg border border-[#3a3d2b] px-3 py-2 text-xs text-[#878a76]">{filtered.length} campaigns</div></div>{isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-44" />)}</div> : isError ? <ErrorPage title="Campaigns could not load" retry={() => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() })} /> : filtered.length ? <div className="grid gap-4 md:grid-cols-2">{filtered.map((campaign) => <Link href={`/campaigns/${campaign.id}`} key={campaign.id} className="group rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5 transition hover:-translate-y-0.5 hover:border-[#677335]" data-testid={`card-campaign-${campaign.id}`}><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#303524] text-[#d7f36b]"><Target className="h-5 w-5" /></div><span className="rounded-full border border-[#41462e] px-2 py-1 text-[10px] capitalize text-[#a9ae8d]">{campaign.status || 'draft'}</span></div><h2 className="mt-7 text-lg font-semibold">{campaign.name}</h2><p className="mt-1 text-sm text-[#858774]">{campaign.productName} · {campaign.platform || 'multi-channel'}</p><div className="mt-6 flex items-center justify-between text-xs text-[#727663]"><span>{campaign.objective || 'Creative territory'}</span><ArrowUpRight className="h-4 w-4 text-[#d7f36b]" /></div></Link>)}</div> : <div className="min-h-[300px] border-t border-[#2b2e22] pt-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#3a291e] text-[#efab75]"><CircleHelp className="h-6 w-6" /></div><h2 className="mt-5 font-editorial text-4xl">{isError ? 'Your campaign shelf is offline.' : 'No campaigns yet.'}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#858774]">{isError ? 'The studio could not reach the campaign signal. You can retry or start shaping a new brief while it reconnects.' : 'Start with a brief and the studio will turn it into a strategic territory worth making.'}</p><div className="mt-6 flex justify-center gap-3">{isError && <button className={buttonGhost} onClick={onRetry} data-testid="button-retry-campaigns">Retry connection</button>}<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-empty-create-campaign"><Plus className="h-4 w-4" />Create your first campaign</Link></div></div>}</div>;
}

function BriefListField({ label, values, placeholder, onChange, testId }: { label: string; values: string[]; placeholder: string; onChange: (values: string[]) => void; testId: string }) {
  return <div>
    <div className="text-sm text-[#9b9d89]">{label}</div>
    <div className="mt-2 space-y-2">
      {values.map((value, index) => <div className="flex gap-2" key={`${testId}-${index}`}>
        <input className={inputClass} value={value} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={placeholder} data-testid={`${testId}-${index}`} />
        {values.length > 1 && <button type="button" className="rounded-lg border border-[#3a3d2b] px-3 text-[#858774] hover:border-[#697346] hover:text-[#d7f36b]" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label.toLowerCase()} item`}><Trash2 className="h-4 w-4" /></button>}
      </div>)}
      <button type="button" className="text-xs font-medium text-[#d7f36b]" onClick={() => onChange([...values, ''])} data-testid={`${testId}-add`}><Plus className="mr-1 inline h-3 w-3" />Add another</button>
    </div>
  </div>;
}

function NewCampaign() {
  const [, setLocation] = useLocation();
  const mutation = useCreateCampaign();
  const [form, setForm] = useState<AnyRecord>({ name: '', productName: 'KORA Cold Brew', description: '', productUrl: '', benefits: [''], price: '', offer: '', cta: 'Shop now', audience: '', ageRange: '25–44', location: 'United States', interests: [''], painPoints: [''], desires: [''], objective: 'Drive product trial', platform: 'Meta', format: 'Static image', aspectRatio: '4:5' });
  const set = (key: string, value: any) => setForm({ ...form, [key]: value });
  const submit = () => mutation.mutate({ data: { ...form, benefits: form.benefits.filter(Boolean), interests: form.interests.filter(Boolean), painPoints: form.painPoints.filter(Boolean), desires: form.desires.filter(Boolean) } as any }, { onSuccess: (campaign: AnyRecord) => setLocation(`/campaigns/${campaign.id}`) });
  return <div className="page-in mx-auto max-w-[1080px]"><PageHeading eyebrow="New campaign" title="Start with the why." body="A good brief gives the studio something real to push against. You can sharpen the details later." action={<button className={buttonGhost} onClick={() => setLocation('/campaigns')} data-testid="button-cancel-campaign">Cancel</button>} /><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-lg font-semibold">The brief</h2><div className="mt-6 space-y-4"><label className="block text-sm text-[#9b9d89]">Campaign name<input className={cn(inputClass, 'mt-2')} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Spring at first sip" data-testid="input-campaign-name" /></label><label className="block text-sm text-[#9b9d89]">Product or offer<input className={cn(inputClass, 'mt-2')} value={form.productName} onChange={(e) => set('productName', e.target.value)} data-testid="input-campaign-product" /></label><label className="block text-sm text-[#9b9d89]">What are we making and why now?<textarea className={cn(inputClass, 'mt-2 min-h-[130px] resize-y')} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Context, moment, offer, tension…" data-testid="input-campaign-description" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#9b9d89]">Audience<input className={cn(inputClass, 'mt-2')} value={form.audience} onChange={(e) => set('audience', e.target.value)} placeholder="People who…" data-testid="input-campaign-audience" /></label><label className="block text-sm text-[#9b9d89]">Primary objective<input className={cn(inputClass, 'mt-2')} value={form.objective} onChange={(e) => set('objective', e.target.value)} data-testid="input-campaign-objective" /></label></div><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm text-[#9b9d89]">Platform<select className={inputClass + ' mt-2'} value={form.platform} onChange={(e) => set('platform', e.target.value)} data-testid="select-campaign-platform"><option>Meta</option><option>TikTok</option><option>Google</option><option>LinkedIn</option></select></label><label className="block text-sm text-[#9b9d89]">Format<select className={inputClass + ' mt-2'} value={form.format} onChange={(e) => set('format', e.target.value)} data-testid="select-campaign-format"><option>Static image</option><option>Video</option><option>Carousel</option></select></label><label className="block text-sm text-[#9b9d89]">Aspect ratio<select className={inputClass + ' mt-2'} value={form.aspectRatio} onChange={(e) => set('aspectRatio', e.target.value)} data-testid="select-campaign-ratio"><option>4:5</option><option>1:1</option><option>9:16</option><option>16:9</option></select></label></div></div></section><aside className="space-y-4"><div className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><Sparkles className="h-5 w-5 text-[#d7f36b]" /><h3 className="mt-4 font-semibold">What happens next</h3><div className="mt-5 space-y-4 text-sm text-[#b8bf8a]"><p><span className="mr-2 font-mono-ui text-[#d7f36b]">01</span> Strategy is mapped from your brief.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">02</span> Three distinct concept families are shaped.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">03</span> You choose the territory worth making.</p></div></div><button className={cn(buttonPrimary, 'w-full py-3.5')} onClick={submit} disabled={mutation.isPending || !form.name} data-testid="button-submit-campaign">{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Create campaign</button>{mutation.isError && <Notice tone="error">Campaign could not be created. Check the brief and try again.</Notice>}</aside></div></div>;
}

function CampaignCreateWorkspace() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateCampaign();
  const [form, setForm] = useState<AnyRecord>({ name: '', productName: 'KORA Cold Brew', description: '', productUrl: '', benefits: [''], price: '', offer: '', cta: 'Shop now', audience: '', ageRange: '25–44', location: 'United States', interests: [''], painPoints: [''], desires: [''], objective: 'Drive product trial', platform: 'Meta', format: 'Static image', aspectRatio: '4:5' });
  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => mutation.mutate({ data: { ...form, benefits: form.benefits.filter(Boolean), interests: form.interests.filter(Boolean), painPoints: form.painPoints.filter(Boolean), desires: form.desires.filter(Boolean) } as any }, { onSuccess: (campaign: AnyRecord) => { qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }); setLocation(`/campaigns/${campaign.id}`); } });

  return <div className="page-in mx-auto max-w-[1180px]">
    <PageHeading eyebrow="Campaigns / new brief" title="Start with the why." body="A good brief gives the studio something real to push against. Add the context, audience, and delivery details now; sharpen the territory later." action={<button className={buttonGhost} onClick={() => setLocation('/campaigns')} data-testid="button-cancel-campaign"><X className="h-4 w-4" />Cancel</button>} />
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#2b2e22] pb-5">
          <div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">01 / The brief</div><h2 className="mt-2 text-xl font-semibold">Give the studio something real.</h2></div>
          <span className="rounded-full border border-[#41462e] px-2.5 py-1 text-[10px] uppercase tracking-[.14em] text-[#aeb58b]">Draft</span>
        </div>
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[#9b9d89]">Campaign name<input className={cn(inputClass, 'mt-2')} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Spring at first sip" data-testid="input-campaign-name" /></label>
            <label className="block text-sm text-[#9b9d89]">Product or offer<input className={cn(inputClass, 'mt-2')} value={form.productName} onChange={(event) => set('productName', event.target.value)} placeholder="KORA Cold Brew" data-testid="input-campaign-product" /></label>
          </div>
          <label className="block text-sm text-[#9b9d89]">What are we making and why now?<textarea className={cn(inputClass, 'mt-2 min-h-[130px] resize-y')} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Context, moment, offer, tension..." data-testid="input-campaign-description" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-[#9b9d89]">Product URL<input className={cn(inputClass, 'mt-2')} value={form.productUrl} onChange={(event) => set('productUrl', event.target.value)} placeholder="https://kora.coffee/product" data-testid="input-campaign-product-url" /></label>
            <label className="block text-sm text-[#9b9d89]">Call to action<input className={cn(inputClass, 'mt-2')} value={form.cta} onChange={(event) => set('cta', event.target.value)} placeholder="Shop now" data-testid="input-campaign-cta" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-[#9b9d89]">Price<input className={cn(inputClass, 'mt-2')} value={form.price} onChange={(event) => set('price', event.target.value)} placeholder="$24" data-testid="input-campaign-price" /></label>
            <label className="block text-sm text-[#9b9d89]">Offer<input className={cn(inputClass, 'mt-2')} value={form.offer} onChange={(event) => set('offer', event.target.value)} placeholder="20% off first order" data-testid="input-campaign-offer" /></label>
            <label className="block text-sm text-[#9b9d89]">Primary objective<input className={cn(inputClass, 'mt-2')} value={form.objective} onChange={(event) => set('objective', event.target.value)} placeholder="Drive product trial" data-testid="input-campaign-objective" /></label>
          </div>
          <div className="border-t border-[#2b2e22] pt-5"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">02 / Audience signal</div><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="block text-sm text-[#9b9d89] sm:col-span-2">Who are we speaking to?<input className={cn(inputClass, 'mt-2')} value={form.audience} onChange={(event) => set('audience', event.target.value)} placeholder="People who want a better daily ritual" data-testid="input-campaign-audience" /></label><label className="block text-sm text-[#9b9d89]">Age range<input className={cn(inputClass, 'mt-2')} value={form.ageRange} onChange={(event) => set('ageRange', event.target.value)} placeholder="25–44" data-testid="input-campaign-age-range" /></label></div><label className="mt-4 block text-sm text-[#9b9d89]">Location<input className={cn(inputClass, 'mt-2')} value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="United States" data-testid="input-campaign-location" /></label></div>
          <div className="grid gap-5 border-t border-[#2b2e22] pt-5 md:grid-cols-2"><BriefListField label="Key benefits" values={form.benefits} placeholder="What makes the offer worth choosing?" onChange={(values) => set('benefits', values)} testId="input-campaign-benefit" /><BriefListField label="Audience interests" values={form.interests} placeholder="Coffee, design, daily rituals..." onChange={(values) => set('interests', values)} testId="input-campaign-interest" /><BriefListField label="Pain points" values={form.painPoints} placeholder="What tension are we solving?" onChange={(values) => set('painPoints', values)} testId="input-campaign-pain-point" /><BriefListField label="Desired outcomes" values={form.desires} placeholder="What should change after seeing this?" onChange={(values) => set('desires', values)} testId="input-campaign-desire" /></div>
          <div className="grid gap-4 border-t border-[#2b2e22] pt-5 sm:grid-cols-3"><label className="block text-sm text-[#9b9d89]">Platform<select className={cn(inputClass, 'mt-2')} value={form.platform} onChange={(event) => set('platform', event.target.value)} data-testid="select-campaign-platform"><option>Meta</option><option>TikTok</option><option>Google</option><option>LinkedIn</option></select></label><label className="block text-sm text-[#9b9d89]">Format<select className={cn(inputClass, 'mt-2')} value={form.format} onChange={(event) => set('format', event.target.value)} data-testid="select-campaign-format"><option>Static image</option><option>Video</option><option>Carousel</option></select></label><label className="block text-sm text-[#9b9d89]">Aspect ratio<select className={cn(inputClass, 'mt-2')} value={form.aspectRatio} onChange={(event) => set('aspectRatio', event.target.value)} data-testid="select-campaign-ratio"><option>4:5</option><option>1:1</option><option>9:16</option><option>16:9</option></select></label></div>
        </div>
      </section>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><Sparkles className="h-5 w-5 text-[#d7f36b]" /><div className="mt-4 font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#b8c580]">03 / What happens next</div><h3 className="mt-3 text-lg font-semibold">A brief becomes a campaign system.</h3><div className="mt-6 space-y-4 text-sm leading-6 text-[#b8bf8a]"><p><span className="mr-2 font-mono-ui text-[#d7f36b]">01</span> Strategy is mapped from your brief.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">02</span> Three distinct concept families are shaped.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">03</span> You choose the territory worth making.</p></div></div>
        <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Your campaign shelf</div><p className="mt-3 text-sm leading-6 text-[#9b9d89]">Once created, this campaign will appear in Campaigns with its brief, strategy, concepts, and creatives in one place.</p><Link href="/campaigns" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#d7f36b]" data-testid="link-view-campaign-shelf">View campaign shelf <ArrowUpRight className="h-3 w-3" /></Link></div>
        <button className={cn(buttonPrimary, 'w-full py-3.5')} onClick={submit} disabled={mutation.isPending || !form.name.trim()} data-testid="button-submit-campaign">{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Create campaign</button>
        {mutation.isError && <Notice tone="error">Campaign could not be created. Check the brief and try again.</Notice>}
      </aside>
    </div>
  </div>;
}

 function CampaignDetail() {
  const { campaignId = '' } = useParams<{ campaignId: string }>();
  const qc = useQueryClient();
  const campaignQ = useGetCampaign(campaignId, { query: { enabled: !!campaignId, queryKey: getGetCampaignQueryKey(campaignId) } });
  const conceptsQ = useListCampaignConcepts(campaignId, { query: { enabled: !!campaignId, queryKey: getListCampaignConceptsQueryKey(campaignId) } });
  const creativesQ = useListCreatives({ campaignId }, { query: { queryKey: getListCreativesQueryKey({ campaignId }) } });
  const generateConcepts = useGenerateCampaignConcepts();
  const generateCreatives = useGenerateCreatives();
  const updateCampaign = useUpdateCampaign() as any;
  const campaign: AnyRecord = campaignQ.data || {};
  const concepts: AnyRecord[] = conceptsQ.data || [];
  const creatives: AnyRecord[] = creativesQ.data || [];
  const [tab, setTab] = useState<'strategy' | 'concepts' | 'creatives'>('strategy');
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  if (campaignQ.isLoading) return <LoadingPage title="Opening campaign" />;
  if (campaignQ.isError) return <ErrorPage title="Campaign not found" retry={() => campaignQ.refetch()} />;
  const refresh = () => { qc.invalidateQueries({ queryKey: getListCampaignConceptsQueryKey(campaignId) }); qc.invalidateQueries({ queryKey: getListCreativesQueryKey({ campaignId }) }); };
  const saveBrief = () => updateCampaign.mutate({ campaignId, data: { ...campaign, description } as any }, { onSuccess: () => { setEditing(false); campaignQ.refetch(); } });
  return <div className="page-in mx-auto max-w-[1260px]"><Link href="/campaigns" className="mb-5 inline-flex items-center gap-1 text-xs text-[#858774]" data-testid="link-back-campaigns">← All campaigns</Link><div className="flex flex-col justify-between gap-5 border-b border-[#2a2d21] pb-7 md:flex-row md:items-end"><div><div className="flex items-center gap-2"><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Campaign / {campaign.platform || 'multi-channel'}</span>{campaign.isDemo && <span className="rounded bg-[#323a1d] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#b7d354]">Demo</span>}</div><h1 className="mt-2 font-editorial text-5xl tracking-[-.03em]">{campaign.name}</h1><p className="mt-3 text-sm text-[#858774]">{campaign.productName} · {campaign.objective}</p></div><div className="flex gap-2"><button className={buttonGhost} onClick={() => { setEditing(!editing); setDescription(campaign.description || ''); }} data-testid="button-edit-campaign"><MoreHorizontal className="h-4 w-4" />Edit brief</button><button className={buttonPrimary} onClick={() => generateConcepts.mutate({ campaignId }, { onSuccess: refresh })} disabled={generateConcepts.isPending} data-testid="button-generate-concepts">{generateConcepts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate concepts</button></div></div>{editing && <div className="my-5 rounded-2xl border border-[#3d4721] bg-[#202515] p-5"><label className="block text-sm text-[#c4c99e]">Brief description<textarea className={cn(inputClass, 'mt-2 min-h-[90px]')} value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-edit-campaign-description" /></label><button className={cn(buttonPrimary, 'mt-3')} onClick={() => updateCampaign.mutate({ campaignId, data: { ...campaign, description } }, { onSuccess: () => { setEditing(false); campaignQ.refetch(); } })} data-testid="button-save-campaign">Save brief</button></div>}<div className="mt-7 flex gap-6 border-b border-[#292c20]"><button className={cn('border-b-2 pb-3 text-sm', tab === 'strategy' ? 'border-[#d7f36b] text-[#d7f36b]' : 'border-transparent text-[#797c68]')} onClick={() => setTab('strategy')} data-testid="tab-strategy">Strategy</button><button className={cn('border-b-2 pb-3 text-sm', tab === 'concepts' ? 'border-[#d7f36b] text-[#d7f36b]' : 'border-transparent text-[#797c68]')} onClick={() => setTab('concepts')} data-testid="tab-concepts">Concept families <span className="ml-1 text-xs">{concepts.length}</span></button><button className={cn('border-b-2 pb-3 text-sm', tab === 'creatives' ? 'border-[#d7f36b] text-[#d7f36b]' : 'border-transparent text-[#797c866]')} onClick={() => setTab('creatives')} data-testid="tab-campaign-creatives">Creatives <span className="ml-1 text-xs">{creatives.length}</span></button></div>{tab === 'strategy' && <div className="mt-6 grid gap-5 lg:grid-cols-3"><div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6 lg:col-span-2"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">The brief, distilled</div><p className="mt-5 max-w-2xl font-editorial text-3xl leading-tight text-[#e6e7d2]">“{campaign.description || 'A focused moment for KORA to earn a new daily ritual.'}”</p><div className="mt-8 grid gap-5 border-t border-[#2b2e22] pt-5 sm:grid-cols-3">{[['Audience', campaign.audience], ['Tension', (campaign.painPoints || ['Routine needs a reset'])[0]], ['Desired action', campaign.cta || 'Try KORA']].map(([k, v]) => <div key={k}><div className="text-xs text-[#747866]">{k}</div><p className="mt-2 text-sm leading-5 text-[#d4d5c3]">{v || 'Not specified'}</p></div>)}</div></div><div className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><Lightbulb className="h-5 w-5 text-[#d7f36b]" /><h3 className="mt-5 font-semibold">A sharper path</h3><p className="mt-3 text-sm leading-6 text-[#b8bf8a]">Generate concept families to explore three genuinely different ways into this brief. Don’t settle for three versions of the same thought.</p><button className="mt-7 text-sm font-medium text-[#d7f36b]" onClick={() => setTab('concepts')} data-testid="button-explore-concepts">Explore territory <ArrowUpRight className="ml-1 inline h-3 w-3" /></button></div></div>}{tab === 'concepts' && <ConceptsView concepts={concepts} campaignId={campaignId} onGenerate={() => generateConcepts.mutate({ campaignId }, { onSuccess: refresh })} isPending={generateConcepts.isPending} onGenerateCreatives={(ids) => generateCreatives.mutate({ data: { campaignId, conceptIds: ids, count: 4 } }, { onSuccess: refresh })} />}{tab === 'creatives' && <section className="mt-6"><div className="mb-5 flex justify-between"><p className="text-sm text-[#858774]">Production-ready directions from Replicate.</p><button className={buttonPrimary} onClick={() => generateCreatives.mutate({ data: { campaignId, count: 4 } }, { onSuccess: refresh })} disabled={generateCreatives.isPending} data-testid="button-generate-campaign-creatives"><Sparkles className="h-4 w-4" />{generateCreatives.isPending ? 'Generating with Replicate…' : 'Generate creatives'}</button></div>{generateCreatives.isError && <div className="mb-5"><Notice tone="error">Replicate could not complete this batch. No incomplete creatives were saved. Try again after checking the provider connection.</Notice></div>}<CreativeGrid creatives={creatives} emptyAction={<button className={buttonPrimary} onClick={() => setTab('concepts')} data-testid="button-empty-view-concepts">Choose a concept family</button>} /></section>}</div>;
}

function ConceptsView({ concepts, campaignId, onGenerate, isPending, onGenerateCreatives }: { concepts: AnyRecord[]; campaignId: string; onGenerate: () => void; isPending: boolean; onGenerateCreatives: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  if (!concepts.length) return <div className="mt-6"><EmptyState icon={Lightbulb} title="No concept families yet" body="Ask the studio to interpret your brief. You’ll get distinct strategic territories, not minor variations." action={<button className={buttonPrimary} onClick={onGenerate} disabled={isPending} data-testid="button-empty-generate-concepts">{isPending ? 'Mapping territory…' : 'Generate concept families'}</button>} /></div>;
  return <div className="mt-6"><div className="mb-5 flex items-center justify-between"><p className="text-sm text-[#858774]">{selected.length ? `${selected.length} selected for production` : 'Select a family to take into production.'}</p><button className={buttonPrimary} disabled={!selected.length} onClick={() => onGenerateCreatives(selected)} data-testid="button-generate-selected-creatives"><WandSparkles className="h-4 w-4" />Generate from selected</button></div><div className="grid gap-4 lg:grid-cols-3">{concepts.map((concept: AnyRecord, i) => { const checked = selected.includes(concept.id); return <button key={concept.id} className={cn('text-left rounded-2xl border p-6 transition hover:-translate-y-0.5', checked ? 'border-[#a8c04c] bg-[#293317]' : 'border-[#2b2e22] bg-[#1a1c16]')} onClick={() => setSelected(checked ? selected.filter((id) => id !== concept.id) : [...selected, concept.id])} data-testid={`card-concept-${concept.id}`}><div className="flex items-start justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">0{i + 1} / {concept.family}</span><span className={cn('grid h-5 w-5 place-items-center rounded-full border', checked ? 'border-[#d7f36b] bg-[#d7f36b] text-[#202215]' : 'border-[#596047]')}>{checked && '✓'}</span></div><h2 className="mt-8 font-editorial text-3xl leading-tight">{concept.name}</h2><p className="mt-3 text-sm leading-6 text-[#b0b29e]">{concept.angle}</p><div className="mt-6 border-t border-[#34372a] pt-4"><div className="text-[10px] uppercase tracking-wider text-[#777a69]">Hook</div><p className="mt-2 text-sm text-[#e0e1ce]">{concept.hook}</p></div><div className="mt-5 flex flex-wrap gap-2">{[concept.emotion, concept.colorDirection, `${concept.creativeCount || 0} creatives`].filter(Boolean).map((tag: string) => <span key={tag} className="rounded-full bg-[#282d1d] px-2.5 py-1 text-[10px] text-[#aeb785]">{tag}</span>)}</div></button>})}</div></div>;
}

function CreativeGrid({ creatives, emptyAction }: { creatives: AnyRecord[]; emptyAction?: ReactNode }) {
  if (!creatives.length) return <div className="mt-6"><EmptyState icon={Layers3} title="No creatives on the shelf" body="Generate a direction and the studio will turn it into a set of ready-to-review ads." action={emptyAction} /></div>;
  return <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{creatives.map((creative) => <Link key={creative.id} href={`/creative-lab/${creative.id}`} className="group overflow-hidden rounded-[24px] border border-[#2b2e22] bg-[#1a1c16] transition duration-200 hover:-translate-y-1 hover:border-[#677335] hover:shadow-[0_24px_60px_rgba(0,0,0,0.18)]" data-testid={`card-creative-${creative.id}`}><div className="relative aspect-[4/5] overflow-hidden bg-[#303423]">{creative.previewUrl ? <img src={creative.previewUrl} alt={creative.headline} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_75%_25%,#788a36,#2e3820_35%,#191c15_70%)] p-5"><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-[#d7f36b]">{creative.family || 'Concept'}</span><div><p className="font-editorial text-3xl leading-[.95] text-[#f0f0dd]">{creative.headline || creative.hook || 'A sharper daily ritual.'}</p><span className="mt-4 block text-xs text-[#c4d17e]">{creative.cta || 'Shop now'} ↗</span></div></div>}<span className="absolute left-3 top-3 rounded bg-[#10110d]/75 px-2 py-1 text-[9px] uppercase tracking-wider text-[#e1e4c8]">{creative.isDemo ? 'Sample' : creative.format || 'Static'}</span></div><div className="p-4"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-[#f1f0dd]">{creative.conceptName || creative.headline || 'Untitled creative'}</p><span className="text-xs text-[#d7f36b]">{creative.readinessScore ? `${creative.readinessScore}%` : '—'}</span></div><p className="mt-1 truncate text-xs text-[#747866]">{creative.family || creative.platform || 'Creative direction'}</p></div></Link>)}</div>;
}

function CreativeLab() {
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useListCreatives(undefined, { query: { queryKey: getListCreativesQueryKey() } });
  const creatives: AnyRecord[] = filter === 'saved' ? ((data || []) as AnyRecord[]).filter((creative) => creative.isFavorite) : ((data || []) as AnyRecord[]);

  const overview = [
    { label: 'Saved', value: String(((data || []) as AnyRecord[]).filter((creative) => creative.isFavorite).length || 0), sub: 'Worth revisiting' },
    { label: 'Ready', value: String(Math.max(6, creatives.length || 6)), sub: 'Production ready' },
    { label: 'Concepts', value: String(Math.max(4, creatives.length || 4)), sub: 'Distinct directions' },
  ];

  return <div className="page-in mx-auto max-w-[1260px]">
    <PageHeading
      eyebrow="Creative lab"
      title="The good stuff, in one place."
      body="Browse every direction the studio has made. Save the ones with a pulse."
      action={<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-lab-new-campaign"><Plus className="h-4 w-4" />New campaign</Link>}
    />

    <div className="mb-8 grid gap-4 md:grid-cols-3">
      {overview.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5">
          <div className="text-xs uppercase tracking-[.2em] text-[#767b68]">{item.label}</div>
          <div className="mt-5 text-3xl font-semibold tracking-[-.04em] text-[#f1f0dd]">{item.value}</div>
          <div className="mt-2 text-xs text-[#717563]">{item.sub}</div>
        </div>
      ))}
    </div>

    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
      <button className={cn('rounded-full px-3 py-2 text-xs transition', !filter ? 'bg-[#d7f36b] text-[#202215]' : 'border border-[#3a3d2b] text-[#92947e] hover:border-[#697346] hover:text-[#e8e8d9]')} onClick={() => setFilter('')} data-testid="filter-all-creatives">All creatives</button>
      <button className={cn('rounded-full px-3 py-2 text-xs transition', filter === 'saved' ? 'bg-[#d7f36b] text-[#202215]' : 'border border-[#3a3d2b] text-[#92947e] hover:border-[#697346] hover:text-[#e8e8d9]')} onClick={() => setFilter('saved')} data-testid="filter-saved-creatives"><Heart className="mr-1 inline h-3 w-3" />Saved</button>
    </div>

    {isLoading ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
    ) : (
      <div className="min-h-[330px] border-t border-[#2b2e22] pt-6">
        <CreativeGrid creatives={creatives} emptyAction={<Link href="/campaigns/new" className={buttonPrimary} data-testid="link-lab-empty-campaign"><Plus className="h-4 w-4" />Create a direction</Link>} />
      </div>
    )}
  </div>;
}

function CreativeDetail() {
  const { creativeId = '' } = useParams<{ creativeId: string }>();
  const qc = useQueryClient();
  const creativeQ = useGetCreative(creativeId, { query: { enabled: !!creativeId, queryKey: getGetCreativeQueryKey(creativeId) } });
  const variationsQ = useListCreativeVariations(creativeId, { query: { enabled: !!creativeId, queryKey: getListCreativeVariationsQueryKey(creativeId) } });
  const update = useUpdateCreative();
  const generate = useGenerateCreativeVariations();
  const creative: AnyRecord = creativeQ.data || {};
  const [edit, setEdit] = useState<AnyRecord>({});
  if (creativeQ.isLoading) return <LoadingPage title="Opening creative" />;
  if (creativeQ.isError) return <ErrorPage title="Creative unavailable" retry={() => creativeQ.refetch()} />;
  const value = (key: string) => edit[key] ?? creative[key] ?? '';
  const save = () => update.mutate({ creativeId, data: { headline: value('headline'), bodyCopy: value('bodyCopy'), cta: value('cta') } }, { onSuccess: () => { setEdit({}); qc.invalidateQueries({ queryKey: getGetCreativeQueryKey(creativeId) }); } });
  const favorite = () => update.mutate({ creativeId, data: { isFavorite: !creative.isFavorite } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetCreativeQueryKey(creativeId) }) });
  const exportPreview = () => {
    const escapeHtml = (text: unknown) =>
      String(text ?? '').replace(/[&<>"']/g, (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character,
      );
    const title = escapeHtml(value('headline') || 'AdForge creative');
    const body = escapeHtml(value('bodyCopy') || '');
    const cta = escapeHtml(value('cta') || 'Shop now');
    const image = creative.previewUrl
      ? `<img src="${escapeHtml(creative.previewUrl)}" alt="${title}" />`
      : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;background:#10110d;color:#f1f0dd;font:16px Arial,sans-serif}main{max-width:760px;margin:40px auto;padding:28px;background:#1a1c16;border:1px solid #3a3d2b;border-radius:20px}img{display:block;width:100%;max-height:620px;object-fit:cover;border-radius:14px;margin-bottom:24px}h1{font:56px Georgia,serif;line-height:.95;margin:0 0 16px}p{color:#b8b9a4;line-height:1.6}span{display:inline-block;margin-top:12px;padding:10px 16px;border:1px solid #d7f36b;border-radius:99px;color:#d7f36b;font-size:13px}</style></head><body><main>${image}<h1>${title}</h1><p>${body}</p><span>${cta} ↗</span></main></body></html>`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    link.download = `${String(value('headline') || 'adforge-creative').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <div className="page-in mx-auto max-w-[1180px]">
    <Link href="/creative-lab" className="mb-5 inline-flex items-center gap-1 text-xs text-[#858774]" data-testid="link-back-lab">← Creative lab</Link>
    <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
      <section><div className="sticky top-28 overflow-hidden rounded-2xl border border-[#2b2e22] bg-[#1a1c16]"><div className="relative aspect-[4/5] bg-[#303423]">{creative.previewUrl ? <img src={creative.previewUrl} alt={creative.headline} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_70%_20%,#9baa47,#3a4823_35%,#181b15_70%)] p-8"><span className="font-mono-ui text-xs uppercase tracking-[.2em] text-[#d7f36b]">{creative.family || 'KORA / concept'}</span><div><p className="max-w-sm font-editorial text-5xl leading-[.92] text-[#f0f0dd]">{creative.headline || creative.hook || 'A sharper daily ritual.'}</p><p className="mt-5 max-w-xs text-sm leading-5 text-[#d1dd91]">{creative.bodyCopy || 'Make a little room for something considered.'}</p><span className="mt-7 inline-block rounded-full border border-[#d7f36b]/50 px-4 py-2 text-xs text-[#d7f36b]">{creative.cta || 'Shop now'} ↗</span></div></div>}<span className="absolute bottom-4 left-4 rounded bg-[#10110d]/70 px-2 py-1 font-mono-ui text-[10px] text-[#d7f36b]">{creative.aspectRatio || '4:5'} / {creative.platform || 'Meta'}</span></div><div className="flex items-center justify-between p-4"><span className="text-xs text-[#858774]">Readiness score</span><span className="text-lg font-semibold text-[#d7f36b]">{creative.readinessScore || 86}<span className="text-xs text-[#858774]"> / 100</span></span></div></div></section>
      <section>
        <div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">{creative.conceptName || 'Creative direction'}</div><h1 className="mt-2 font-editorial text-5xl leading-none tracking-[-.03em]">{creative.headline || 'Untitled creative'}</h1><p className="mt-3 text-sm text-[#858774]">{creative.creativeAngle || creative.family || 'A focused expression of the campaign idea.'}</p></div><div className="flex gap-2"><button className={cn('grid h-10 w-10 place-items-center rounded-lg border', creative.isFavorite ? 'border-[#d7f36b] bg-[#343d1b] text-[#d7f36b]' : 'border-[#3a3d2b] text-[#858774]')} onClick={favorite} data-testid="button-favorite-creative" aria-label="Save creative"><Heart className={cn('h-4 w-4', creative.isFavorite && 'fill-current')} /></button><button className={buttonGhost} onClick={exportPreview} data-testid="button-export-preview"><Download className="h-4 w-4" />Export preview</button></div></div>
        <div className="mt-8 rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Copy direction</h2><p className="mt-1 text-xs text-[#747866]">Make the final call before production.</p></div><button className={buttonGhost} onClick={save} disabled={update.isPending} data-testid="button-save-creative">{update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save edits</span>}</button></div><div className="mt-6 space-y-4"><label className="block text-sm text-[#9b9d89]">Headline<input className={cn(inputClass, 'mt-2')} value={value('headline')} onChange={(e) => setEdit({ ...edit, headline: e.target.value })} data-testid="input-creative-headline" /></label><label className="block text-sm text-[#9b9d89]">Body copy<textarea className={cn(inputClass, 'mt-2 min-h-[120px]')} value={value('bodyCopy')} onChange={(e) => setEdit({ ...edit, bodyCopy: e.target.value })} data-testid="input-creative-body" /></label><label className="block text-sm text-[#9b9d89]">Call to action<input className={cn(inputClass, 'mt-2')} value={value('cta')} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} data-testid="input-creative-cta" /></label></div></div>
        <div className="mt-5 rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Make more like this</h2><p className="mt-1 text-xs text-[#b8bf8a]">Explore controlled variations without losing the idea.</p></div><button className={buttonPrimary} onClick={() => generate.mutate({ creativeId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListCreativeVariationsQueryKey(creativeId) }) })} disabled={generate.isPending} data-testid="button-generate-variations">{generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate variations</button></div>{(variationsQ.data || []).length > 0 && <div className="mt-5 grid gap-3">{(variationsQ.data || []).map((v: AnyRecord) => <div key={v.id} className="rounded-xl border border-[#4b5728] bg-[#202715] p-4" data-testid={`card-variation-${v.id}`}><div className="flex justify-between"><span className="text-xs font-medium text-[#d7f36b]">{v.label}</span><span className="text-xs text-[#9ca875]">{v.readinessScore}% ready</span></div><p className="mt-3 text-sm">{v.headline}</p><p className="mt-1 text-xs leading-5 text-[#9ca875]">{v.bodyCopy}</p></div>)}</div>}</div>
      </section>
    </div>
  </div>;
}

function IntelligenceLegacy() {
  const { data, isLoading, isError } = useGetCreativeIntelligence();
  const summary: AnyRecord = data || {};
  if (isLoading) return <LoadingPage title="Reading creative signals" />;
  if (isError) return <ErrorPage title="Intelligence unavailable" retry={() => queryClient.invalidateQueries({ queryKey: ['/api/creative-intelligence'] })} />;
  const family = summary.familyPerformance || [{ label: 'Ritual', value: 72 }, { label: 'Origin', value: 58 }, { label: 'Contrast', value: 44 }];
  const week = summary.weeklyPerformance || [{ label: 'Mon', value: 2.7 }, { label: 'Tue', value: 3.1 }, { label: 'Wed', value: 2.9 }, { label: 'Thu', value: 4.2 }, { label: 'Fri', value: 3.8 }, { label: 'Sat', value: 4.6 }, { label: 'Sun', value: 4.1 }];
  return <div className="page-in mx-auto max-w-[1260px]"><PageHeading eyebrow="Creative intelligence" title="What the work is telling us." body="A clear read on the patterns behind performance, so the next brief starts smarter." action={summary.isSampleData && <span className="rounded-full border border-[#536229] bg-[#2c3619] px-3 py-2 text-xs text-[#c5da6d]" data-testid="badge-sample-intelligence">Sample intelligence data</span>} /><div className="grid gap-4 md:grid-cols-3">{[['Total impressions', summary.totalImpressions ? `${(summary.totalImpressions / 1000000).toFixed(1)}M` : '2.4M', 'Across active creative'], ['Average CTR', summary.averageCtr ? `${summary.averageCtr}%` : '3.8%', 'Above category median'], ['Conversion rate', summary.conversionRate ? `${summary.conversionRate}%` : '4.6%', 'From creative-led traffic']].map(([label, value, sub]) => <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5" key={label} data-testid={`card-intelligence-${label}`}><div className="text-xs text-[#888b76]">{label}</div><p className="mt-5 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-[#6e715e]">{sub}</p></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Weekly pulse</div><h2 className="mt-2 text-xl font-semibold">Creative performance</h2></div><BarChart3 className="h-5 w-5 text-[#9cad4b]" /></div><div className="mt-9 flex h-[220px] items-end gap-2 sm:gap-4">{week.map((p: AnyRecord) => <div className="flex flex-1 flex-col items-center gap-2" key={p.label} data-testid={`bar-week-${p.label}`}><div className="w-full rounded-t bg-[#a5b94c] transition hover:bg-[#d7f36b]" style={{ height: `${Math.max(24, (p.value / 5) * 170)}px` }} /><span className="text-[10px] text-[#777a69]">{p.label}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-[#292c20] pt-4 text-[10px] text-[#777a69]"><span>CTR / last 7 days</span><span className={lime}>+18.4% vs prior week</span></div></section><section className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#afc652]">Pattern worth keeping</div><h2 className="mt-4 font-editorial text-4xl leading-none text-[#eef2d7]">{summary.winningFamily || 'Ritual'} is winning.</h2><p className="mt-4 text-sm leading-6 text-[#bac48f]">“{summary.winningHook || 'Your morning deserves a better first move.'}”</p><div className="mt-8 border-t border-[#49572a] pt-5"><div className="text-xs text-[#87945c]">Why it works</div><p className="mt-2 text-sm leading-6 text-[#d1d9ad]">It makes the product feel like a small, earned upgrade rather than another thing to buy.</p></div></section></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Family performance</h2><span className="text-xs text-[#777a69]">relative score</span></div><div className="mt-6 space-y-5">{family.map((p: AnyRecord, i: number) => <div key={p.label} data-testid={`row-family-${p.label}`}><div className="mb-2 flex justify-between text-sm"><span>{p.label}</span><span className="font-mono-ui text-xs text-[#d7f36b]">{p.value}</span></div><div className="h-2 rounded-full bg-[#2c2f23]"><div className="h-2 rounded-full bg-[#a5b94c]" style={{ width: `${Math.min(100, p.value)}%`, opacity: 1 - i * .12 }} /></div></div>)}</div></section><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-lg font-semibold">Next brief, informed</h2><div className="mt-5 space-y-3">{(summary.recommendations || ['Keep grounding the product in a specific ritual.', 'Test a warmer first frame against product close-ups.', 'Let the headline do less explaining.']).map((r: string, i: number) => <div className="flex gap-3 rounded-xl border border-[#303326] bg-[#202219] p-4" key={r} data-testid={`recommendation-${i}`}><div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3b4720] text-xs text-[#d7f36b]">{i + 1}</div><p className="text-sm leading-5 text-[#c5c7b4]">{r}</p></div>)}</div></section></div></div>;
}

function Intelligence() {
  const { data, isLoading } = useGetCreativeIntelligence();
  const summary: AnyRecord = data || {};
  if (isLoading) return <LoadingPage title="Reading creative signals" />;
  const week: AnyRecord[] = summary.weeklyPerformance || [{ label: 'Mon', value: 2.7 }, { label: 'Tue', value: 3.1 }, { label: 'Wed', value: 2.9 }, { label: 'Thu', value: 4.2 }, { label: 'Fri', value: 3.8 }, { label: 'Sat', value: 4.6 }, { label: 'Sun', value: 4.1 }];
  const family: AnyRecord[] = summary.familyPerformance || [{ label: 'Lifestyle', value: 4.8 }, { label: 'Problem → Solution', value: 3.9 }, { label: 'Pattern Interrupt', value: 3.4 }, { label: 'Social Proof', value: 2.9 }];
  const maxWeek = Math.max(...week.map((point) => Number(point.value) || 0), 5);
  return <div className="page-in mx-auto max-w-[1260px]"><PageHeading eyebrow="Creative intelligence" title="What the work is telling us." body="A clear read on the patterns behind performance, so the next brief starts smarter." action={<span className="rounded-full border border-[#536229] bg-[#2c3619] px-3 py-2 text-xs text-[#c5da6d]" data-testid="badge-sample-intelligence">Sample intelligence data</span>} /><div className="grid gap-4 md:grid-cols-3">{[['Total impressions', summary.totalImpressions ? `${(summary.totalImpressions / 1000000).toFixed(1)}M` : '0.2M', 'Across active creative'], ['Average CTR', summary.averageCtr ? `${summary.averageCtr}%` : '3.8%', 'Above category median'], ['Conversion rate', summary.conversionRate ? `${summary.conversionRate}%` : '1.9%', 'From creative-led traffic']].map(([label, value, sub]) => <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5" key={label}><div className="text-xs text-[#888b76]">{label}</div><p className="mt-5 text-3xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-[#6e715e]">{sub}</p></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Weekly pulse</div><h2 className="mt-2 text-xl font-semibold">Creative performance</h2></div><BarChart3 className="h-5 w-5 text-[#a5b94c]" /></div><div className="mt-9 flex h-[220px] items-end gap-2 border-b border-[#303425] sm:gap-4">{week.map((point, index) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={point.label} data-testid={`bar-week-${point.label}`}><div className="w-full rounded-t bg-[#a5b94c] transition hover:bg-[#d7f36b]" style={{ height: `${Math.max(24, (Number(point.value) / maxWeek) * 170)}px` }} /><span className="text-[10px] text-[#777a69]">{point.label}</span></div>)}</div><div className="mt-5 flex items-center justify-between text-xs"><span className="text-[#777a69]">CTR / last 7 days</span><span className="font-medium text-[#c5da6d]">+18.4% vs prior week</span></div></section><section className="rounded-2xl border border-[#536229] bg-[#252d18] p-6"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#afc652]">Pattern worth keeping</div><h2 className="mt-5 font-editorial text-4xl leading-[.95] text-[#f0f0dd]">Lifestyle is winning.</h2><p className="mt-5 text-sm font-medium text-[#c5d27f]">“Your morning deserves better.”</p><div className="mt-8 border-t border-[#465328] pt-5"><p className="text-xs text-[#9ba873]">Why it works</p><p className="mt-3 text-sm leading-6 text-[#d8dfb9]">It makes the product feel like a small, earned upgrade rather than another thing to buy.</p></div></section></div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Family performance</h2><span className="text-xs text-[#777a69]">relative score</span></div><div className="mt-7 space-y-5">{family.map((item) => <div key={item.label}><div className="flex items-center justify-between text-sm"><span>{item.label}</span><span className="font-medium text-[#c5da6d]">{Number(item.value).toFixed(1)}</span></div><div className="mt-2 h-2 rounded-full bg-[#303629]"><div className="h-full rounded-full bg-[#a5b94c]" style={{ width: `${Math.min(100, (Number(item.value) / 5) * 100)}%` }} /></div></div>)}</div></section><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-xl font-semibold">Next brief, informed</h2><div className="mt-6 space-y-3">{['Keep building around calm, ritual-led lifestyle scenes.', 'Hooks that frame coffee as a weekly reset are outperforming offer-led copy.', '4:5 static placements are currently the strongest fit for this audience.'].map((item, index) => <div className="flex gap-3 rounded-xl border border-[#343a29] bg-[#202419] p-4" key={item}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#42551c] text-xs font-semibold text-[#d7f36b]">{index + 1}</span><p className="text-sm leading-5 text-[#c4c9aa]">{item}</p></div>)}</div></section></div></div>;
}

function SettingsLegacy() {
  const [saved, setSaved] = useState(false);
  return <div className="page-in mx-auto max-w-[1000px]"><PageHeading eyebrow="Workspace settings" title="The studio, tuned to you." body="Manage your workspace preferences and keep an eye on creative capacity." /><div className="grid gap-5 md:grid-cols-[.75fr_1.25fr]"><aside className="space-y-2"><button className="flex w-full items-center gap-3 rounded-lg bg-[#2b3319] px-4 py-3 text-left text-sm text-[#d7f36b]" data-testid="settings-tab-workspace"><Settings2 className="h-4 w-4" />Workspace</button><button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-[#878a76]" data-testid="settings-tab-billing"><Zap className="h-4 w-4" />Credits & usage</button></aside><div className="space-y-5"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-lg font-semibold">Workspace profile</h2><div className="mt-6 space-y-4"><label className="block text-sm text-[#9b9d89]">Workspace name<input className={cn(inputClass, 'mt-2')} defaultValue="KORA Studio" data-testid="input-workspace-name" /></label><label className="block text-sm text-[#9b9d89]">Default creative platform<select className={inputClass + ' mt-2'} defaultValue="Meta" data-testid="select-default-platform"><option>Meta</option><option>TikTok</option><option>Google</option></select></label></div><button className={cn(buttonPrimary, 'mt-6')} onClick={() => setSaved(true)} data-testid="button-save-settings">Save preferences</button>{saved && <span className="ml-3 text-xs text-[#d7f36b]" data-testid="status-settings-saved">Saved</span>}</section><section className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#afc652]">Creative capacity</div><h2 className="mt-3 text-2xl font-semibold">1,248 credits</h2><p className="mt-2 text-sm text-[#bac48f]">Resets on the 1st of next month.</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f36b] text-[#202215]"><Zap className="h-5 w-5 fill-current" /></div></div><div className="mt-7 h-2 rounded-full bg-[#465028]"><div className="h-2 w-[32%] rounded-full bg-[#d7f36b]" /></div><div className="mt-2 flex justify-between text-[10px] text-[#9eaa70]"><span>402 used</span><span>1,650 total</span></div></section></div></div></div>;
}

function Settings() {
  const [tab, setTab] = useState<'workspace' | 'usage'>('workspace');
  const [saved, setSaved] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('KORA Studio');
  return <div className="page-in mx-auto max-w-[1100px]"><PageHeading eyebrow="Workspace settings" title="The studio, tuned to you." body="Shape how your team works, spend creative capacity wisely, and keep the signal clear." /><div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]"><aside className="space-y-2"><button className={cn('flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition', tab === 'workspace' ? 'bg-[#2b3319] text-[#d7f36b]' : 'text-[#878a76] hover:bg-[#292c20]')} onClick={() => setTab('workspace')}><Settings2 className="h-4 w-4" />Workspace</button><button className={cn('flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition', tab === 'usage' ? 'bg-[#2b3319] text-[#d7f36b]' : 'text-[#878a76] hover:bg-[#292c20]')} onClick={() => setTab('usage')}><Zap className="h-4 w-4" />Credits & usage</button><div className="mt-8 rounded-xl border border-[#2b2e22] bg-[#171914] p-4"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Workspace status</p><div className="mt-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#30391c] text-[#d7f36b]"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-medium">Studio online</p><p className="mt-1 text-xs text-[#777a69]">All systems are ready.</p></div></div></div></aside>{tab === 'workspace' ? <div className="space-y-5"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Workspace profile</h2><p className="mt-1 text-sm text-[#747866]">The name and defaults your studio carries into every brief.</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#303524] text-[#d7f36b]"><Settings2 className="h-5 w-5" /></div></div><div className="mt-7 space-y-5"><label className="block text-sm text-[#9b9d89]">Workspace name<input className={cn(inputClass, 'mt-2')} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} data-testid="input-workspace-name" /></label><label className="block text-sm text-[#9b9d89]">Default creative platform<select className={cn(inputClass, 'mt-2')} defaultValue="Meta" data-testid="select-default-platform"><option>Meta</option><option>TikTok</option><option>Google</option></select></label></div><div className="mt-7 flex items-center gap-3"><button className={buttonPrimary} onClick={() => setSaved(true)} data-testid="button-save-settings">Save preferences</button>{saved && <span className="text-xs text-[#d7f36b]" data-testid="status-settings-saved">Preferences saved.</span>}</div></section><section className="rounded-2xl border border-[#536229] bg-[#252d18] p-6"><div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#afc652]">Creative capacity</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">1,248 credits</h2><p className="mt-2 text-sm text-[#bac48f]">Resets on the 1st of next month.</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f36b] text-[#202215]"><Zap className="h-5 w-5 fill-current" /></div></div><div className="mt-7 h-2 rounded-full bg-[#3a4523]"><div className="h-full w-[32%] rounded-full bg-[#d7f36b]" /></div><div className="mt-3 flex justify-between text-xs text-[#9eaa73]"><span>402 used</span><span>1,650 total</span></div></section><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Connected studio</h2><p className="mt-1 text-sm text-[#747866]">Services available to your creative workflow.</p></div><span className="rounded-full border border-[#536229] bg-[#2c3619] px-3 py-1 text-xs text-[#c5da6d]">2 active</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="flex items-center justify-between rounded-xl border border-[#34372a] bg-[#202419] p-4"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /><span className="text-sm">Brand intelligence</span></div><span className="text-xs text-[#9ca875]">Ready</span></div><div className="flex items-center justify-between rounded-xl border border-[#34372a] bg-[#202419] p-4"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /><span className="text-sm">Creative generation</span></div><span className="text-xs text-[#9ca875]">Ready</span></div></div></section></div> : <div className="space-y-5"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Usage this cycle</h2><p className="mt-1 text-sm text-[#747866]">A clear view of how the studio’s capacity is moving.</p></div><span className="font-mono-ui text-xs text-[#9ca875]">SEP 2026</span></div><div className="mt-8 grid gap-4 sm:grid-cols-3">{[['402', 'Credits used'], ['1,248', 'Credits left'], ['24', 'Concepts made']].map(([value, label]) => <div className="rounded-xl border border-[#34372a] bg-[#202419] p-4" key={label}><p className="text-2xl font-semibold text-[#f0f0dd]">{value}</p><p className="mt-2 text-xs text-[#777a69]">{label}</p></div>)}</div><div className="mt-7 h-2 rounded-full bg-[#303629]"><div className="h-full w-[32%] rounded-full bg-[#a5b94c]" /></div></section><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-lg font-semibold">Account & security</h2><div className="mt-5 flex items-center justify-between border-b border-[#303425] pb-5"><div><p className="text-sm">Sign-in protection</p><p className="mt-1 text-xs text-[#777a69]">Your workspace account is protected.</p></div><span className="text-xs text-[#d7f36b]">Active</span></div><div className="flex items-center justify-between pt-5"><div><p className="text-sm">Last activity</p><p className="mt-1 text-xs text-[#777a69]">This browser, just now</p></div><span className="text-xs text-[#777a69]">Local preview</span></div></section></div>}</div></div>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d7f36b',
    colorForeground: '#f1f0dd',
    colorMutedForeground: '#858774',
    colorDanger: '#efab75',
    colorBackground: '#191b15',
    colorInput: '#10110d',
    colorInputForeground: '#f1f0dd',
    colorNeutral: '#3a3d2b',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#191b15] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#34372a]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f1f0dd]',
    headerSubtitle: 'text-[#858774]',
    socialButtonsBlockButtonText: 'text-[#e8e8d9]',
    formFieldLabel: 'text-[#b8b9a4]',
    footerActionLink: 'text-[#d7f36b]',
    footerActionText: 'text-[#858774]',
    dividerText: 'text-[#858774]',
    formButtonPrimary: 'bg-[#d7f36b] text-[#202215] hover:bg-[#e5fa88]',
    formFieldInput: 'bg-[#10110d] border-[#3a3d2b] text-[#f1f0dd]',
    socialButtonsBlockButton: 'bg-[#24261c] border-[#3a3d2b] hover:bg-[#303425]',
    dividerLine: 'bg-[#3a3d2b]',
    alert: 'bg-[#3a291e] border-[#6f432b]',
    alertText: 'text-[#efab75]',
  },
};

function SignInPage() {
  return <div className="grain flex min-h-[100dvh] items-center justify-center bg-[#10110d] px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="grain flex min-h-[100dvh] items-center justify-center bg-[#10110d] px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function LandingPage() {
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]"><header className="mx-auto flex max-w-[1260px] items-center justify-between px-5 py-6 lg:px-10"><Link href="/" className="flex items-center gap-2.5" data-testid="link-landing-logo"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><div className="flex items-center gap-3"><Link href="/sign-in" className="hidden text-sm text-[#a4a795] transition hover:text-[#d7f36b] sm:block" data-testid="link-landing-sign-in">Sign in</Link><Link href="/sign-up" className={buttonPrimary} data-testid="link-landing-sign-up">Enter the studio <ArrowUpRight className="h-4 w-4" /></Link></div></header><main className="mx-auto max-w-[1260px] px-5 pb-20 pt-16 lg:px-10 lg:pt-24"><div className="grid items-end gap-12 lg:grid-cols-[1.05fr_.95fr]"><section><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Creative intelligence / 01</div><h1 className="mt-5 max-w-3xl font-editorial text-6xl leading-[.9] tracking-[-.04em] text-[#f1f0dd] md:text-8xl">Make work people remember.</h1><p className="mt-7 max-w-xl text-base leading-7 text-[#989b86] md:text-lg">AdForge turns your brand DNA and campaign brief into sharper strategy, distinct creative territories, and production-ready directions.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/sign-up" className={buttonPrimary} data-testid="button-landing-start">Build your first campaign <ArrowUpRight className="h-4 w-4" /></Link><Link href="/sign-in" className={buttonGhost} data-testid="button-landing-login">Open workspace</Link></div></section><section className="relative"><div className="rounded-[2rem] border border-[#3a3d2b] bg-[#1a1c16] p-5 shadow-2xl md:p-7"><div className="flex items-center justify-between border-b border-[#2b2e22] pb-4"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">KORA / morning reset</span><span className="flex items-center gap-2 text-xs text-[#9cad4b]"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Live signal</span></div><div className="mt-5 grid grid-cols-[1.2fr_.8fr] gap-4"><div className="flex min-h-[310px] flex-col justify-between rounded-2xl bg-[radial-gradient(circle_at_72%_22%,#9baa47,#3a4823_38%,#181b15_72%)] p-6"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#d7f36b]">Concept family / ritual</span><div><p className="max-w-xs font-editorial text-4xl leading-[.95] text-[#f0f0dd] md:text-5xl">A better kind of morning.</p><p className="mt-4 text-sm text-[#d1dd91]">Make a little room for something considered.</p></div></div><div className="space-y-4"><div className="rounded-2xl border border-[#34372a] bg-[#202219] p-4"><div className="text-[10px] uppercase tracking-wider text-[#777a69]">Readiness</div><div className="mt-2 text-3xl font-semibold text-[#d7f36b]">86<span className="text-sm text-[#858774]"> / 100</span></div><div className="mt-3 h-1.5 rounded-full bg-[#3a4126]"><div className="h-1.5 w-[86%] rounded-full bg-[#d7f36b]" /></div></div><div className="rounded-2xl border border-[#34372a] bg-[#202219] p-4"><div className="text-[10px] uppercase tracking-wider text-[#777a69]">Studio note</div><p className="mt-3 text-sm leading-6 text-[#d0d2bd]">The strongest route is the one with a clear point of view.</p></div></div></div></div></section></div><div className="mt-24 grid gap-4 border-t border-[#2b2e22] pt-6 text-sm text-[#858774] md:grid-cols-3"><div><span className="font-mono-ui text-[#d7f36b]">01</span><p className="mt-2 text-[#c4c6b4]">Teach the studio your brand.</p></div><div><span className="font-mono-ui text-[#d7f36b]">02</span><p className="mt-2 text-[#c4c6b4]">Shape a brief with a point of view.</p></div><div><span className="font-mono-ui text-[#d7f36b]">03</span><p className="mt-2 text-[#c4c6b4]">Make the direction worth stopping for.</p></div></div></main></div>;
}

function StudioLandingPage() {
  const featureCards = [
    { title: 'Brand DNA', body: 'Build a live creative system from the signals that make your brand unmistakable.', icon: Palette },
    { title: 'Campaign strategy', body: 'Turn every brief into clear messaging, territories, and production-ready direction.', icon: FolderKanban },
    { title: 'Creative intelligence', body: 'See what resonates, what gets traction, and what deserves a second look.', icon: BarChart3 },
  ];

  const proofPoints = [
    { value: '3.4x', label: 'Faster concept development' },
    { value: '82%', label: 'Brand signal strength' },
    { value: '11', label: 'Campaigns launched in a week' },
  ];

  const workflow = [
    'Define the brand brain and creative rules.',
    'Generate campaign territory and concept families.',
    'Review, refine, and move into production.',
  ];

  return <div className="grain min-h-[100dvh] overflow-hidden bg-[#10110d] text-[#e8e8d9]">
    <header className="relative z-10 mx-auto flex max-w-[1380px] items-center justify-between px-5 py-6 lg:px-12 lg:py-8">
      <Link href="/" className="flex items-center gap-3" data-testid="link-landing-logo">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#d7f36b] text-[#202215] shadow-[0_0_0_5px_rgba(215,243,107,.08)]"><Zap className="h-4 w-4 fill-current" /></span>
        <span className="text-[18px] font-bold tracking-[-.04em]">adforge<span className={lime}>.</span></span>
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/sign-in" className="hidden text-sm text-[#a4a795] transition hover:text-[#d7f36b] sm:block" data-testid="link-landing-sign-in">Sign in</Link>
        <Link href="/sign-up" className={buttonPrimary} data-testid="link-landing-sign-up">Enter the studio <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
    </header>

    <main className="relative mx-auto max-w-[1380px] px-5 pb-16 lg:px-12 lg:pb-24">
      <div className="pointer-events-none absolute -right-48 top-16 h-[560px] w-[560px] rounded-full border border-[#d7f36b]/10" />
      <div className="pointer-events-none absolute -right-28 top-36 h-[420px] w-[420px] rounded-full border border-[#d7f36b]/10" />

      <section className="relative grid items-end gap-14 pb-16 pt-16 lg:grid-cols-[.88fr_1.12fr] lg:gap-20 lg:pb-24 lg:pt-20">
        <div className="max-w-[670px]">
          <div className="flex items-center gap-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">
            <span className="h-px w-8 bg-[#9cad4b]" />Creative intelligence / 01
          </div>
          <h1 className="mt-6 max-w-2xl font-editorial text-[clamp(4rem,8vw,7.8rem)] leading-[.82] tracking-[-.055em] text-[#f1f0dd]">
            Make the <em className="text-[#d7f36b]">next</em> thing impossible to ignore.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[#989b86] md:text-lg">
            AdForge turns brand instinct into an operating system for creative growth: sharper strategy, smarter concepting, and production-ready work that still sounds like you.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonPrimary} data-testid="button-landing-start">Build your first campaign <ArrowUpRight className="h-4 w-4" /></Link>
            <Link href="/sign-in" className={buttonGhost} data-testid="button-landing-login">Open workspace</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[.18em] text-[#6f725f]">
            <span>Trusted by teams building culture</span>
            <span>Brand systems</span>
            <span>Campaign ops</span>
          </div>
        </div>

        <div className="relative lg:pb-4">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-[#d7f36b]/[.035] blur-3xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[#42482d] bg-[#191b15] shadow-[0_28px_90px_rgba(0,0,0,.38)]">
            <div className="flex items-center justify-between border-b border-[#303425] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#d7f36b]" />
                <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#bfc69b]">KORA / live brand brain</span>
              </div>
              <span className="text-[10px] text-[#777a69]">Updated just now</span>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.05fr_.95fr]">
              <div className="border-b border-[#303425] p-6 md:border-b-0 md:border-r md:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Creative territory</p>
                    <h2 className="mt-4 max-w-xs font-editorial text-5xl leading-[.9] tracking-[-.04em] text-[#f0f0dd]">
                      Small rituals.<br />
                      <span className="text-[#d7f36b]">Big signal.</span>
                    </h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-[#d7f36b]" />
                </div>
                <p className="mt-8 max-w-sm text-sm leading-6 text-[#aeb19a]">
                  A warmer way into the day, built around the quiet confidence of a considered cup.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#59633a] bg-[#30391c] px-2.5 py-1 text-[10px] text-[#d7f36b]">Ritual</span>
                  <span className="rounded-full border border-[#3d4130] px-2.5 py-1 text-[10px] text-[#aeb19a]">Warm</span>
                  <span className="rounded-full border border-[#3d4130] px-2.5 py-1 text-[10px] text-[#aeb19a]">Editorial</span>
                </div>
              </div>

              <div className="bg-[#202419] p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Signal strength</p>
                  <span className="text-xs text-[#d7f36b]">82%</span>
                </div>
                <div className="mt-5 flex h-24 items-end gap-1.5 border-b border-[#3b412c] pb-0">
                  {[28, 44, 36, 58, 51, 72, 66, 86, 78, 94, 88, 100].map((height, i) => <span key={i} className={cn('flex-1 rounded-t-sm', i > 8 ? 'bg-[#d7f36b]' : 'bg-[#65752d]')} style={{ height: `${height}%` }} />)}
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-xs"><span className="text-[#8d907b]">Brand fit</span><span className="text-[#e0e4c9]">Excellent</span></div>
                  <div className="h-1.5 rounded-full bg-[#363b29]"><div className="h-full w-[88%] rounded-full bg-[#d7f36b]" /></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-[#8d907b]">Distinctiveness</span><span className="text-[#e0e4c9]">Rising</span></div>
                  <div className="h-1.5 rounded-full bg-[#363b29]"><div className="h-full w-[72%] rounded-full bg-[#a6b84c]" /></div>
                </div>
                <div className="mt-8 border-t border-[#3b412c] pt-5">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-[#777a69]">Next move</p>
                  <p className="mt-2 text-sm text-[#e0e4c9]">Turn the territory into 6 production-ready concepts <ArrowUpRight className="ml-1 inline h-3 w-3 text-[#d7f36b]" /></p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#303425] bg-[#151710] px-5 py-3 text-[10px] uppercase tracking-[.16em] text-[#777a69]">
              <span>Strategy</span><span>Concepts</span><span className="text-[#d7f36b]">Creative lab</span><span>Intelligence</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-y border-[#2b2e22] py-8 md:grid-cols-3">
        {proofPoints.map((point) => (
          <div key={point.label} className="rounded-2xl border border-[#2b2e22] bg-[#171914] p-5">
            <div className="text-3xl font-semibold tracking-[-.04em] text-[#f1f0dd]">{point.value}</div>
            <div className="mt-2 text-xs uppercase tracking-[.18em] text-[#7d826e]">{point.label}</div>
          </div>
        ))}
      </section>

      <section className="py-20">
        <div className="max-w-2xl">
          <div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Built for the moment before the brief</div>
          <h2 className="mt-4 font-editorial text-4xl leading-tight tracking-[-.04em] text-[#f1f0dd] md:text-5xl">Your brand brain, strategy engine, and creative studio in one place.</h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featureCards.map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-[28px] border border-[#2b2e22] bg-[#191b15] p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#2d331b] text-[#d7f36b]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#f1f0dd]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#8f9382]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-[32px] border border-[#2b2e22] bg-[#151812] p-6 md:grid-cols-[.95fr_1.05fr] md:p-8 lg:p-10">
        <div>
          <div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Workflow</div>
          <h2 className="mt-4 font-editorial text-4xl leading-tight tracking-[-.04em] text-[#f1f0dd] md:text-5xl">From signal to standout creative without the drag.</h2>
          <div className="mt-8 space-y-4">
            {workflow.map((step, index) => (
              <div key={step} className="flex items-start gap-4 rounded-2xl border border-[#2a2d20] bg-[#1b1e17] p-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d7f36b] text-[11px] font-semibold text-[#202215]">{index + 1}</div>
                <p className="pt-1 text-sm leading-6 text-[#b3b79c]">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#3b412c] bg-[#1b1e17] p-5">
          <div className="flex items-center justify-between border-b border-[#303425] pb-4">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#7c826c]">Studio snapshot</div>
              <div className="mt-2 text-2xl font-semibold text-[#f1f0dd]">Campaign radar</div>
            </div>
            <div className="rounded-full border border-[#536229] bg-[#2b3618] px-2.5 py-1 text-[10px] uppercase tracking-[.12em] text-[#d7f36b]">Live</div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs text-[#9aa083]">
                <span>Brand fit</span>
                <span>88%</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-[#2b2e20]">
                <div className="h-full w-[88%] rounded-full bg-[#d7f36b]" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[#9aa083]">
                <span>Creative distinctiveness</span>
                <span>72%</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-[#2b2e20]">
                <div className="h-full w-[72%] rounded-full bg-[#a6b84c]" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[#9aa083]">
                <span>Production readiness</span>
                <span>94%</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-[#2b2e20]">
                <div className="h-full w-[94%] rounded-full bg-[#d7f36b]" />
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#2d3022] bg-[#171914] p-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-[#7b7f6d]">
              <span>Recommended move</span>
              <span>Now</span>
            </div>
            <p className="mt-3 text-lg font-medium text-[#f1f0dd]">Turn the winning ritual into 6 production-ready concepts.</p>
          </div>
        </div>
      </section>

      <section className="pb-8 pt-20">
        <div className="flex flex-col gap-6 rounded-[32px] border border-[#2b2e22] bg-[#171914] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Why teams switch</div>
            <h2 className="mt-3 font-editorial text-3xl leading-tight tracking-[-.04em] text-[#f1f0dd] md:text-4xl">The system that helps creative teams move with confidence.</h2>
          </div>
          <Link href="/sign-up" className={buttonPrimary} data-testid="button-landing-cta">Start building <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="flex flex-col gap-4 border-t border-[#2b2e22] pt-8 text-xs text-[#676b59] sm:flex-row sm:items-center sm:justify-between">
        <span>AdForge / creative intelligence for brands with something to say</span>
        <span className="font-mono-ui uppercase tracking-[.15em]">Signal over noise</span>
      </footer>
    </main>
  </div>;
}

function LoadingPage({ title }: { title: string }) { return <div className="mx-auto max-w-[1260px]"><div className="mb-10"><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-12 w-96 max-w-full" /><Skeleton className="mt-4 h-4 w-[420px] max-w-full" /></div><div className="flex items-center gap-3 text-sm text-[#8d907b]"><Loader2 className="h-4 w-4 animate-spin text-[#d7f36b]" />{title}</div></div>; }
function ErrorPage({ title, retry }: { title: string; retry: () => void }) { return <div className="mx-auto max-w-[700px] py-20 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#3a291e] text-[#efab75]"><CircleHelp className="h-6 w-6" /></div><h1 className="mt-5 font-editorial text-4xl">{title}</h1><p className="mt-3 text-sm text-[#858774]">Something got lost between the studio and the signal.</p><button className={cn(buttonGhost, 'mt-6')} onClick={retry} data-testid="button-retry">Try again</button></div>; }

function Router() {
  return <Switch><Route path="/workspace" component={Dashboard} /><Route path="/brand-dna" component={BrandDNA} /><Route path="/campaigns/new" component={CampaignCreateWorkspace} /><Route path="/campaigns/:campaignId" component={CampaignDetail} /><Route path="/campaigns" component={Campaigns} /><Route path="/creative-lab/:creativeId" component={CreativeDetail} /><Route path="/creative-lab" component={CreativeLab} /><Route path="/intelligence" component={Intelligence} /><Route path="/settings" component={Settings} /><Route component={() => <ErrorPage title="Page not found" retry={() => window.history.back()} />} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function HomeRedirect() { const { isLoaded, isSignedIn } = useAuth(); if (!isLoaded) return <LoadingPage title="Opening AdForge" />; return isSignedIn ? <Redirect to="/workspace" /> : <StudioLandingPage />; }
function ProtectedApp() { const { isLoaded, isSignedIn } = useAuth(); if (!isLoaded) return <LoadingPage title="Checking your studio access" />; if (!isSignedIn) return <Redirect to="/" />; return <Shell><Router /></Shell>; }
function AppFrame() { const [location] = useLocation(); return <RoutedErrorBoundary><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={ProtectedApp} /></Switch></RoutedErrorBoundary>; }
function ClerkApp() { const [, setLocation] = useLocation(); return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to enter the studio' } }, signUp: { start: { title: 'Create your studio account', subtitle: 'Start making work worth remembering' } } }} routerPush={(to) => setLocation(to.replace(basePath, '') || '/')} routerReplace={(to) => setLocation(to.replace(basePath, '') || '/', { replace: true })}><QueryClientProvider client={queryClient}><TooltipProvider><AppFrame /><Toaster /></TooltipProvider></QueryClientProvider></ClerkProvider>; }
type PreviewAccount = { name: string; email: string; password: string };
const previewAccountKey = 'adforge-preview-account';
const previewSessionKey = 'adforge-preview-session';
const previewCampaignsKey = 'adforge-preview-campaigns';

function getPreviewAccount(): PreviewAccount {
  try { return JSON.parse(localStorage.getItem(previewAccountKey) || '') as PreviewAccount; } catch { return { name: 'KJ', email: 'demo@adforge.studio', password: 'demo' }; }
}

function PreviewAuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(mode === 'sign-in' ? 'demo@adforge.studio' : '');
  const [password, setPassword] = useState(mode === 'sign-in' ? 'demo' : '');
  const [notice, setNotice] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim() || (mode === 'sign-up' && !name.trim())) { setNotice('Complete the fields to enter the studio.'); return; }
    const account = mode === 'sign-up' ? { name: name.trim(), email: email.trim(), password } : getPreviewAccount();
    if (mode === 'sign-in' && (email.trim().toLowerCase() !== account.email.toLowerCase() || password !== account.password)) { setNotice('That demo account does not match. Try demo@adforge.studio / demo.'); return; }
    localStorage.setItem(previewAccountKey, JSON.stringify(account));
    localStorage.setItem(previewSessionKey, 'true');
    setLocation('/brand-dna');
  };
  return <div className="grain flex min-h-[100dvh] items-center justify-center bg-[#10110d] px-5 py-10 text-[#e8e8d9]"><div className="w-full max-w-[430px] rounded-2xl border border-[#3a3d2b] bg-[#191b15] p-7 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-9"><Link href="/" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[18px] font-bold tracking-[-.04em]">adforge<span className={lime}>.</span></span></Link><div className="mt-12"><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">{mode === 'sign-in' ? 'Welcome back' : 'Start your studio'}</p><h1 className="mt-3 font-editorial text-5xl leading-none">{mode === 'sign-in' ? 'Pick up the thread.' : 'Make room for better ideas.'}</h1><p className="mt-4 text-sm leading-6 text-[#858774]">{mode === 'sign-in' ? 'Enter the local demo workspace and continue shaping the brand brain.' : 'Create a local studio profile. You can connect Clerk later for production accounts.'}</p></div><form className="mt-8 space-y-4" onSubmit={submit}>{mode === 'sign-up' && <label className="block text-sm text-[#aeb19a]">Your name<input className={cn(inputClass, 'mt-2')} value={name} onChange={(e) => setName(e.target.value)} placeholder="KJ" autoComplete="name" /></label>}<label className="block text-sm text-[#aeb19a]">Email<input className={cn(inputClass, 'mt-2')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@studio.com" autoComplete="email" /></label><label className="block text-sm text-[#aeb19a]">Password<input className={cn(inputClass, 'mt-2')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>{notice && <Notice tone="error">{notice}</Notice>}<button className={cn(buttonPrimary, 'w-full')} type="submit">{mode === 'sign-in' ? 'Open workspace' : 'Create studio profile'} <ArrowUpRight className="h-4 w-4" /></button></form><div className="mt-7 border-t border-[#303425] pt-5 text-center text-xs text-[#777a69]">{mode === 'sign-in' ? 'New to AdForge?' : 'Already have a profile?'} <Link className="text-[#d7f36b]" href={mode === 'sign-in' ? '/sign-up' : '/sign-in'}>{mode === 'sign-in' ? 'Create one' : 'Sign in'}</Link></div></div></div>;
}

function PreviewCampaignCreate() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', product: 'KORA Cold Brew', description: '', audience: '', objective: 'Drive product trial', productUrl: '', offer: '', cta: 'Shop now', platform: 'Meta', format: 'Static image', ratio: '4:5' });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!form.name.trim()) return;
    const existing = JSON.parse(localStorage.getItem(previewCampaignsKey) || '[]');
    localStorage.setItem(previewCampaignsKey, JSON.stringify([{ ...form, id: Date.now(), status: 'Draft' }, ...existing]));
    setLocation('/campaigns');
  };
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[234px] border-r border-[#282b20] bg-[#141610] px-4 py-6 lg:block"><Link href="/" className="flex items-center gap-2.5 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><p className="mt-11 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Workspace</p><nav className="mt-4 space-y-1"><Link href="/brand-dna" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#949684]"><Palette className="h-[17px] w-[17px]" />Brand DNA</Link><Link href="/campaigns" className="flex items-center gap-3 rounded-lg bg-[#d7f36b]/10 px-3 py-2.5 text-sm text-[#d7f36b]"><FolderKanban className="h-[17px] w-[17px]" />Campaigns<span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" /></Link><Link href="/creative-lab" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#949684]"><WandSparkles className="h-[17px] w-[17px]" />Creative Lab</Link><Link href="/intelligence" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#949684]"><BarChart3 className="h-[17px] w-[17px]" />Intelligence</Link></nav><div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 text-xs text-[#777a69]">kora.coffee</p><Link href="/brand-dna" className="mt-3 block text-xs font-medium text-[#d7f36b]">Edit brand brain <ChevronRight className="inline h-3 w-3" /></Link></div></aside>
    <main className="lg:pl-[234px]"><header className="flex h-[70px] items-center justify-between border-b border-[#24271d] px-5 lg:px-10"><div className="font-mono-ui text-xs uppercase tracking-[.18em] text-[#777a69]">KORA / workspace <ChevronRight className="mx-1 inline h-3 w-3" /> Campaigns</div><div className="flex items-center gap-2 text-xs text-[#777a69]"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</div></header><div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-10 lg:py-10"><PageHeading eyebrow="New campaign" title="Start with the why." body="A good brief gives the studio something real to push against. You can sharpen the details later." action={<button className={buttonGhost} onClick={() => setLocation('/campaigns')}><X className="h-4 w-4" />Cancel</button>} /><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">01 / The brief</div><h2 className="mt-2 text-xl font-semibold">The brief</h2><div className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#9b9d89]">Campaign name<input className={cn(inputClass, 'mt-2')} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Spring at first sip" data-testid="preview-input-campaign-name" /></label><label className="block text-sm text-[#9b9d89]">Product or offer<input className={cn(inputClass, 'mt-2')} value={form.product} onChange={(event) => set('product', event.target.value)} data-testid="preview-input-campaign-product" /></label></div><label className="block text-sm text-[#9b9d89]">What are we making and why now?<textarea className={cn(inputClass, 'mt-2 min-h-[130px] resize-y')} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Context, moment, offer, tension..." data-testid="preview-input-campaign-description" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#9b9d89]">Audience<input className={cn(inputClass, 'mt-2')} value={form.audience} onChange={(event) => set('audience', event.target.value)} placeholder="People who..." /></label><label className="block text-sm text-[#9b9d89]">Primary objective<input className={cn(inputClass, 'mt-2')} value={form.objective} onChange={(event) => set('objective', event.target.value)} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#9b9d89]">Product URL<input className={cn(inputClass, 'mt-2')} value={form.productUrl} onChange={(event) => set('productUrl', event.target.value)} placeholder="https://kora.coffee" /></label><label className="block text-sm text-[#9b9d89]">Offer<input className={cn(inputClass, 'mt-2')} value={form.offer} onChange={(event) => set('offer', event.target.value)} placeholder="20% off first order" /></label></div><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm text-[#9b9d89]">Platform<select className={cn(inputClass, 'mt-2')} value={form.platform} onChange={(event) => set('platform', event.target.value)}><option>Meta</option><option>TikTok</option><option>Google</option></select></label><label className="block text-sm text-[#9b9d89]">Format<select className={cn(inputClass, 'mt-2')} value={form.format} onChange={(event) => set('format', event.target.value)}><option>Static image</option><option>Video</option><option>Carousel</option></select></label><label className="block text-sm text-[#9b9d89]">Aspect ratio<select className={cn(inputClass, 'mt-2')} value={form.ratio} onChange={(event) => set('ratio', event.target.value)}><option>4:5</option><option>1:1</option><option>9:16</option></select></label></div></div></section><aside className="space-y-4"><div className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-6"><Sparkles className="h-5 w-5 text-[#d7f36b]" /><h3 className="mt-4 font-semibold">What happens next</h3><div className="mt-5 space-y-4 text-sm leading-6 text-[#b8bf8a]"><p><span className="mr-2 font-mono-ui text-[#d7f36b]">01</span> Strategy is mapped from your brief.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">02</span> Three distinct concept families are shaped.</p><p><span className="mr-2 font-mono-ui text-[#d7f36b]">03</span> You choose the territory worth making.</p></div></div><button className={cn(buttonPrimary, 'w-full py-3.5')} onClick={submit} disabled={!form.name.trim()} data-testid="preview-submit-campaign"><ArrowUpRight className="h-4 w-4" />Create campaign</button></aside></div></div></main>
  </div>;
}

function LegacyPreviewWorkspace() {
  const [, setLocation] = useLocation();
  const account = getPreviewAccount();
  const [active, setActive] = useState('Brand DNA');
  const [saved, setSaved] = useState(false);
  const [brandName, setBrandName] = useState('KORA Coffee');
  const signOut = () => { localStorage.removeItem(previewSessionKey); setLocation('/'); };
  const nav = [{ label: 'Overview', icon: Home }, { label: 'Brand DNA', icon: Palette }, { label: 'Campaigns', icon: FolderKanban }, { label: 'Creative Lab', icon: WandSparkles }, { label: 'Intelligence', icon: BarChart3 }];
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[234px] border-r border-[#282b20] bg-[#141610] px-4 py-6 lg:block"><Link href="/brand-dna" className="flex items-center gap-2.5 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><p className="mt-11 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Workspace</p><nav className="mt-4 space-y-1">{nav.map(({ label, icon: Icon }) => <button key={label} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition', active === label ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]')} onClick={() => setActive(label)}><Icon className="h-[17px] w-[17px]" />{label}{active === label && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" />}</button>)}</nav><p className="mt-10 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Manage</p><button className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#949684] hover:bg-[#292c20]"><Settings2 className="h-[17px] w-[17px]" />Settings</button><div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 truncate text-xs text-[#777a69]">kora.coffee</p><button className="mt-3 text-xs font-medium text-[#d7f36b]" onClick={() => setActive('Brand DNA')}>Edit brand brain <ChevronRight className="inline h-3 w-3" /></button></div></aside><div className="lg:pl-[234px]"><header className="flex h-[72px] items-center justify-between border-b border-[#24271d] bg-[#10110d]/85 px-5 backdrop-blur-xl lg:px-10"><div className="flex items-center gap-2 text-xs text-[#777a69]"><span className="font-mono-ui uppercase tracking-[.18em]">KORA / workspace</span><ChevronRight className="h-3 w-3" /><span className="text-[#b7b9a5]">{active}</span></div><div className="flex items-center gap-4"><div className="hidden items-center gap-2 text-xs text-[#777a69] sm:flex"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</div><div className="group relative"><button className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3e2e] bg-[#272a1f] text-xs font-semibold text-[#d7f36b]" aria-label="Open profile menu">{account.name?.[0]?.toUpperCase() || 'KJ'}</button><div className="absolute right-0 top-10 z-30 hidden w-48 rounded-xl border border-[#3a3d2b] bg-[#1a1c16] p-2 shadow-2xl group-focus-within:block group-hover:block"><p className="truncate px-3 py-2 text-sm">{account.name || 'Studio member'}</p><button onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#b7b9a5] hover:bg-[#292c20] hover:text-[#d7f36b]">Sign out</button></div></div></div></header><main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10">{active === 'Brand DNA' ? <div className="mx-auto max-w-[1260px]"><div className="mb-8 flex flex-col gap-5 border-b border-[#2a2d21] pb-7 md:flex-row md:items-end md:justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">Brand intelligence</div><h1 className="mt-2 font-editorial text-5xl leading-none tracking-[-.03em] text-[#f1f0dd]">The brand brain.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#878a76]">Give the studio the details that make KORA unmistakably KORA. Changes ripple into every new concept.</p></div><button className={buttonPrimary} onClick={() => setSaved(true)}><Zap className="h-4 w-4" />{saved ? 'Saved' : 'Save changes'}</button></div><Notice>No brand brain yet. We’ll create the KORA workspace when you save this form.</Notice><div className="mt-1 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="space-y-5"><div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="mb-6 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><BookOpen className="h-4 w-4" /></div><div><h2 className="font-semibold">Core identity</h2><p className="text-xs text-[#747866]">The facts behind the feeling.</p></div></div><div className="grid gap-4 md:grid-cols-2">{[['name', 'Brand name'], ['website', 'Website'], ['industry', 'Industry'], ['audience', 'Core audience']].map(([key, label]) => <label key={key} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} value={key === 'name' ? brandName : ''} onChange={(e) => key === 'name' && setBrandName(e.target.value)} placeholder={key === 'name' ? 'KORA Coffee' : ''} /></label>)}</div><label className="mt-4 block text-sm text-[#9b9d89]">Description<textarea className={cn(inputClass, 'mt-2 min-h-[105px] resize-y')} placeholder="What should every creative know about this brand?" /></label></div><div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="mb-6"><h2 className="font-semibold">Creative direction</h2><p className="mt-1 text-xs text-[#747866]">These become the studio’s internal guardrails.</p></div><div className="space-y-4">{['Visual language', 'Typography', 'Primary color', 'Accent color'].map((label) => <label key={label} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} placeholder={label === 'Accent color' ? '#d7f36b' : ''} /></label>)}</div></div></section><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold">Asset library</h2><span className="rounded bg-[#323a1d] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#b7d354]">0 files</span></div><p className="mt-1 text-xs text-[#747866]">Reference material the studio can see.</p></div><button className={buttonGhost}><Upload className="h-4 w-4" />Upload</button></div><input className={cn(inputClass, 'mt-5')} placeholder="Optional tag for the next upload" /><EmptyState icon={ImagePlus} title="Build your reference shelf" body="Upload logos, packaging, photography, and visual references to keep every concept on-brand." action={<button className={buttonPrimary}><Upload className="h-4 w-4" />Add first asset</button>} /></section></div></div> : <div className="mx-auto max-w-[900px] py-20"><PageHeading eyebrow={active} title={`${active}, with a point of view.`} body="This workspace surface is ready for your next creative move." action={<button className={buttonPrimary} onClick={() => setActive('Brand DNA')}>Open Brand DNA</button>} /><div className="grid gap-4 md:grid-cols-3">{['Strategy', 'Concepts', 'Production'].map((item, index) => <div key={item} className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><span className="font-mono-ui text-[10px] text-[#9cad4b]">0{index + 1}</span><h2 className="mt-6 text-lg font-semibold">{item}</h2><p className="mt-2 text-sm leading-6 text-[#858774]">A focused place to shape the next signal for KORA Coffee.</p></div>)}</div></div>}</main></div></div>;
}

function PreviewWorkspace() {
  const [location, setLocation] = useLocation();
  const account = getPreviewAccount();
  const [active, setActive] = useState(location === '/campaigns' ? 'Campaigns' : 'Overview');
  const [saved, setSaved] = useState(false);
  const nav = [
    { label: 'Overview', icon: Home },
    { label: 'Brand DNA', icon: Palette },
    { label: 'Campaigns', icon: FolderKanban },
    { label: 'Creative Lab', icon: WandSparkles },
    { label: 'Intelligence', icon: BarChart3 },
  ];
  const pageDetails: Record<string, { eyebrow: string; title: string; body: string }> = {
    Overview: { eyebrow: 'Overview', title: 'Overview, with a point of view.', body: 'Your studio is ready for the next creative move.' },
    Campaigns: { eyebrow: 'Campaigns', title: 'Campaigns, with a point of view.', body: 'Turn a clear brief into a campaign your audience can feel.' },
    'Creative Lab': { eyebrow: 'Creative Lab', title: 'Creative Lab, with a point of view.', body: 'Shape distinct concepts and turn the strongest signals into work.' },
    Intelligence: { eyebrow: 'Intelligence', title: 'Intelligence, with a point of view.', body: 'Read the patterns behind the work and decide what moves next.' },
  };
  const detail = pageDetails[active] || pageDetails.Overview;
  const setPage = (label: string) => setActive(label);
  const surface = active === 'Brand DNA' ? (
    <div className="mx-auto max-w-[1260px]">
      <PreviewPageHeader eyebrow="Brand intelligence" title="The brand brain." body="Give the studio the details that make KORA unmistakably KORA." action={<button className={buttonPrimary} onClick={() => setSaved(true)}><Zap className="h-4 w-4" />{saved ? 'Saved' : 'Save changes'}</button>} />
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-5">
          <PreviewPanel title="Core identity" subtitle="The facts behind the feeling.">
            <div className="grid gap-4 md:grid-cols-2">{['Brand name', 'Website', 'Industry', 'Core audience'].map((label, index) => <label key={label} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} defaultValue={index === 0 ? 'KORA Coffee' : ''} placeholder={index === 1 ? 'kora.coffee' : ''} /></label>)}</div>
            <label className="mt-4 block text-sm text-[#9b9d89]">Description<textarea className={cn(inputClass, 'mt-2 min-h-[105px] resize-y')} placeholder="What should every creative know about this brand?" /></label>
          </PreviewPanel>
          <PreviewPanel title="Creative direction" subtitle="Internal guardrails for every concept.">
            <div className="space-y-4">{['Visual language', 'Typography', 'Primary color', 'Accent color'].map((label) => <label key={label} className="block text-sm text-[#9b9d89]">{label}<input className={cn(inputClass, 'mt-2')} defaultValue={label === 'Accent color' ? '#d7f36b' : ''} /></label>)}</div>
          </PreviewPanel>
        </section>
        <PreviewPanel title="Asset library" subtitle="Reference material the studio can see.">
          <div className="grid min-h-[300px] place-items-center rounded-xl border border-dashed border-[#3a3d2b] p-6 text-center"><div><ImagePlus className="mx-auto h-8 w-8 text-[#9cad4b]" /><h3 className="mt-4 font-semibold">Build your reference shelf</h3><p className="mt-2 text-sm leading-6 text-[#858774]">Upload logos, packaging, photography, and visual references.</p><button className={cn(buttonPrimary, 'mt-5')}><Upload className="h-4 w-4" />Add first asset</button></div></div>
        </PreviewPanel>
      </div>
    </div>
  ) : (
    <div className="mx-auto max-w-[1260px]">
      <PreviewPageHeader eyebrow={detail.eyebrow} title={detail.title} body={detail.body} action={active === 'Campaigns' ? <Link href="/campaigns/new" className={buttonPrimary}><Plus className="h-4 w-4" />New campaign</Link> : <button className={buttonPrimary} onClick={() => setPage('Brand DNA')}>Open Brand DNA</button>} />
      {active === 'Overview' && <div className="grid gap-4 md:grid-cols-4">{[['82%', 'Brand health', Palette], ['1,248', 'Credits remaining', Zap], ['06', 'Active campaigns', Target], ['12', 'Saved creatives', Heart]].map(([value, label, Icon]: any) => <PreviewMetric key={label} value={value} label={label} icon={Icon} />)}</div>}
      {active === 'Campaigns' && <div className="grid gap-4 md:grid-cols-3">{[['Spring at first sip', 'Drive product trial', 'In progress'], ['The considered cup', 'Build brand affinity', 'Review'], ['Cold brew, warmer', 'Launch new ritual', 'Draft']].map(([name, objective, status]) => <PreviewCampaign key={name} name={name} objective={objective} status={status} />)}</div>}
      {active === 'Creative Lab' && <div className="grid gap-4 md:grid-cols-3">{[['Small rituals. Big signal.', 'Editorial / Ritual'], ['Make room for considered.', 'Warm / Lifestyle'], ['The good kind of daily.', 'Bold / Product']].map(([title, family]) => <PreviewCreativeCard key={title} title={title} family={family} />)}</div>}
      {active === 'Intelligence' && <div className="grid gap-4 md:grid-cols-3"><PreviewMetric value="3.8%" label="Average CTR" icon={BarChart3} /><PreviewMetric value="82%" label="Brand signal" icon={Sparkles} /><PreviewMetric value="4.6%" label="Conversion rate" icon={Target} /><div className="md:col-span-3 rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-center justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Weekly pulse</div><h2 className="mt-2 text-xl font-semibold">Creative performance</h2></div><BarChart3 className="h-5 w-5 text-[#a5b94c]" /></div><div className="mt-8 flex h-44 items-end gap-3 border-b border-[#303425]">{[42, 58, 50, 76, 66, 92, 82].map((height, index) => <div key={index} className="flex h-full flex-1 items-end"><div className="w-full rounded-t bg-[#a5b94c]" style={{ height: `${height}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-[10px] text-[#777a69]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div>}
      {active === 'Overview' && <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><PreviewPanel title="Campaigns in motion" subtitle="Recent work across the studio."><div className="space-y-3">{['Spring at first sip', 'The considered cup', 'Cold brew, warmer'].map((name, index) => <div key={name} className="flex items-center gap-3 rounded-xl border border-[#2c3022] bg-[#20231a] p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#303524] text-[#d7f36b]"><Target className="h-4 w-4" /></div><div className="flex-1"><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs text-[#747866]">{index === 0 ? 'In progress' : 'Creative review'}</p></div><ChevronRight className="h-4 w-4 text-[#646856]" /></div>)}</div></PreviewPanel><PreviewPanel title="Next best move" subtitle="A signal worth acting on."><div className="rounded-xl border border-[#536229] bg-[#30391c] p-4"><Sparkles className="h-5 w-5 text-[#d7f36b]" /><p className="mt-4 text-lg font-medium text-[#f1f0dd]">Push the ritual territory into production.</p><p className="mt-2 text-sm leading-6 text-[#b8bf8a]">Your strongest brand signal is ready for a sharper expression.</p></div></PreviewPanel></div>}
    </div>
  );
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[234px] border-r border-[#282b20] bg-[#141610] px-4 py-6 lg:block"><Link href="/" className="flex items-center gap-2.5 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><p className="mt-11 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Workspace</p><nav className="mt-4 space-y-1">{nav.map(({ label, icon: Icon }) => <button key={label} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition', active === label ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]')} onClick={() => setPage(label)}><Icon className="h-[17px] w-[17px]" />{label}{active === label && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" />}</button>)}</nav><p className="mt-10 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Manage</p><button className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#949684]" onClick={() => setPage('Brand DNA')}><Settings2 className="h-[17px] w-[17px]" />Settings</button><div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 truncate text-xs text-[#777a69]">kora.coffee</p><button className="mt-3 text-xs font-medium text-[#d7f36b]" onClick={() => setPage('Brand DNA')}>Edit brand brain <ChevronRight className="inline h-3 w-3" /></button></div></aside><div className="lg:pl-[234px]"><header className="flex h-[72px] items-center justify-between border-b border-[#24271d] bg-[#10110d]/85 px-5 backdrop-blur-xl lg:px-10"><div className="flex items-center gap-2 text-xs text-[#777a69]"><span className="font-mono-ui uppercase tracking-[.18em]">KORA / workspace</span><ChevronRight className="h-3 w-3" /><span className="text-[#b7b9a5]">{active}</span></div><div className="flex items-center gap-4"><div className="hidden items-center gap-2 text-xs text-[#777a69] sm:flex"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</div><div className="group relative"><button className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3e2e] bg-[#272a1f] text-xs font-semibold text-[#d7f36b]" aria-label="Open profile menu">{account.name?.[0]?.toUpperCase() || 'KJ'}</button><div className="absolute right-0 top-10 z-30 hidden w-48 rounded-xl border border-[#3a3d2b] bg-[#1a1c16] p-2 shadow-2xl group-focus-within:block group-hover:block"><p className="truncate px-3 py-2 text-sm">{account.name || 'Studio member'}</p><button onClick={() => { localStorage.removeItem(previewSessionKey); setLocation('/'); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#b7b9a5] hover:bg-[#292c20] hover:text-[#d7f36b]">Sign out</button></div></div></div></header><main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10">{surface}</main></div></div>;
}

function PreviewPageHeader({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 border-b border-[#2a2d21] pb-7 md:flex-row md:items-end md:justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#9cad4b]">{eyebrow}</div><h1 className="mt-2 font-editorial text-5xl leading-none tracking-[-.03em] text-[#f1f0dd]">{title}</h1><p className="mt-4 text-sm leading-6 text-[#878a76]">{body}</p></div>{action}</div>;
}

function PreviewPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-[#747866]">{subtitle}</p><div className="mt-6">{children}</div></section>;
}

function PreviewMetric({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  return <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><div className="flex items-start justify-between"><span className="text-xs text-[#888b76]">{label}</span><Icon className="h-4 w-4 text-[#9cad4b]" /></div><p className="mt-5 text-3xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-[#6e715e]">Updated today</p></div>;
}

function PreviewCampaign({ name, objective, status }: { name: string; objective: string; status: string }) {
  return <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5 transition hover:border-[#677335]"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#303524] text-[#d7f36b]"><Target className="h-5 w-5" /></div><span className="rounded-full border border-[#41462e] px-2 py-1 text-[10px] text-[#a9ae8d]">{status}</span></div><h2 className="mt-7 text-lg font-semibold">{name}</h2><p className="mt-2 text-sm leading-6 text-[#858774]">{objective}</p><div className="mt-6 border-t border-[#34372a] pt-4 text-xs text-[#777a69]">KORA Coffee · Meta</div></div>;
}

function PreviewSettings() {
  const [, setLocation] = useLocation();
  const account = getPreviewAccount();
  const [saved, setSaved] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('KORA Studio');
  const [defaultPlatform, setDefaultPlatform] = useState('Meta');
  const [digest, setDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) => <button type="button" className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-[#d7f36b]' : 'bg-[#3a3d2b]')} onClick={() => onChange(!checked)} aria-label={label} aria-pressed={checked}><span className={cn('absolute top-1 h-4 w-4 rounded-full transition', checked ? 'left-6 bg-[#202215]' : 'left-1 bg-[#9b9d89]')} /></button>;
  const save = () => setSaved(true);
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[234px] border-r border-[#282b20] bg-[#141610] px-4 py-6 lg:block"><Link href="/" className="flex items-center gap-2.5 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><p className="mt-11 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Workspace</p><nav className="mt-4 space-y-1">{[['Overview', Home, '/workspace'], ['Brand DNA', Palette, '/brand-dna'], ['Campaigns', FolderKanban, '/campaigns'], ['Creative Lab', WandSparkles, '/creative-lab'], ['Intelligence', BarChart3, '/intelligence']].map(([label, Icon, href]: any) => <Link key={label} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]"><Icon className="h-[17px] w-[17px]" />{label}</Link>)}</nav><p className="mt-10 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Manage</p><Link href="/settings" className="mt-4 flex items-center gap-3 rounded-lg bg-[#d7f36b]/10 px-3 py-2.5 text-sm text-[#d7f36b]"><Settings2 className="h-[17px] w-[17px]" />Settings<span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" /></Link><div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 truncate text-xs text-[#777a69]">kora.coffee</p><Link href="/brand-dna" className="mt-3 block text-xs font-medium text-[#d7f36b]">Edit brand brain <ChevronRight className="inline h-3 w-3" /></Link></div></aside>
    <main className="lg:pl-[234px]"><header className="flex h-[70px] items-center justify-between border-b border-[#24271d] px-5 lg:px-10"><div className="font-mono-ui text-xs uppercase tracking-[.18em] text-[#777a69]">KORA / workspace <ChevronRight className="mx-1 inline h-3 w-3" /> Settings</div><div className="flex items-center gap-3 text-xs text-[#777a69]"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online<span className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3e2e] bg-[#272a1f] font-semibold text-[#d7f36b]">{account.name.slice(0, 2).toUpperCase()}</span></div></header>
      <div className="mx-auto max-w-[1180px] px-5 py-8 lg:px-10 lg:py-10"><PageHeading eyebrow="Workspace settings" title="The studio, tuned to you." body="Shape how your team works, keep creative defaults close, and make the workspace feel like yours." action={<button className={cn(buttonPrimary, 'min-w-[130px]')} onClick={save} data-testid="preview-button-save-settings">{saved ? 'Saved' : 'Save changes'} <ArrowUpRight className="h-4 w-4" /></button>} />
        <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]"><aside className="space-y-3"><div className="rounded-2xl border border-[#3d4721] bg-[#252b16] p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f36b] text-[#202215]"><Settings2 className="h-5 w-5" /></span><div><p className="font-semibold">KORA Studio</p><p className="mt-1 text-xs text-[#b8bf8a]">Your creative workspace</p></div></div><div className="mt-5 h-1.5 rounded-full bg-[#3b4325]"><div className="h-full w-[68%] rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-xs text-[#b8bf8a]">68% of your workspace profile is complete</p></div><div className="rounded-2xl border border-[#2b2e22] bg-[#171914] p-5"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">Account</p><p className="mt-4 text-sm font-medium">{account.name}</p><p className="mt-1 truncate text-xs text-[#777a69]">{account.email}</p><button className="mt-5 text-xs font-medium text-[#d7f36b]" onClick={() => { localStorage.removeItem(previewSessionKey); setLocation('/'); }} data-testid="preview-button-sign-out">Sign out <ArrowUpRight className="ml-1 inline h-3 w-3" /></button></div></aside>
          <div className="space-y-5"><section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between gap-4"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">Workspace profile</div><h2 className="mt-2 text-lg font-semibold">The details behind the workflow.</h2><p className="mt-1 text-sm text-[#747866]">These defaults are carried into every new campaign brief.</p></div><BookOpen className="h-5 w-5 text-[#9cad4b]" /></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block text-sm text-[#9b9d89]">Workspace name<input className={cn(inputClass, 'mt-2')} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} data-testid="preview-input-workspace-name" /></label><label className="block text-sm text-[#9b9d89]">Default platform<select className={cn(inputClass, 'mt-2')} value={defaultPlatform} onChange={(event) => setDefaultPlatform(event.target.value)} data-testid="preview-select-default-platform"><option>Meta</option><option>TikTok</option><option>Google</option><option>LinkedIn</option></select></label></div></section>
            <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">Notifications</div><h2 className="mt-2 text-lg font-semibold">Keep the right signals close.</h2><div className="mt-5 divide-y divide-[#2b2e22]"><div className="flex items-center justify-between gap-4 py-4 first:pt-0"><div><p className="text-sm font-medium">Weekly creative digest</p><p className="mt-1 text-xs leading-5 text-[#747866]">A short read on performance and next moves.</p></div><Toggle checked={digest} onChange={setDigest} label="Toggle weekly creative digest" /></div><div className="flex items-center justify-between gap-4 py-4 last:pb-0"><div><p className="text-sm font-medium">Product updates</p><p className="mt-1 text-xs leading-5 text-[#747866]">New capabilities and studio improvements.</p></div><Toggle checked={productUpdates} onChange={setProductUpdates} label="Toggle product updates" /></div></div></section>
            <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">Appearance</div><h2 className="mt-2 text-lg font-semibold">Make the workspace yours.</h2><div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-[#303425] bg-[#20231a] p-4"><div><p className="text-sm font-medium">Compact information density</p><p className="mt-1 text-xs leading-5 text-[#747866]">Show more campaign information in less space.</p></div><Toggle checked={compactMode} onChange={setCompactMode} label="Toggle compact information density" /></div><div className="mt-4 flex items-center gap-3 rounded-xl border border-[#536229] bg-[#30391c] p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-medium text-[#f0f3d8]">Dark studio theme</p><p className="mt-1 text-xs text-[#b8bf8a]">Optimized for long creative review sessions.</p></div><span className="ml-auto text-xs text-[#d7f36b]">Active</span></div></section>
            <section className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6"><div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">Creative capacity</div><h2 className="mt-2 text-lg font-semibold">1,248 credits remaining</h2><p className="mt-1 text-sm text-[#747866]">Your allocation resets on the first of next month.</p></div><Zap className="h-5 w-5 text-[#d7f36b]" /></div><div className="mt-5 h-2 rounded-full bg-[#303425]"><div className="h-full w-[64%] rounded-full bg-[#a6b84c]" /></div><div className="mt-2 flex justify-between text-xs text-[#777a69]"><span>752 used</span><span>2,000 total</span></div></section>
          </div>
        </div>
      </div>
    </main>
  </div>;
}

function PreviewCreativeCard({ title, family }: { title: string; family: string }) {
  return <div className="group overflow-hidden rounded-2xl border border-[#2b2e22] bg-[#1a1c16] transition hover:-translate-y-1 hover:border-[#677335]"><div className="flex aspect-[4/3] flex-col justify-between bg-[radial-gradient(circle_at_75%_25%,#788a36,#2e3820_35%,#191c15_70%)] p-5"><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-[#d7f36b]">{family}</span><p className="max-w-xs font-editorial text-3xl leading-[.95] text-[#f0f0dd]">{title}</p></div><div className="p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#f1f0dd]">Concept direction</span><span className="text-xs text-[#d7f36b]">86%</span></div><p className="mt-1 text-xs text-[#747866]">Ready for review</p></div></div>;
}

function PreviewCreativeLab() {
  const [filter, setFilter] = useState('');
  return <div className="grain min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[234px] border-r border-[#282b20] bg-[#141610] px-4 py-6 lg:block"><Link href="/creative-lab" className="flex items-center gap-2.5 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link><p className="mt-11 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Workspace</p><nav className="mt-4 space-y-1">{['Overview', 'Brand DNA', 'Campaigns', 'Creative Lab', 'Intelligence'].map((label) => <Link key={label} href={label === 'Creative Lab' ? '/creative-lab' : '/brand-dna'} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm', label === 'Creative Lab' ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20]')}><WandSparkles className="h-[17px] w-[17px]" />{label}{label === 'Creative Lab' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7f36b]" />}</Link>)}</nav><p className="mt-10 px-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#6e715e]">Manage</p><button className="mt-4 flex items-center gap-3 px-3 py-2.5 text-sm text-[#949684]"><Settings2 className="h-[17px] w-[17px]" />Settings</button><div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className="h-2 w-2 rounded-full bg-[#d7f36b]" /></div><p className="mt-2 text-sm font-semibold">KORA Coffee</p><p className="mt-1 text-xs text-[#777a69]">kora.coffee</p><Link href="/brand-dna" className="mt-3 block text-xs font-medium text-[#d7f36b]">Edit brand brain <ChevronRight className="inline h-3 w-3" /></Link></div></aside><div className="lg:pl-[234px]"><header className="flex h-[72px] items-center justify-between border-b border-[#24271d] px-5 lg:px-10"><div className="flex items-center gap-2 text-xs text-[#777a69]"><span className="font-mono-ui uppercase tracking-[.18em]">KORA / workspace</span><ChevronRight className="h-3 w-3" /><span className="text-[#b7b9a5]">Creative Lab</span></div><div className="flex items-center gap-4 text-xs text-[#777a69]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</span><span className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3e2e] bg-[#272a1f] font-semibold text-[#d7f36b]">KJ</span></div></header><main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10"><div className="page-in mx-auto max-w-[1260px]"><PageHeading eyebrow="Creative lab" title="The good stuff, in one place." body="Browse every direction the studio has made. Save the ones with a pulse." action={<Link href="/campaigns/new" className={buttonPrimary}><Plus className="h-4 w-4" />New campaign</Link>} /><div className="mb-6 flex items-center gap-2"><button className={cn('rounded-full px-3 py-2 text-xs', !filter ? 'bg-[#d7f36b] text-[#202215]' : 'border border-[#3a3d2b] text-[#92947e]')} onClick={() => setFilter('')}>All creatives</button><button className={cn('rounded-full px-3 py-2 text-xs', filter === 'saved' ? 'bg-[#d7f36b] text-[#202215]' : 'border border-[#3a3d2b] text-[#92947e]')} onClick={() => setFilter('saved')}><Heart className="mr-1 inline h-3 w-3" />Saved</button></div><div className="min-h-[330px] border-t border-[#2b2e22] pt-6"><EmptyState icon={Layers3} title={filter === 'saved' ? 'No saved creatives yet' : 'No creatives on the shelf'} body="Generate a direction and the studio will turn it into a set of ready-to-review ads." action={<Link href="/campaigns/new" className={buttonPrimary}><Plus className="h-4 w-4" />Create a direction</Link>} /></div></div></main></div></div>;
}

function PreviewApp() {
  const [location] = useLocation();
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem(previewSessionKey) === 'true');
  if (location === '/sign-in') return <PreviewAuthPage mode="sign-in" />;
  if (location === '/sign-up') return <PreviewAuthPage mode="sign-up" />;
  if (location === '/campaigns/new') return <PreviewCampaignCreate />;
  if (location === '/settings') return <PreviewSettings />;
  if (location === '/creative-lab') return <PreviewCreativeLab />;
  if (signedIn || location !== '/') return <PreviewWorkspace />;
  return <RoutedErrorBoundary><StudioLandingPage /></RoutedErrorBoundary>;
}
function App() { return <WouterRouter base={basePath}>{clerkPubKey ? <ClerkApp /> : <PreviewApp />}</WouterRouter>; }
export default App;