import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  CreateBrandAssetBody,
  CreateBrandBody,
  CreateCampaignBody,
  CreateBrandResponse,
  CreateBrandAssetResponse,
  CreateCampaignResponse,
  GenerateCampaignConceptsResponse,
  GenerateCreativeVariationsResponse,
  GenerateCreativesBody,
  GenerateCreativesResponse,
  GetCampaignParams,
  GetCampaignResponse,
  GetCreativeResponse,
  GetCurrentBrandResponse,
  GetDashboardResponse,
  GetCreativeIntelligenceResponse,
  ListBrandAssetsResponse,
  ListCampaignConceptsResponse,
  ListCampaignsResponse,
  ListCreativesQueryParams,
  ListCreativesResponse,
  ListCreativeVariationsResponse,
  UpdateCreativeBody,
  UpdateCreativeParams,
  UpdateCreativeResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { generateAndStoreReplicateImage } from "../lib/replicate";
import {
  brandAssetsTable,
  brandsTable,
  campaignsTable,
  creativeConceptsTable,
  creativesTable,
  creativeVariationsTable,
} from "@workspace/db/schema";

const router: IRouter = Router();
const DEMO_BRAND_ID = "brand-kora-coffee";
const DEMO_CAMPAIGN_ID = "campaign-morning-reset";
const demoImages = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=85",
];

let seedPromise: Promise<void> | undefined;

function now() {
  return new Date();
}

function requireAuth(req: Request, res: Response, next: () => void) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to use AdForge." });
    return;
  }
  next();
}

async function getUserBrand(userId: string) {
  const [userBrand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.ownerId, userId))
    .orderBy(desc(brandsTable.updatedAt))
    .limit(1);
  if (userBrand) return userBrand;

  const [demoBrand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.isDemo, true))
    .limit(1);
  return demoBrand;
}

async function getUserCampaign(userId: string, campaignId: string) {
  const brand = await getUserBrand(userId);
  if (!brand) return undefined;
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(
      and(
        eq(campaignsTable.id, campaignId),
        eq(campaignsTable.brandId, brand.id),
      ),
    );
  return campaign;
}

async function getUserCreative(userId: string, creativeId: string) {
  const brand = await getUserBrand(userId);
  if (!brand) return undefined;
  const [creative] = await db
    .select({ creative: creativesTable })
    .from(creativesTable)
    .innerJoin(
      campaignsTable,
      eq(creativesTable.campaignId, campaignsTable.id),
    )
    .where(
      and(
        eq(creativesTable.id, creativeId),
        eq(campaignsTable.brandId, brand.id),
      ),
    );
  return creative?.creative;
}

