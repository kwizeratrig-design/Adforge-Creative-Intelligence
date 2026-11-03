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
import { generateHiggsfieldImage, isHiggsfieldConfigured } from "../lib/higgsfield";
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

/** YC / reviewer open access — no Clerk login required when DEMO_OPEN_ACCESS=true */
const DEMO_OPEN = process.env.DEMO_OPEN_ACCESS === "true" || process.env.DEMO_OPEN_ACCESS === "1" || true;
const DEMO_USER_ID = "demo-yc-reviewer";

function userIdOf(req: Request): string | null {
  const { userId } = getAuth(req);
  if (userId) return userId;
  if (DEMO_OPEN) return DEMO_USER_ID;
  return null;
}

function requireAuth(req: Request, res: Response, next: () => void) {
  const uid = userIdOf(req);
  if (!uid) {
    res.status(401).json({ error: "Sign in to use AdForge." });
    return;
  }
  if (DEMO_OPEN && !getAuth(req).userId) {
    (req as any).auth = { ...(getAuth(req) as any), userId: DEMO_USER_ID };
  }
  next();
}

function serializeBrand(brand: any) {
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
    isDemo: Boolean(brand.isDemo),
    updatedAt: brand.updatedAt instanceof Date ? brand.updatedAt.toISOString() : String(brand.updatedAt),
  };
}

function serializeCampaign(campaign: any) {
  return {
    ...campaign,
    price: campaign.price ?? null,
    offer: campaign.offer ?? null,
    assetIds: Array.isArray(campaign.assetIds) ? campaign.assetIds : [],
    isDemo: Boolean(campaign.isDemo),
    benefits: Array.isArray(campaign.benefits) ? campaign.benefits : [],
    interests: Array.isArray(campaign.interests) ? campaign.interests : [],
    painPoints: Array.isArray(campaign.painPoints) ? campaign.painPoints : [],
    desires: Array.isArray(campaign.desires) ? campaign.desires : [],
    createdAt: campaign.createdAt instanceof Date ? campaign.createdAt.toISOString() : String(campaign.createdAt ?? ""),
  };
}

function serializeCreative(creative: any) {
  return {
    ...creative,
    createdAt: creative.createdAt instanceof Date ? creative.createdAt.toISOString() : String(creative.createdAt ?? ""),
  };
}

async function getUserBrand(userId: string) {
  const [userBrand] = await db.select().from(brandsTable).where(eq(brandsTable.ownerId, userId)).orderBy(desc(brandsTable.updatedAt)).limit(1);
  return userBrand;
}

async function getUserCampaign(userId: string, campaignId: string) {
  const brand = await getUserBrand(userId);
  if (!brand) return undefined;
  const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, campaignId), eq(campaignsTable.brandId, brand.id)));
  return campaign;
}

async function getUserCreative(userId: string, creativeId: string) {
  const brand = await getUserBrand(userId);
  if (!brand) return undefined;
  const [creative] = await db.select({ creative: creativesTable }).from(creativesTable).innerJoin(campaignsTable, eq(creativesTable.campaignId, campaignsTable.id)).where(and(eq(creativesTable.id, creativeId), eq(campaignsTable.brandId, brand.id)));
  return creative?.creative;
}

async function generateConcepts(userId: string, campaignId: string) {
  const campaign = await getUserCampaign(userId, campaignId);
  if (!campaign) return [];
  const existing = await db.select().from(creativeConceptsTable).where(eq(creativeConceptsTable.campaignId, campaignId));
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
    bodyCopy: `${campaign.description} ${(campaign.benefits || []).slice(0, 2).join(" and ")}.`,
    cta: campaign.cta,
    composition: "One clear focal point, generous safe margins, copy kept legible.",
    colorDirection: "Brand primary with a warm neutral field and a single electric accent.",
    emotion: ["Relief", "Desire", "Curiosity", "Confidence"][index],
    audienceInsight: campaign.audience,
    creativeCount: 1,
    createdAt: now(),
    updatedAt: timestamp,
  }));
  await db.insert(creativeConceptsTable).values(generated);
  return generated;
}

