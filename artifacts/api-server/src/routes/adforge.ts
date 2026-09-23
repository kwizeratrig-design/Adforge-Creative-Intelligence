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
const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1634942537034-2531766767d1?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1626785774573-4b7993143464?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1611162617474-5b21e11e480f?auto=format&fit=crop&w=1200&q=85",
];

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

function serializeBrand(brand: {
  id: string;
  name: string;
  website: string;
  description: string;
  industry: string;
  audience: string;
  personality: string[];
  visualStyle: string;
  typography: string;
  primaryColor: string;
  secondaryColors: string[];
  accentColor: string;
  logoPath: string | null;
  isDemo: boolean;
  updatedAt: Date | string;
}) {
  return {
    id: brand.id,
    name: brand.name,
    website: brand.website,
    description: brand.description,
    industry: brand.industry,
    audience: brand.audience,
    personality: brand.personality,
    visualStyle: brand.visualStyle,
    typography: brand.typography,
    primaryColor: brand.primaryColor,
    secondaryColors: brand.secondaryColors,
    accentColor: brand.accentColor,
    logoPath: brand.logoPath ?? null,
    isDemo: brand.isDemo,
    updatedAt: brand.updatedAt instanceof Date ? brand.updatedAt.toISOString() : String(brand.updatedAt),
  };
}

async function getUserBrand(userId: string) {
  const [userBrand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.ownerId, userId))
    .orderBy(desc(brandsTable.updatedAt))
    .limit(1);
  return userBrand;
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
    hook: index === 0 ? "Make the next week feel easier." : `A better way to experience ${campaign.productName}.`,
    headline: index === 0 ? "Better results. Less guesswork." : `Your ${campaign.productName} moment.`,
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
    brandHealth: brand ? 94 : 0,
    creditsRemaining: 124,
    activeCampaigns: Number(campaignCount?.total ?? 0),
    generatedCreatives: Number(creativeCount?.total ?? 0),
    savedCreatives: Number(savedCount?.total ?? 0),
    recentCampaigns: campaigns,
    recentCreatives: creatives,
    activity: brand
      ? [
          {
            id: "activity-1",
            label: "Brand ready",
            detail: `${brand.name} is ready for new work.`,
            timestamp: "Today",
            type: "brand",
          },
        ]
      : [
          {
            id: "activity-1",
            label: "Create your brand",
            detail: "Set up Brand DNA to start generating creatives.",
            timestamp: "Now",
            type: "brand",
          },
        ],
  };
  res.json(GetDashboardResponse.parse(payload));
});

router.get("/brands/current", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  if (!brand) {
    res.json(null);
    return;
  }
  res.json(GetCurrentBrandResponse.parse(serializeBrand(brand)));
});

router.post("/brands/current", async (req, res) => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid brand details.", details: parsed.error.flatten() });
    return;
  }
  const timestamp = now();
  const brand = {
    id: randomUUID(),
    ownerId: getAuth(req).userId!,
    ...parsed.data,
    logoPath: parsed.data.logoPath ?? null,
    isDemo: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(brandsTable).values(brand);
  res.status(201).json(CreateBrandResponse.parse(serializeBrand(brand)));
});

router.patch("/brands/current", async (req, res) => {
  const current = await getUserBrand(getAuth(req).userId!);
  if (!current) {
    res.status(404).json({ error: "Brand not found. Create your brand first." });
    return;
  }
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid brand details.", details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(brandsTable)
    .set({ ...parsed.data, updatedAt: now() })
    .where(and(eq(brandsTable.id, current.id), eq(brandsTable.ownerId, getAuth(req).userId!)))
    .returning();
  res.json(GetCurrentBrandResponse.parse(serializeBrand(updated)));
});

router.get("/brands/assets", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  const assets = brand
    ? await db
        .select()
        .from(brandAssetsTable)
        .where(eq(brandAssetsTable.brandId, brand.id))
        .orderBy(desc(brandAssetsTable.createdAt))
    : [];
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
  const asset = {
    id: randomUUID(),
    brandId: brand.id,
    ...parsed.data,
    objectPath: parsed.data.objectPath ?? null,
    tags: parsed.data.tags ?? [],
    isFavorite: false,
    isDemo: false,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(brandAssetsTable).values(asset);
  res.status(201).json(CreateBrandAssetResponse.parse(asset));
});

router.delete("/brands/assets/:assetId", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  if (!brand) {
    res.status(403).json({ error: "Create a brand first." });
    return;
  }
  await db
    .delete(brandAssetsTable)
    .where(and(eq(brandAssetsTable.id, req.params.assetId), eq(brandAssetsTable.brandId, brand.id)));
  res.status(204).send();
});

router.get("/campaigns", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  const campaigns = brand
    ? await db
        .select()
        .from(campaignsTable)
        .where(eq(campaignsTable.brandId, brand.id))
        .orderBy(desc(campaignsTable.createdAt))
    : [];
  res.json(ListCampaignsResponse.parse(campaigns));
});

router.post("/campaigns", async (req, res) => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid campaign details.",
      details: parsed.error.flatten(),
    });
    return;
  }
  let brand = await getUserBrand(getAuth(req).userId!);
  if (!brand) {
    const timestamp = now();
    const userId = getAuth(req).userId!;
    brand = {
      id: randomUUID(),
      ownerId: userId,
      name: parsed.data.productName || parsed.data.name || "My Brand",
      website: parsed.data.productUrl || "https://example.com",
      description: parsed.data.description || "Brand created with first campaign.",
      industry: "General",
      audience: parsed.data.audience || "General audience",
      personality: ["Confident"],
      visualStyle: "Modern",
      typography: "Clean sans",
      primaryColor: "#17352B",
      secondaryColors: ["#F3ECDD"],
      accentColor: "#D6F34A",
      logoPath: null,
      isDemo: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(brandsTable).values(brand);
  }
  const timestamp = now();
  const campaign = {
    id: randomUUID(),
    brandId: brand.id,
    ...parsed.data,
    price: parsed.data.price ?? null,
    offer: parsed.data.offer ?? null,
    benefits: parsed.data.benefits ?? [],
    interests: parsed.data.interests ?? [],
    painPoints: parsed.data.painPoints ?? [],
    desires: parsed.data.desires ?? [],
    status: "draft",
    isDemo: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(campaignsTable).values(campaign);
  res.status(201).json(
    CreateCampaignResponse.parse({
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
    }),
  );
});