async function seedDemoData() {
  const [existingBrand] = await db
    .select({ id: brandsTable.id })
    .from(brandsTable)
    .where(eq(brandsTable.id, DEMO_BRAND_ID))
    .limit(1);
  if (existingBrand) return;

  const timestamp = now();
  await db.insert(brandsTable).values({
    id: DEMO_BRAND_ID,
    ownerId: null,
    name: "KORA Coffee",
    website: "https://kora.coffee",
    description:
      "Fresh specialty coffee delivered weekly, roasted with care for people who want a better ritual without another errand.",
    industry: "Specialty coffee",
    audience:
      "Young professionals in Nairobi who love specialty coffee but do not have time to visit coffee shops.",
    personality: ["Warm", "Thoughtful", "Confident", "Grounded"],
    visualStyle: "Editorial warmth with tactile product moments",
    typography: "Söhne for utility, Canela for expressive headlines",
    primaryColor: "#17352B",
    secondaryColors: ["#F3ECDD", "#D8A95B", "#7A4B32"],
    accentColor: "#D6F34A",
    logoPath: null,
    isDemo: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.insert(brandAssetsTable).values(
    [
      ["KORA wordmark", "logo", demoImages[0], ["logo", "primary"]],
      ["Morning ritual", "lifestyle", demoImages[1], ["coffee", "lifestyle"]],
      ["Roasted close-up", "product", demoImages[2], ["product", "texture"]],
      ["Coffee shop light", "reference", demoImages[3], ["light", "editorial"]],
    ].map(([name, type, previewUrl, tags], index) => ({
      id: `asset-kora-${index + 1}`,
      brandId: DEMO_BRAND_ID,
      name: String(name),
      type: String(type),
      objectPath: null,
      previewUrl: String(previewUrl),
      tags: tags as string[],
      isFavorite: index === 0,
      isDemo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );

  await db.insert(campaignsTable).values({
    id: DEMO_CAMPAIGN_ID,
    brandId: DEMO_BRAND_ID,
    name: "The Monday Reset",
    productName: "KORA Weekly Coffee",
    description: "Freshly roasted specialty coffee delivered every Monday morning.",
    productUrl: "https://kora.coffee/weekly",
    benefits: ["Freshly roasted", "Ethically sourced", "Flexible delivery"],
    price: "$22 / week",
    offer: "First two deliveries 20% off",
    cta: "Start your ritual",
    audience: "Young professionals who want premium coffee without another errand.",
    ageRange: "25–38",
    location: "Nairobi",
    interests: ["Design", "Music", "Independent food", "Slow mornings"],
    painPoints: ["Rushed mornings", "Inconsistent coffee", "No time for café runs"],
    desires: ["A better ritual", "Small luxuries", "Reliability"],
    objective: "Sales",
    platform: "Instagram",
    format: "Static",
    aspectRatio: "4:5",
    status: "ready",
    isDemo: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const concepts = [
    {
      id: "concept-morning-reset",
      name: "Morning Reset",
      family: "Lifestyle",
      angle: "Turn an ordinary morning into a premium ritual.",
      visualDirection: "Editorial kitchen light, tactile ceramic, product in foreground.",
      hook: "Your morning deserves better.",
      headline: "Fresh coffee. Every Monday.",
      bodyCopy: "Specialty coffee roasted fresh and delivered every week.",
      cta: "Start your ritual",
      composition: "Product foreground, human gesture in background, open space for copy.",
      colorDirection: "Warm cream, roasted brown, KORA green.",
      emotion: "Anticipation",
      audienceInsight: "A small ritual makes a rushed week feel intentional.",
    },
    {
      id: "concept-no-cafe-run",
      name: "No Café Run",
      family: "Problem → Solution",
      angle: "Make convenience feel like a creative advantage, not a compromise.",
      visualDirection: "Split morning scene: commute pace outside, calm pour inside.",
      hook: "Good coffee should meet you halfway.",
      headline: "The café comes to you.",
      bodyCopy: "Ethically sourced beans, freshly roasted, ready for your week.",
      cta: "Build your box",
      composition: "A diagonal split moves from morning rush to considered ritual.",
      colorDirection: "Deep green against bright morning cream.",
      emotion: "Relief",
      audienceInsight: "People want the quality of a café without the logistics.",
    },
    {
      id: "concept-roast-not-rush",
      name: "Roast, Not Rush",
      family: "Pattern Interrupt",
      angle: "Use a quiet visual counterpoint to the speed of modern mornings.",
      visualDirection: "Macro roast texture with a single confident line of type.",
      hook: "Slow down the first cup.",
      headline: "Roasted for the pause.",
      bodyCopy: "KORA brings a better pace to every Monday.",
      cta: "Meet your next roast",
      composition: "Oversized type, close crop, one product detail as visual anchor.",
      colorDirection: "Cocoa, chartreuse, matte black.",
      emotion: "Calm",
      audienceInsight: "A memorable brand can give permission to pause.",
    },
    {
      id: "concept-proof-in-the-cup",
      name: "Proof in the Cup",
      family: "Social Proof",
      angle: "Make the delivery promise credible through the ritual it enables.",
      visualDirection: "Handwritten notes, product details, and a real morning table.",
      hook: "The weekly habit people keep.",
      headline: "Your best Monday decision.",
      bodyCopy: "Join thousands of thoughtful coffee drinkers building a better ritual.",
      cta: "Try KORA",
      composition: "Product centered with proof points orbiting the cup.",
      colorDirection: "Paper, green ink, roasted caramel.",
      emotion: "Belonging",
      audienceInsight: "Social proof works best when it feels like a shared habit.",
    },
  ];
  await db.insert(creativeConceptsTable).values(
    concepts.map((concept) => ({
      ...concept,
      campaignId: DEMO_CAMPAIGN_ID,
      creativeCount: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );

  const creatives = concepts.flatMap((concept, conceptIndex) =>
    Array.from({ length: 3 }, (_, index) => ({
      id: `creative-kora-${conceptIndex + 1}-${index + 1}`,
      campaignId: DEMO_CAMPAIGN_ID,
      conceptId: concept.id,
      conceptName: concept.name,
      family: concept.family,
      hook: concept.hook,
      headline:
        index === 0
          ? concept.headline
          : index === 1
            ? concept.headline.replace(".", " — every week.")
            : concept.headline.replace(".", " Start here."),
      bodyCopy: concept.bodyCopy,
      cta: concept.cta,
      previewUrl: demoImages[(conceptIndex + index) % demoImages.length],
      platform: "Instagram",
      format: "Static",
      aspectRatio: "4:5",
      emotionalDriver: concept.emotion,
      creativeAngle: concept.angle,
      audienceInsight: concept.audienceInsight,
      readinessScore: 92 + ((conceptIndex + index) % 6),
      isFavorite: conceptIndex === 0 && index === 0,
      isDemo: true,
      status: "ready",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
}

async function ensureDemoData() {
  seedPromise ??= seedDemoData().catch((error) => {
    seedPromise = undefined;
    throw error;
  });
  await seedPromise;
}

async function generateConcepts(userId: string, campaignId: string) {
  const campaign = await getUserCampaign(userId, campaignId);
  if (!campaign) return [];

  const existing = await db
    .select()
    .from(creativeConceptsTable)
    .where(eq(creativeConceptsTable.campaignId, campaignId));
  if (existing.length) return existing;

  const timestamp = now();
  const families = [
    ["Problem → Solution", "Show the audience tension, then make the product the obvious relief."],
    ["Product Hero", "Let the product carry the visual with a confident, premium treatment."],
    ["Pattern Interrupt", "Break the scroll with a surprising visual idea that still feels on-brand."],
    ["Editorial", "Use considered typography, texture, and negative space to signal taste."],
  ];
  const generated = families.map(([family, angle], index) => ({
    id: randomUUID(),
    campaignId,
    name: `${campaign.productName} / ${family}`,
    family,
    angle,
    visualDirection: `${campaign.productName} in a ${campaign.platform} native scene with deliberate brand composition.`,
    hook: index === 0 ? "Make the next week feel easier." : `A better ${campaign.productName.toLowerCase()} ritual.`,
    headline: index === 0 ? "Better coffee. Less effort." : `Your ${campaign.productName} moment.`,
    bodyCopy: `${campaign.description} ${campaign.benefits.slice(0, 2).join(" and ")}.`,
    cta: campaign.cta,
    composition: "One clear focal point, generous safe margins, copy kept legible.",
    colorDirection: "Brand primary with a warm neutral field and a single electric accent.",
    emotion: ["Relief", "Desire", "Curiosity", "Confidence"][index],
    audienceInsight: campaign.audience,
    creativeCount: 3,
    createdAt: now(),
    updatedAt: timestamp,
  }));
  await db.insert(creativeConceptsTable).values(generated);
  return generated;
}

router.use(requireAuth);

router.get("/dashboard", async (req, res) => {
  await ensureDemoData();
  const brand = await getUserBrand(getAuth(req).userId!);
  const brandId = brand?.id;
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(brandId ? eq(campaignsTable.brandId, brandId) : undefined)
    .orderBy(desc(campaignsTable.createdAt))
    .limit(4);
  const creatives = await db
    .select()
    .from(creativesTable)
    .where(
      brandId
        ? inArray(
            creativesTable.campaignId,
            db
              .select({ id: campaignsTable.id })
              .from(campaignsTable)
              .where(eq(campaignsTable.brandId, brandId)),
          )
        : undefined,
    )
    .orderBy(desc(creativesTable.createdAt))
    .limit(8);
  const [campaignCount] = await db
    .select({ total: count() })
    .from(campaignsTable)
    .where(brandId ? eq(campaignsTable.brandId, brandId) : undefined);
  const [creativeCount] = await db
    .select({ total: count() })
    .from(creativesTable)
    .where(
      brandId
        ? inArray(
            creativesTable.campaignId,
            db
              .select({ id: campaignsTable.id })
              .from(campaignsTable)
              .where(eq(campaignsTable.brandId, brandId)),
          )
        : undefined,
    );
  const [savedCount] = await db
    .select({ total: count() })
    .from(creativesTable)
    .where(
      and(
        eq(creativesTable.isFavorite, true),
        brandId
          ? inArray(
              creativesTable.campaignId,
              db
                .select({ id: campaignsTable.id })
                .from(campaignsTable)
                .where(eq(campaignsTable.brandId, brandId)),
            )
          : undefined,
      ),
    );
  const payload = {
    brandHealth: 94,
    creditsRemaining: 124,
    activeCampaigns: Number(campaignCount?.total ?? 0),
    generatedCreatives: Number(creativeCount?.total ?? 0),
    savedCreatives: Number(savedCount?.total ?? 0),
    recentCampaigns: campaigns,
    recentCreatives: creatives,
    activity: [
      { id: "activity-1", label: "Brand DNA refreshed", detail: `${brand?.name ?? "KORA Coffee"} is ready for new work.`, timestamp: "Today, 09:42", type: "brand" },
      { id: "activity-2", label: "12 creatives generated", detail: "The Monday Reset is ready in Creative Lab.", timestamp: "Yesterday, 16:18", type: "creative" },
      { id: "activity-3", label: "New direction saved", detail: "Morning Reset marked as a favorite.", timestamp: "Yesterday, 15:56", type: "save" },
    ],
  };
  res.json(GetDashboardResponse.parse(payload));
});

router.get("/brands/current", async (req, res) => {
  await ensureDemoData();
  const brand = await getUserBrand(getAuth(req).userId!);
  res.json(GetCurrentBrandResponse.parse(brand));
});

router.post("/brands/current", async (req, res) => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid brand details." });
    return;
  }
  const timestamp = now();
  const brand = { id: randomUUID(), ownerId: getAuth(req).userId!, ...parsed.data, logoPath: parsed.data.logoPath ?? null, isDemo: false, createdAt: timestamp, updatedAt: timestamp };
  await db.insert(brandsTable).values(brand);
  res.status(201).json(CreateBrandResponse.parse(brand));
});

router.patch("/brands/current", async (req, res) => {
  const current = await getUserBrand(getAuth(req).userId!);
  if (!current) {
    res.status(404).json({ error: "Brand not found." });
    return;
  }
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid brand details." });
    return;
  }
  if (current.isDemo) {
    res.status(403).json({ error: "Create your own brand before editing the demo workspace." });
    return;
  }
  const [updated] = await db.update(brandsTable).set({ ...parsed.data, updatedAt: now() }).where(and(eq(brandsTable.id, current.id), eq(brandsTable.ownerId, getAuth(req).userId!))).returning();
  res.json(GetCurrentBrandResponse.parse(updated));
});

router.get("/brands/assets", async (req, res) => {
  await ensureDemoData();
  const brand = await getUserBrand(getAuth(req).userId!);
  const assets = brand ? await db.select().from(brandAssetsTable).where(eq(brandAssetsTable.brandId, brand.id)).orderBy(desc(brandAssetsTable.createdAt)) : [];
  res.json(ListBrandAssetsResponse.parse(assets));
});

router.post("/brands/assets", async (req, res) => {
  const parsed = CreateBrandAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid asset details." });
    return;
  }
  const brand = await getUserBrand(getAuth(req).userId!);
  if (!brand) {
    res.status(404).json({ error: "Create a brand first." });
    return;
  }
  if (brand.isDemo) {
    res.status(403).json({ error: "Create your own brand before adding assets." });
    return;
  }
  const asset = { id: randomUUID(), brandId: brand.id, ...parsed.data, objectPath: parsed.data.objectPath ?? null, tags: parsed.data.tags ?? [], isFavorite: false, isDemo: false, createdAt: now(), updatedAt: now() };
  await db.insert(brandAssetsTable).values(asset);
  res.status(201).json(CreateBrandAssetResponse.parse(asset));
});

router.delete("/brands/assets/:assetId", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  if (!brand || brand.isDemo) {
    res.status(403).json({ error: "Create your own brand before managing assets." });
    return;
  }
  await db.delete(brandAssetsTable).where(and(eq(brandAssetsTable.id, req.params.assetId), eq(brandAssetsTable.brandId, brand.id)));
  res.status(204).send();
});

router.get("/campaigns", async (req, res) => {
  await ensureDemoData();
  const brand = await getUserBrand(getAuth(req).userId!);
  const campaigns = await db.select().from(campaignsTable).where(brand ? eq(campaignsTable.brandId, brand.id) : undefined).orderBy(desc(campaignsTable.createdAt));
  res.json(ListCampaignsResponse.parse(campaigns));
});

router.post("/campaigns", async (req, res) => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Complete the campaign brief before saving." });
    return;
  }
  const brand = await getUserBrand(getAuth(req).userId!);
  if (!brand) {
    res.status(404).json({ error: "Create a brand first." });
    return;
  }
  if (brand.isDemo) {
    res.status(403).json({ error: "Create your own brand before creating campaigns." });
    return;
  }
  const timestamp = now();
  const campaign = { id: randomUUID(), brandId: brand.id, ...parsed.data, price: parsed.data.price ?? null, offer: parsed.data.offer ?? null, benefits: parsed.data.benefits ?? [], interests: parsed.data.interests ?? [], painPoints: parsed.data.painPoints ?? [], desires: parsed.data.desires ?? [], status: "draft", isDemo: false, createdAt: timestamp, updatedAt: timestamp };
  await db.insert(campaignsTable).values(campaign);
  res.status(201).json(CreateCampaignResponse.parse(campaign));
});

router.get("/campaigns/:campaignId", async (req, res) => {
  const parsed = GetCampaignParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid campaign." });
    return;
  }
  const campaign = await getUserCampaign(getAuth(req).userId!, parsed.data.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  res.json(GetCampaignResponse.parse(campaign));
});

router.get("/campaigns/:campaignId/concepts", async (req, res) => {
  const concepts = await generateConcepts(getAuth(req).userId!, req.params.campaignId);
  res.json(ListCampaignConceptsResponse.parse(concepts));
});

router.post("/campaigns/:campaignId/concepts", async (req, res) => {
  const campaign = await getUserCampaign(getAuth(req).userId!, req.params.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  if (campaign.isDemo) {
    res.status(403).json({ error: "Create your own campaign before generating concepts." });
    return;
  }
  const concepts = await generateConcepts(getAuth(req).userId!, campaign.id);
  res.status(201).json(GenerateCampaignConceptsResponse.parse(concepts));
});

router.get("/creatives", async (req, res) => {
  await ensureDemoData();
  const parsed = ListCreativesQueryParams.safeParse(req.query);
  const brand = await getUserBrand(getAuth(req).userId!);
  const campaignFilter = parsed.success && parsed.data.campaignId
    ? and(eq(campaignsTable.brandId, brand?.id ?? ''), eq(campaignsTable.id, parsed.data.campaignId))
    : brand ? eq(campaignsTable.brandId, brand.id) : undefined;
  const creatives: Array<{ creative: any }> = await db
    .select({ creative: creativesTable })
    .from(creativesTable)
    .innerJoin(campaignsTable, eq(creativesTable.campaignId, campaignsTable.id))
    .where(campaignFilter)
    .orderBy(desc(creativesTable.createdAt));
  res.json(ListCreativesResponse.parse(creatives.map(({ creative }) => creative)));
});

router.post("/creatives/generate", async (req, res) => {
  const parsed = GenerateCreativesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a campaign before generating creatives." });
    return;
  }
  const campaign = await getUserCampaign(getAuth(req).userId!, parsed.data.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  if (campaign.isDemo) {
    res.status(403).json({ error: "Create your own campaign before generating creatives." });
    return;
  }
  const concepts = await generateConcepts(getAuth(req).userId!, campaign.id);
  const selected: any[] = parsed.data.conceptIds?.length
    ? concepts.filter((concept: any) => parsed.data.conceptIds?.includes(concept.id))
    : concepts;
  const imageOffset = Math.floor(Math.random() * demoImages.length);
  const countToCreate = Math.min(parsed.data.count ?? selected.length * 3, 12);
  const timestamp = now();
  const values = Array.from({ length: countToCreate }, (_, index: number) => {
    const concept = selected[index % Math.max(selected.length, 1)] ?? concepts[0];
    return {
      id: randomUUID(),
      campaignId: campaign.id,
      conceptId: concept.id,
      conceptName: concept.name,
      family: concept.family,
      hook: concept.hook,
      headline: index % 3 === 1 ? `${concept.headline} Start here.` : concept.headline,
      bodyCopy: concept.bodyCopy,
      cta: concept.cta,
      previewUrl: demoImages[(imageOffset + index) % demoImages.length],
      platform: campaign.platform,
      format: campaign.format,
      aspectRatio: campaign.aspectRatio,
      emotionalDriver: concept.emotion,
      creativeAngle: concept.angle,
      audienceInsight: concept.audienceInsight,
      readinessScore: 91 + (index % 7),
      isFavorite: false,
      isDemo: false,
      status: "ready",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  if (process.env.REPLICATE_API_TOKEN) {
    for (const value of values) {
      const concept = selected.find((item: { id: string }) => item.id === value.conceptId);
      const generatedImage = await generateAndStoreReplicateImage({
        prompt: `${concept?.visualDirection ?? value.creativeAngle}. ${value.headline}. ${value.bodyCopy}. No text in image.`,
        aspectRatio: value.aspectRatio,
      });
      value.previewUrl = generatedImage.previewUrl;
    }
  }
  await db.insert(creativesTable).values(values);
  res.status(201).json(GenerateCreativesResponse.parse(values));
});

router.get("/creatives/:creativeId", async (req, res) => {
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  res.json(GetCreativeResponse.parse(creative));
});

router.patch("/creatives/:creativeId", async (req, res) => {
  const params = UpdateCreativeParams.safeParse(req.params);
  const body = UpdateCreativeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid creative update." });
    return;
  }
  const current = await getUserCreative(getAuth(req).userId!, params.data.creativeId);
  if (!current) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  if (current.isDemo) {
    res.status(403).json({ error: "Create your own creative before editing it." });
    return;
  }
  const [updated] = await db.update(creativesTable).set({ ...body.data, updatedAt: now() }).where(eq(creativesTable.id, current.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  res.json(UpdateCreativeResponse.parse(updated));
});

router.get("/creatives/:creativeId/variations", async (req, res) => {
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  if (creative.isDemo) {
    res.status(403).json({ error: "Create your own creative before generating variations." });
    return;
  }
  const variations = await db.select().from(creativeVariationsTable).where(eq(creativeVariationsTable.creativeId, creative.id)).orderBy(desc(creativeVariationsTable.createdAt));
  res.json(ListCreativeVariationsResponse.parse(variations));
});

router.post("/creatives/:creativeId/variations", async (req, res) => {
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  const options: Array<[string, string, string, string]> = [
    ["Hook", "Upgrade your morning.", creative.headline, creative.cta],
    ["Headline", "Coffee worth waking up for.", creative.headline, creative.cta],
    ["CTA", creative.hook, creative.headline, "Try KORA today"],
  ];
  const variations = options.map(([dimension, label, headline, cta]: [string, string, string, string], index: number) => ({
    id: randomUUID(),
    creativeId: creative.id,
    dimension,
    label,
    headline,
    bodyCopy: creative.bodyCopy,
    cta,
    previewUrl: demoImages[(index + 2) % demoImages.length],
    readinessScore: 90 + index,
    createdAt: now(),
    updatedAt: now(),
  }));
  await db.insert(creativeVariationsTable).values(variations);
  res.status(201).json(GenerateCreativeVariationsResponse.parse(variations));
});

router.get("/creative-intelligence", async (_req, res) => {
  res.json(
    GetCreativeIntelligenceResponse.parse({
      isSampleData: true,
      totalImpressions: 184200,
      averageCtr: 3.8,
      conversionRate: 1.9,
      winningFamily: "Lifestyle",
      winningHook: "Your morning deserves better.",
      familyPerformance: [
        { label: "Lifestyle", value: 4.8, secondaryValue: 1.9 },
        { label: "Problem → Solution", value: 3.9, secondaryValue: 1.6 },
        { label: "Pattern Interrupt", value: 3.4, secondaryValue: 1.3 },
        { label: "Social Proof", value: 2.9, secondaryValue: 1.1 },
      ],
      weeklyPerformance: [
        { label: "Mon", value: 2.4, secondaryValue: 1.2 },
        { label: "Tue", value: 3.1, secondaryValue: 1.5 },
        { label: "Wed", value: 3.6, secondaryValue: 1.8 },
        { label: "Thu", value: 4.2, secondaryValue: 2.1 },
        { label: "Fri", value: 4.8, secondaryValue: 2.5 },
        { label: "Sat", value: 4.1, secondaryValue: 2 },
        { label: "Sun", value: 3.8, secondaryValue: 1.9 },
      ],
      recommendations: [
        "Keep building around calm, ritual-led lifestyle scenes.",
        "Hooks that frame coffee as a weekly reset are outperforming offer-led copy.",
        "4:5 static placements are currently the strongest fit for this audience.",
      ],
    }),
  );
});

export default router;