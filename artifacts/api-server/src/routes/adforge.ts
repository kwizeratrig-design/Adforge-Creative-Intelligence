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

router.use(requireAuth);

router.get("/brands/current", async (req, res) => {
  try {
    const brand = await getUserBrand(getAuth(req).userId!);
    if (!brand) { res.json(null); return; }
    res.json(serializeBrand(brand));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load brand." });
  }
});

router.post("/brands/current", async (req, res) => {
  try {
    const parsed = CreateBrandBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid brand details.", details: parsed.error.flatten() });
      return;
    }
    const userId = getAuth(req).userId!;
    const data = {
      name: String(parsed.data.name || "").trim(),
      website: String(parsed.data.website || "").trim() || "https://example.com",
      description: String(parsed.data.description || "").trim() || "Brand",
      industry: String(parsed.data.industry || "").trim() || "General",
      audience: String(parsed.data.audience || "").trim() || "General audience",
      personality: Array.isArray(parsed.data.personality) && parsed.data.personality.length ? parsed.data.personality.map(String) : ["Bold"],
      visualStyle: String(parsed.data.visualStyle || "").trim() || "Modern",
      typography: String(parsed.data.typography || "").trim() || "Clean sans",
      primaryColor: String(parsed.data.primaryColor || "").trim() || "#17352B",
      secondaryColors: Array.isArray(parsed.data.secondaryColors) && parsed.data.secondaryColors.length ? parsed.data.secondaryColors.map(String) : ["#F3ECDD"],
      accentColor: String(parsed.data.accentColor || "").trim() || "#D6F34A",
      logoPath: parsed.data.logoPath ?? null,
    };
    if (!data.name) {
      res.status(400).json({ error: "Brand name is required." });
      return;
    }
    const existing = await getUserBrand(userId);
    const timestamp = now();
    if (existing) {
      const [updated] = await db.update(brandsTable).set({ ...data, updatedAt: timestamp }).where(and(eq(brandsTable.id, existing.id), eq(brandsTable.ownerId, userId))).returning();
      res.json(serializeBrand(updated));
      return;
    }
    const brand = { id: randomUUID(), ownerId: userId, ...data, isDemo: false, createdAt: timestamp, updatedAt: timestamp };
    await db.insert(brandsTable).values(brand);
    res.status(201).json(serializeBrand(brand));
  } catch (err: any) {
    console.error("Create brand failed:", err);
    res.status(500).json({ error: err?.message || "Failed to save brand." });
  }
});

router.patch("/brands/current", async (req, res) => {
  try {
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
    const data = {
      ...parsed.data,
      personality: Array.isArray(parsed.data.personality) && parsed.data.personality.length ? parsed.data.personality.map(String) : current.personality,
      secondaryColors: Array.isArray(parsed.data.secondaryColors) && parsed.data.secondaryColors.length ? parsed.data.secondaryColors.map(String) : current.secondaryColors,
      logoPath: parsed.data.logoPath ?? current.logoPath ?? null,
    };
    const [updated] = await db.update(brandsTable).set({ ...data, updatedAt: now() }).where(and(eq(brandsTable.id, current.id), eq(brandsTable.ownerId, getAuth(req).userId!))).returning();
    res.json(serializeBrand(updated));
  } catch (err: any) {
    console.error("Update brand failed:", err);
    res.status(500).json({ error: err?.message || "Failed to update brand." });
  }
});

export default router;
