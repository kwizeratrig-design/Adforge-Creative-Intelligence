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
import { Shell } from './components/Shell';

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

function WorkspaceHome() {
  const dash = useGetDashboard();
  const brandQ = useGetCurrentBrand();
  const brand = brandQ.data as AnyRecord | undefined;
  return (
    <div className="mx-auto max-w-[1260px]">
      <PageHeading eyebrow="Studio overview" title="Make something worth stopping for." body={brand ? `Your brand brain is active for ${brand.name}.` : 'Create Brand DNA first, then launch campaigns and generate ads.'} action={<Link href={brand ? '/campaigns/new' : '/brand-dna'} className={buttonPrimary}>{brand ? <><Plus className="h-4 w-4" />New campaign</> : 'Create Brand DNA'}</Link>} />
      {!brand && <Notice>No brand yet. Start with Brand DNA so campaigns can be saved to your workspace.</Notice>}
      {dash.data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><div className="text-xs text-[#777a69]">Campaigns</div><div className="mt-2 text-3xl font-semibold">{(dash.data as any).activeCampaigns ?? 0}</div></div>
          <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><div className="text-xs text-[#777a69]">Creatives</div><div className="mt-2 text-3xl font-semibold">{(dash.data as any).generatedCreatives ?? 0}</div></div>
          <div className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5"><div className="text-xs text-[#777a69]">Saved</div><div className="mt-2 text-3xl font-semibold">{(dash.data as any).savedCreatives ?? 0}</div></div>
        </div>
      )}
    </div>
  );
}