router.get("/campaigns/:campaignId", async (req, res) => {
  const campaign = await getUserCampaign(getAuth(req).userId!, req.params.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  res.json(GetCampaignResponse.parse(campaign));
});

router.get("/campaigns/:campaignId/concepts", async (req, res) => {
  const campaign = await getUserCampaign(getAuth(req).userId!, req.params.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  const concepts = await generateConcepts(getAuth(req).userId!, campaign.id);
  res.json(ListCampaignConceptsResponse.parse(concepts));
});

router.post("/campaigns/:campaignId/concepts/generate", async (req, res) => {
  const campaign = await getUserCampaign(getAuth(req).userId!, req.params.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  await db.delete(creativeConceptsTable).where(eq(creativeConceptsTable.campaignId, campaign.id));
  const concepts = await generateConcepts(getAuth(req).userId!, campaign.id);
  res.json(GenerateCampaignConceptsResponse.parse(concepts));
});

router.post("/campaigns/:campaignId/creatives/generate", async (req, res) => {
  const campaign = await getUserCampaign(getAuth(req).userId!, req.params.campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  const concepts = await generateConcepts(getAuth(req).userId!, campaign.id);
  const timestamp = now();
  const imageOffset = Math.floor(Math.random() * placeholderImages.length);
  const creatives = concepts.flatMap((concept, conceptIndex) =>
    Array.from({ length: 3 }, (_, index) => ({
      id: randomUUID(),
      campaignId: campaign.id,
      conceptId: concept.id,
      conceptName: concept.name,
      family: concept.family,
      hook: concept.hook,
      headline: concept.headline,
      bodyCopy: concept.bodyCopy,
      cta: concept.cta,
      previewUrl: placeholderImages[(imageOffset + conceptIndex + index) % placeholderImages.length],
      platform: campaign.platform,
      format: campaign.format,
      aspectRatio: campaign.aspectRatio,
      emotionalDriver: concept.emotion,
      creativeAngle: concept.angle,
      audienceInsight: concept.audienceInsight,
      readinessScore: 88 + ((conceptIndex + index) % 8),
      isFavorite: false,
      isDemo: false,
      status: "ready",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
  if (creatives.length) {
    await db.insert(creativesTable).values(creatives);
  }
  res.status(201).json(GenerateCreativesResponse.parse(creatives));
});

router.get("/creatives", async (req, res) => {
  const brand = await getUserBrand(getAuth(req).userId!);
  const query = ListCreativesQueryParams.safeParse(req.query);
  const campaignId = query.success ? query.data.campaignId : undefined;
  const creatives = brand
    ? await db
        .select()
        .from(creativesTable)
        .where(
          campaignId
            ? eq(creativesTable.campaignId, campaignId)
            : inArray(
                creativesTable.campaignId,
                db
                  .select({ id: campaignsTable.id })
                  .from(campaignsTable)
                  .where(eq(campaignsTable.brandId, brand.id)),
              ),
        )
        .orderBy(desc(creativesTable.createdAt))
    : [];
  res.json(ListCreativesResponse.parse(creatives));
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
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  const parsed = UpdateCreativeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid creative update." });
    return;
  }
  const [updated] = await db
    .update(creativesTable)
    .set({ ...parsed.data, updatedAt: now() })
    .where(eq(creativesTable.id, creative.id))
    .returning();
  res.json(UpdateCreativeResponse.parse(updated));
});

router.get("/creatives/:creativeId/variations", async (req, res) => {
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  const variations = await db
    .select()
    .from(creativeVariationsTable)
    .where(eq(creativeVariationsTable.creativeId, creative.id))
    .orderBy(desc(creativeVariationsTable.createdAt));
  res.json(ListCreativeVariationsResponse.parse(variations));
});

router.post("/creatives/:creativeId/variations", async (req, res) => {
  const creative = await getUserCreative(getAuth(req).userId!, req.params.creativeId);
  if (!creative) {
    res.status(404).json({ error: "Creative not found." });
    return;
  }
  const options: Array<[string, string, string, string]> = [
    ["Hook", creative.hook, creative.headline, creative.cta],
    ["Headline", creative.headline, creative.headline, creative.cta],
    ["CTA", creative.hook, creative.headline, creative.cta || "Learn more"],
  ];
  const variations = options.map(([dimension, label, headline, cta], index) => ({
    id: randomUUID(),
    creativeId: creative.id,
    dimension,
    label,
    headline,
    bodyCopy: creative.bodyCopy,
    cta,
    previewUrl: placeholderImages[(index + 2) % placeholderImages.length],
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
      totalImpressions: 0,
      averageCtr: 0,
      conversionRate: 0,
      winningFamily: "—",
      winningHook: "Generate creatives to unlock performance insights.",
      familyPerformance: [],
      weeklyPerformance: [],
      recommendations: [
        "Create a brand and campaign to start generating ads.",
        "Generate creatives to populate performance signals.",
        "Use variations to test hooks, headlines, and CTAs.",
      ],
    }),
  );
});

export default router;