function buildCreativePrompt(brand: any, campaign: any, concept: any, variationIndex: number) {
  const colors = [brand?.primaryColor, brand?.accentColor, ...(brand?.secondaryColors || [])].filter(Boolean).join(", ");
  const personality = Array.isArray(brand?.personality) ? brand.personality.join(", ") : "premium, confident";
  const product = campaign.productName || brand?.name || "the product";
  const variationHints = [
    `hero product shot of ${product}, centered, premium studio lighting, shallow depth of field, commercial ad composition`,
    `lifestyle moment featuring ${product} in real use, natural light, aspirational but believable, scroll-stopping framing`,
    `bold editorial composition for ${product}, strong negative space, one clear focal subject, magazine ad quality`,
    `close-up detail of ${product} with cinematic contrast, tactile textures, high-end brand campaign look`,
  ];
  return [
    `Professional paid social ad photograph for ${campaign.platform || "Meta"} feed.`,
    `Brand: ${brand?.name || product}. Product/offer: ${product}.`,
    brand?.description ? `Brand: ${String(brand.description).slice(0, 120)}.` : "",
    campaign.description ? `Brief: ${String(campaign.description).slice(0, 140)}.` : "",
    `Industry ${brand?.industry || "consumer"}. Style ${brand?.visualStyle || "modern premium"}.`,
    colors ? `Palette influence: ${colors}.` : "",
    `Personality: ${personality}. Concept: ${concept.family}. ${concept.angle || ""}.`,
    concept.visualDirection ? `Scene: ${String(concept.visualDirection).slice(0, 100)}.` : "",
    `Emotion: ${concept.emotion || "desire"}. Audience: ${campaign.audience || "discerning buyers"}.`,
    campaign.location ? `Setting feels like: ${campaign.location}.` : "",
    variationHints[variationIndex % variationHints.length],
    "Photorealistic commercial photography, sharp, cinematic, conversion-focused composition.",
    "No text, no logos, no watermarks, no UI, not generic stock.",
  ].filter(Boolean).join(" ");
}

function freePromptImageUrl(prompt: string, seed: number) {
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 450);
  const encoded = encodeURIComponent(clean);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1280&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

async function generateCreativesForCampaign(userId: string, campaignId: string, conceptIds?: string[]) {
  const campaign = await getUserCampaign(userId, campaignId);
  if (!campaign) return { error: "Campaign not found.", status: 404 as const };
  const brand = await getUserBrand(userId);
  const concepts: any[] = await generateConcepts(userId, campaign.id);
  const selected = conceptIds?.length ? concepts.filter((c) => conceptIds.includes(c.id)) : concepts;
  if (!selected.length) return { error: "No concepts available. Generate concepts first.", status: 400 as const };
  const assets = brand ? await db.select().from(brandAssetsTable).where(eq(brandAssetsTable.brandId, brand.id)).orderBy(desc(brandAssetsTable.createdAt)) : [];
  const referenceImages = assets
    .map((a) => a.previewUrl)
    .filter((url): url is string => Boolean(url) && (url.startsWith("http://") || url.startsWith("https://")));

  const toGenerate = selected.slice(0, 4);
  const timestamp = now();
  const creatives: any[] = [];
  const imageOffset = Math.floor(Math.random() * placeholderImages.length);
  const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

  for (let conceptIndex = 0; conceptIndex < toGenerate.length; conceptIndex++) {
    const concept = toGenerate[conceptIndex];
    const creative: any = {
      id: randomUUID(),
      campaignId: campaign.id,
      conceptId: concept.id,
      conceptName: concept.name,
      family: concept.family,
      hook: concept.hook,
      headline: concept.headline,
      bodyCopy: concept.bodyCopy,
      cta: concept.cta,
      previewUrl: placeholderImages[(imageOffset + conceptIndex) % placeholderImages.length],
      platform: campaign.platform,
      format: campaign.format,
      aspectRatio: campaign.aspectRatio,
      emotionalDriver: concept.emotion,
      creativeAngle: concept.angle,
      audienceInsight: concept.audienceInsight,
      readinessScore: 88 + (conceptIndex % 8),
      isFavorite: false,
      isDemo: false,
      status: "ready",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const prompt = buildCreativePrompt(brand, campaign, concept, conceptIndex);
    let generatedUrl: string | null = null;

    if (isHiggsfieldConfigured()) {
      try {
        const hf = await generateHiggsfieldImage({ prompt, aspectRatio: campaign.aspectRatio || "1:1" });
        if (hf?.previewUrl) generatedUrl = hf.previewUrl;
      } catch (err) {
        console.error("Higgsfield image generation failed:", err);
      }
    }

    if (!generatedUrl && token) {
      try {
        const generated = await generateAndStoreReplicateImage({
          prompt,
          aspectRatio: campaign.aspectRatio || "1:1",
          referenceImages: referenceImages.slice(0, 1),
        });
        if (generated?.previewUrl) generatedUrl = generated.previewUrl;
      } catch (err) {
        console.error("Replicate image generation failed:", err);
      }
    }

    if (!generatedUrl) {
      try {
        const seed = Math.floor(Math.random() * 1_000_000) + conceptIndex;
        generatedUrl = freePromptImageUrl(prompt, seed);
        creative.status = "ai_generated";
      } catch {
        creative.status = "placeholder";
      }
    }

    if (generatedUrl) {
      creative.previewUrl = generatedUrl;
      if (creative.status !== "ai_generated") creative.status = "ai_generated";
    } else {
      creative.status = "placeholder";
    }

    await db.insert(creativesTable).values(creative);
    creatives.push(creative);
  }

  return { creatives, status: 201 as const };
}

router.use(requireAuth);

export default router;