function BrandDNA() {
  const brandQ = useGetCurrentBrand();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateCurrentBrand();
  const existing = brandQ.data as AnyRecord | undefined;
  const [form, setForm] = useState<AnyRecord>({ name: '', website: '', description: '', industry: '', audience: '', personality: ['Bold'], visualStyle: 'Modern', typography: 'Clean sans', primaryColor: '#17352B', secondaryColors: ['#F3ECDD'], accentColor: '#D6F34A' });
  const set = (k: string, v: any) => setForm((c) => ({ ...c, [k]: v }));
  const save = () => {
    const payload = {
      name: String(form.name || '').trim(),
      website: String(form.website || '').trim() || 'https://example.com',
      description: String(form.description || '').trim() || form.name || 'Brand',
      industry: String(form.industry || '').trim() || 'General',
      audience: String(form.audience || '').trim() || 'General audience',
      personality: Array.isArray(form.personality) ? form.personality.filter(Boolean) : [String(form.personality || 'Bold')],
      visualStyle: String(form.visualStyle || '').trim() || 'Modern',
      typography: String(form.typography || '').trim() || 'Clean sans',
      primaryColor: String(form.primaryColor || '').trim() || '#17352B',
      secondaryColors: Array.isArray(form.secondaryColors) ? form.secondaryColors.filter(Boolean) : [String(form.secondaryColors || '#F3ECDD')],
      accentColor: String(form.accentColor || '').trim() || '#D6F34A',
    };
    if (!payload.name) return;
    if (existing?.id) updateBrand.mutate({ data: payload as any });
    else createBrand.mutate({ data: payload as any }, { onSuccess: () => brandQ.refetch() });
  };
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeading eyebrow="Brand DNA" title="Define the brand brain." body="Campaigns and creatives attach to this brand." />
      <div className="space-y-4 rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6">
        {['name', 'website', 'description', 'industry', 'audience', 'visualStyle', 'typography', 'primaryColor', 'accentColor'].map((key) => (
          <label key={key} className="block text-sm text-[#9b9d89]">{key}<input className={cn(inputClass, 'mt-2')} value={form[key] || ''} onChange={(e) => set(key, e.target.value)} /></label>
        ))}
        <button className={buttonPrimary} onClick={save} disabled={createBrand.isPending || updateBrand.isPending || !form.name}>{(createBrand.isPending || updateBrand.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save brand</button>
        {(createBrand.isError || updateBrand.isError) && <Notice tone="error">Could not save brand.</Notice>}
        {(createBrand.isSuccess || updateBrand.isSuccess) && <Notice>Brand saved.</Notice>}
      </div>
    </div>
  );
}

function Campaigns() {
  const list = useListCampaigns();
  const campaigns = (list.data || []) as AnyRecord[];
  return (
    <div className="mx-auto max-w-[1260px]">
      <PageHeading eyebrow="Campaigns" title="Campaigns with a point of view." body="Every brief becomes concepts and production-ready creatives." action={<Link href="/campaigns/new" className={buttonPrimary}><Plus className="h-4 w-4" />New campaign</Link>} />
      {list.isLoading && <p className="text-sm text-[#9b9d89]">Loading…</p>}
      {!list.isLoading && campaigns.length === 0 && <EmptyState title="No campaigns yet" body="Create a brand first, then open a new campaign brief." action={<Link href="/campaigns/new" className={buttonPrimary}>New campaign</Link>} />}
      <div className="grid gap-4 sm:grid-cols-2">{campaigns.map((c) => (
        <Link key={c.id} href={`/campaigns/${c.id}`} className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5 transition hover:border-[#d7f36b]/30">
          <div className="text-xs text-[#777a69]">{c.platform} · {c.status}</div>
          <h3 className="mt-2 text-lg font-semibold">{c.name}</h3>
          <p className="mt-1 text-sm text-[#9b9d89]">{c.productName}</p>
        </Link>
      ))}</div>
    </div>
  );
}

function CampaignCreate() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const brandQ = useGetCurrentBrand();
  const mutation = useCreateCampaign();
  const [form, setForm] = useState<AnyRecord>({
    name: '', productName: '', description: '', productUrl: '', benefits: [''], price: '', offer: '', cta: 'Shop now',
    audience: '', ageRange: '25–44', location: '', interests: [''], painPoints: [''], desires: [''],
    objective: 'Brand awareness', platform: 'Meta', format: 'Static image', aspectRatio: '1:1', assetIds: [],
  });
  const set = (k: string, v: any) => setForm((c) => ({ ...c, [k]: v }));
  const submit = () => {
    if (!brandQ.data) { setLocation('/brand-dna'); return; }
    mutation.mutate(
      { data: { ...form, productUrl: form.productUrl || 'https://example.com', benefits: form.benefits.filter(Boolean), interests: form.interests.filter(Boolean), painPoints: form.painPoints.filter(Boolean), desires: form.desires.filter(Boolean) } as any },
      { onSuccess: (campaign: AnyRecord) => { qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() }); setLocation(`/campaigns/${campaign.id}`); } },
    );
  };
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeading eyebrow="New campaign" title="Start with the why." body="Fill the brief and upload product/logo media so AI can generate real graphics." />
      {!brandQ.data && <Notice tone="error">Create Brand DNA first, then return here.</Notice>}
      <div className="space-y-4 rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6">
        <label className="block text-sm text-[#9b9d89]">Campaign name<input className={cn(inputClass, 'mt-2')} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block text-sm text-[#9b9d89]">Product or offer<input className={cn(inputClass, 'mt-2')} value={form.productName} onChange={(e) => set('productName', e.target.value)} /></label>
        <label className="block text-sm text-[#9b9d89]">Description<textarea className={cn(inputClass, 'mt-2 min-h-[100px]')} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <label className="block text-sm text-[#9b9d89]">Audience<input className={cn(inputClass, 'mt-2')} value={form.audience} onChange={(e) => set('audience', e.target.value)} /></label>
        <label className="block text-sm text-[#9b9d89]">Location<input className={cn(inputClass, 'mt-2')} value={form.location} onChange={(e) => set('location', e.target.value)} /></label>
        <label className="block text-sm text-[#9b9d89]">CTA<input className={cn(inputClass, 'mt-2')} value={form.cta} onChange={(e) => set('cta', e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-[#9b9d89]">Platform<select className={cn(inputClass, 'mt-2')} value={form.platform} onChange={(e) => set('platform', e.target.value)}><option>Meta</option><option>TikTok</option><option>Google</option><option>LinkedIn</option></select></label>
          <label className="block text-sm text-[#9b9d89]">Format<select className={cn(inputClass, 'mt-2')} value={form.format} onChange={(e) => set('format', e.target.value)}><option>Static image</option><option>Video</option><option>Carousel</option></select></label>
          <label className="block text-sm text-[#9b9d89]">Aspect ratio<select className={cn(inputClass, 'mt-2')} value={form.aspectRatio} onChange={(e) => set('aspectRatio', e.target.value)}><option>1:1</option><option>4:5</option><option>9:16</option><option>16:9</option></select></label>
        </div>
        <CampaignAssetPicker selectedIds={form.assetIds} onChange={(assetIds) => set('assetIds', assetIds)} />
        <button className={buttonPrimary} onClick={submit} disabled={mutation.isPending || !form.name || !form.productName}>{mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Create campaign</button>
        {mutation.isError && <Notice tone="error">{String((mutation.error as any)?.message || (mutation.error as any)?.data?.error || 'Could not create campaign.')}</Notice>}
      </div>
    </div>
  );
}

function CampaignDetail() {
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();
  const id = location.split('/').pop()?.split('?')[0] || '';
  const campaignQ = useGetCampaign(id);
  const conceptsQ = useListCampaignConcepts(id);
  const genConcepts = useGenerateCampaignConcepts();
  const genCreatives = useGenerateCreatives();
  const campaign = campaignQ.data as AnyRecord | undefined;
  const goLab = (conceptId?: string) => {
    const q = new URLSearchParams({ campaignId: id });
    if (conceptId) q.set('conceptId', conceptId);
    setLocation(`/creative-lab?${q.toString()}`);
  };
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeading
        eyebrow="Campaign"
        title={campaign?.name || (campaignQ.isLoading ? 'Loading…' : 'Campaign')}
        body={campaign?.description || (campaignQ.isError ? 'Could not load campaign details.' : 'Strategy concepts for this brief.')}
        action={
          <div className="flex flex-wrap gap-2">
            <button className={buttonGhost} disabled={genConcepts.isPending || !id} onClick={() => genConcepts.mutate({ campaignId: id }, { onSuccess: () => conceptsQ.refetch() })}>
              {genConcepts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Generate concepts
            </button>
            <button className={buttonPrimary} disabled={genCreatives.isPending || !id} onClick={() => genCreatives.mutate({ data: { campaignId: id } as any }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListCreativesQueryKey() }); goLab(); } })}>
              {genCreatives.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{genCreatives.isPending ? 'Generating AI images…' : 'Generate creatives'}
            </button>
          </div>
        }
      />
      {genCreatives.isPending && <Notice>Generating AI images with Replicate — this can take 30–90 seconds. Keep this tab open.</Notice>}
      {genCreatives.isError && <Notice tone="error">{String((genCreatives.error as any)?.message || (genCreatives.error as any)?.data?.error || 'Could not generate creatives.')}</Notice>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {((conceptsQ.data || []) as AnyRecord[]).map((c) => (
          <button key={c.id} type="button" onClick={() => goLab(c.id)} className="rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-5 text-left transition hover:border-[#d7f36b]/40">
            <div className="text-xs text-[#d7f36b]">{c.family}</div>
            <h3 className="mt-2 font-semibold">{c.name}</h3>
            <p className="mt-2 text-sm text-[#9b9d89]">{c.hook}</p>
            <p className="mt-3 text-xs font-medium text-[#d7f36b]">Open in Creative Lab →</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreativeLab() {
  const [location] = useLocation();
  const search = location.includes('?') ? location.split('?')[1] : '';
  const params = new URLSearchParams(search);
  const campaignId = params.get('campaignId') || '';
  const conceptId = params.get('conceptId') || '';
  const list = useListCreatives(campaignId ? { campaignId } : undefined);
  const all = (list.data || []) as AnyRecord[];
  const creatives = conceptId ? all.filter((c) => c.conceptId === conceptId) : all;
  return (
    <div className="mx-auto max-w-[1260px]">
      <PageHeading eyebrow="Creative lab" title="The good stuff, in one place." body={conceptId ? 'Creatives for the selected concept.' : campaignId ? 'Creatives for this campaign.' : 'Creatives generated from your campaigns.'} action={<Link href="/campaigns/new" className={buttonPrimary}><Plus className="h-4 w-4" />New campaign</Link>} />
      {list.isLoading && <p className="text-sm text-[#9b9d89]">Loading creatives…</p>}
      {!list.isLoading && creatives.length === 0 && (
        <EmptyState title="No creatives yet" body="Open a campaign and click Generate creatives. AI images can take up to a minute." action={campaignId ? <Link href={`/campaigns/${campaignId}`} className={buttonPrimary}>Back to campaign</Link> : <Link href="/campaigns" className={buttonPrimary}>View campaigns</Link>} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creatives.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-2xl border border-[#2b2e22] bg-[#1a1c16]">
            {c.previewUrl && <img src={c.previewUrl} alt="" className="aspect-[4/5] w-full object-cover" />}
            <div className="p-4">
              <div className="text-xs text-[#d7f36b]">{c.family}{c.status === 'ai_generated' ? ' · AI' : ''}</div>
              <h3 className="mt-1 font-semibold">{c.headline}</h3>
              <p className="mt-1 text-sm text-[#9b9d89]">{c.hook}</p>
              <p className="mt-2 text-xs text-[#777a69]">{c.conceptName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Intelligence() {
  const intel = useGetCreativeIntelligence();
  const data = intel.data as AnyRecord | undefined;
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeading eyebrow="Intelligence" title="What's working." body="Signals from your generated work." />
      {data && <div className="space-y-3">{(data.recommendations || []).map((r: string, i: number) => <Notice key={i}>{r}</Notice>)}</div>}
    </div>
  );
}

function SettingsPage() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const handleSignOut = async () => {
    await signOut({ redirectUrl: basePath ? `${basePath}/sign-in` : '/sign-in' });
  };
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeading eyebrow="Settings" title="Account & studio" body="Account and studio preferences." />
      <div className="space-y-4 rounded-2xl border border-[#2b2e22] bg-[#1a1c16] p-6">
        <div>
          <div className="text-xs text-[#777a69]">Signed in as</div>
          <p className="mt-1 text-sm font-medium">{user?.primaryEmailAddress?.emailAddress || user?.fullName || 'Account'}</p>
        </div>
        <Notice>Studio is live. AI images use Replicate when REPLICATE_API_TOKEN is set.</Notice>
        <button type="button" className={buttonGhost} onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function SignInPage() { return <div className="grid min-h-[100dvh] place-items-center bg-[#10110d] p-6"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/workspace`} /></div>; }
function SignUpPage() { return <div className="grid min-h-[100dvh] place-items-center bg-[#10110d] p-6"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/workspace`} /></div>; }
function HomeRedirect() { return <Redirect to="/workspace" />; }

function ProtectedApp() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center bg-[#10110d] text-[#9b9d89]">Loading…</div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return (
    <Shell>
      <Switch>
        <Route path="/workspace" component={WorkspaceHome} />
        <Route path="/brand-dna" component={BrandDNA} />
        <Route path="/campaigns/new" component={CampaignCreate} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/creative-lab" component={CreativeLab} />
        <Route path="/intelligence" component={Intelligence} />
        <Route path="/settings" component={SettingsPage} />
        <Route><Redirect to="/workspace" /></Route>
      </Switch>
    </Shell>
  );
}

function ClerkApp() {
  return (
    <ClerkProvider publishableKey={clerkPubKey} appearance={{ baseTheme: dark }}>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={ProtectedApp} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function PreviewApp() {
  return <div className="grid min-h-[100dvh] place-items-center bg-[#10110d] p-8 text-center text-[#e8e8d9]"><div><h1 className="text-2xl font-semibold">AdForge</h1><p className="mt-2 text-sm text-[#9b9d89]">Set VITE_CLERK_PUBLISHABLE_KEY to enable sign-in.</p></div></div>;
}

function App() {
  return <WouterRouter base={basePath}>{clerkPubKey ? <ClerkApp /> : <PreviewApp />}</WouterRouter>;
}

export default App;
