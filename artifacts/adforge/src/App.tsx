import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { dark } from '@clerk/themes';
import {
  useGetDashboard,
  useGetCurrentBrand,
  useListBrandAssets,
  getListBrandAssetsQueryKey,
  useCreateBrandAsset,
  useRequestUploadUrl,
  useCreateBrand,
  useUpdateCurrentBrand,
  useListCampaigns,
  getListCampaignsQueryKey,
  useCreateCampaign,
  useGetCampaign,
  useListCampaignConcepts,
  useGenerateCampaignConcepts,
  useListCreatives,
  getListCreativesQueryKey,
  useGenerateCreatives,
  useGetCreativeIntelligence,
  setBaseUrl,
} from '@workspace/api-client-react';
import {
  ArrowUpRight, BarChart3, ChevronRight, Home, Layers3, Lightbulb, Loader2, LogOut, Menu,
  Plus, Settings2, Sparkles, X, Zap,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

type AnyRecord = Record<string, any>;
const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
setBaseUrl(apiBaseUrl || null);
const configuredClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const clerkPubKey = /^pk_(test|live)[^\s]*$/.test(configuredClerkKey) && !configuredClerkKey.includes('your_key_here') ? configuredClerkKey : '';

const lime = 'text-[#d7f36b]';
const buttonPrimary = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#d7f36b] px-4 py-2.5 text-sm font-semibold text-[#202215] transition hover:bg-[#e2f98a] disabled:opacity-50';
const buttonGhost = 'inline-flex items-center justify-center gap-2 rounded-full border border-[#3a3d2b] px-4 py-2.5 text-sm text-[#c8cbb4] transition hover:bg-[#292c20]';
const inputClass = 'w-full rounded-xl border border-[#34372a] bg-[#151712] px-3 py-2.5 text-sm text-[#e8e8d9] outline-none focus:border-[#d7f36b]/50';
const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const navItems = [
  { href: '/workspace', label: 'Overview', icon: Home },
  { href: '/brand-dna', label: 'Brand DNA', icon: Lightbulb },
  { href: '/campaigns', label: 'Campaigns', icon: Layers3 },
  { href: '/creative-lab', label: 'Creative Lab', icon: Sparkles },
  { href: '/intelligence', label: 'Intelligence', icon: BarChart3 },
];

function Notice({ tone, children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return <div className={cn('rounded-xl border px-4 py-3 text-sm', tone === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-[#3d4721] bg-[#252b16] text-[#b8bf8a]')}>{children}</div>;
}

function PageHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#777a69]">{eyebrow}</div><h1 className="mt-2 text-3xl font-semibold tracking-[-.03em]">{title}</h1><p className="mt-2 max-w-2xl text-sm text-[#9b9d89]">{body}</p></div>{action}</div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="grid place-items-center rounded-2xl border border-dashed border-[#34372a] px-6 py-16 text-center"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm text-[#9b9d89]">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function CampaignAssetPicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const qc = useQueryClient();
  const assetsQ = useListBrandAssets();
  const requestUpload = useRequestUploadUrl();
  const createAsset = useCreateBrandAsset();
  const [uploading, setUploading] = useState(false);
  const assets: AnyRecord[] = assetsQ.data || [];
  const upload = async (file: File) => {
    setUploading(true);
    try {
      let previewUrl = '';
      let objectPath: string | null = null;
      try {
        const upload = await requestUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type } });
        await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        objectPath = upload.objectPath;
        previewUrl = `${apiBaseUrl}/api/storage${upload.objectPath}`;
      } catch {
        previewUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read image'));
          reader.readAsDataURL(file);
        });
      }
      if (!previewUrl) throw new Error('Upload failed');
      const asset = await createAsset.mutateAsync({
        data: { name: file.name, type: file.type.startsWith('image/') ? 'image' : file.type, objectPath, previewUrl, tags: ['campaign-reference'] } as any,
      });
      onChange([...selectedIds, asset.id]);
      qc.invalidateQueries({ queryKey: getListBrandAssetsQueryKey() });
    } catch (err) {
      console.error(err);
      alert('Could not upload media. Try a smaller JPG/PNG under 2MB.');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="border-t border-[#2b2e22] pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#9cad4b]">Supporting media</div>
          <h3 className="mt-2 font-semibold">Give the image model something real.</h3>
          <p className="mt-1 text-xs leading-5 text-[#747866]">Upload a logo, product photo, or service image so AI can match your brand.</p>
        </div>
        <label className={cn(buttonGhost, 'shrink-0 cursor-pointer')}>
          <span>{uploading ? 'Uploading…' : 'Upload logo / product image'}</span>
          <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      {assets.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {assets.map((asset) => {
            const selected = selectedIds.includes(asset.id);
            return (
              <button type="button" key={asset.id} className={cn('relative aspect-square overflow-hidden rounded-xl border', selected ? 'border-[#d7f36b] ring-2 ring-[#d7f36b]/30' : 'border-[#36392a]')} onClick={() => onChange(selected ? selectedIds.filter((id) => id !== asset.id) : [...selectedIds, asset.id])}>
                <img src={asset.previewUrl} alt={asset.name} className="h-full w-full object-cover" />
                {selected && <span className="absolute right-2 top-2 rounded-full bg-[#d7f36b] px-1.5 text-xs text-[#202215]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const brandQ = useGetCurrentBrand();
  const brand = brandQ.data as AnyRecord | null | undefined;
  const brandName = brand?.name || 'No brand yet';
  const brandSite = brand?.website ? String(brand.website).replace(/^https?:\/\//, '') : 'Create Brand DNA to start';
  const active = (href: string) => (href === '/workspace' ? location === '/workspace' || location === '/' : location.startsWith(href.split('?')[0]));
  const handleSignOut = async () => {
    await signOut({ redirectUrl: `${basePath || ''}/sign-in` || '/sign-in' });
  };
  return (
    <div className="min-h-[100dvh] bg-[#10110d] text-[#e8e8d9]">
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[248px] border-r border-[#282b20] bg-[#141610]/95 px-5 py-6 backdrop-blur-xl transition-transform lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-2">
          <Link href="/workspace" className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d7f36b] text-[#202215]"><Zap className="h-4 w-4 fill-current" /></span><span className="text-[17px] font-bold tracking-[-.03em]">adforge<span className={lime}>.</span></span></Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Workspace</div>
        <nav className="mt-3 space-y-1">{navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active(href) ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20] hover:text-[#e8e8d9]')}><Icon className="h-[17px] w-[17px]" /><span>{label}</span></Link>
        ))}</nav>
        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#6e715e]">Manage</div>
        <nav className="mt-3 space-y-1"><Link href="/settings" className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', location.startsWith('/settings') ? 'bg-[#d7f36b]/10 text-[#d7f36b]' : 'text-[#949684] hover:bg-[#292c20]')}><Settings2 className="h-[17px] w-[17px]" /><span>Settings</span></Link></nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-[#34372a] bg-[#1c1f17] p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-[#92947e]">Current brand</span><span className={cn('h-2 w-2 rounded-full', brand ? 'bg-[#d7f36b]' : 'bg-[#555]')} /></div>
          <p className="mt-2 truncate text-sm font-semibold">{brandName}</p>
          <p className="mt-1 truncate text-xs text-[#777a69]">{brandSite}</p>
          <Link href="/brand-dna" className="mt-3 flex items-center gap-1 text-xs font-medium text-[#d7f36b]">{brand ? 'Edit brand brain' : 'Create brand'} <ChevronRight className="h-3 w-3" /></Link>
        </div>
      </aside>
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#24271d] bg-[#10110d]/85 px-5 backdrop-blur-xl lg:px-10">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="hidden items-center gap-2 text-xs text-[#777a69] lg:flex"><span className="font-mono-ui uppercase tracking-[.18em]">{brandName} / workspace</span></div>
          <div className="ml-auto flex items-center gap-3 text-xs text-[#777a69]">
            <span className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[#d7f36b]" />Studio online</span>
            {user?.primaryEmailAddress?.emailAddress && (
              <span className="hidden max-w-[160px] truncate md:inline">{user.primaryEmailAddress.emailAddress}</span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3a3d2b] px-3 py-1.5 text-xs text-[#c8cbb4] transition hover:border-[#d7f36b]/40 hover:text-[#d7f36b]"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-72px)] px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
