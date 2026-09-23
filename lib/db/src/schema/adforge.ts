import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
};

export const brandsTable = pgTable("adforge_brands", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  website: text("website").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  audience: text("audience").notNull(),
  personality: jsonb("personality").$type<string[]>().notNull(),
  visualStyle: text("visual_style").notNull(),
  typography: text("typography").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColors: jsonb("secondary_colors").$type<string[]>().notNull(),
  accentColor: text("accent_color").notNull(),
  logoPath: text("logo_path"),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const brandAssetsTable = pgTable("adforge_brand_assets", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brandsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  objectPath: text("object_path"),
  previewUrl: text("preview_url").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const campaignsTable = pgTable("adforge_campaigns", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brandsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  productName: text("product_name").notNull(),
  description: text("description").notNull(),
  productUrl: text("product_url").notNull(),
  benefits: jsonb("benefits").$type<string[]>().notNull(),
  price: text("price"),
  offer: text("offer"),
  cta: text("cta").notNull(),
  audience: text("audience").notNull(),
  ageRange: text("age_range").notNull(),
  location: text("location").notNull(),
  interests: jsonb("interests").$type<string[]>().notNull(),
  painPoints: jsonb("pain_points").$type<string[]>().notNull(),
  desires: jsonb("desires").$type<string[]>().notNull(),
  objective: text("objective").notNull(),
  platform: text("platform").notNull(),
  format: text("format").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  assetIds: jsonb("asset_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const creativeConceptsTable = pgTable("adforge_creative_concepts", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaignsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  family: text("family").notNull(),
  angle: text("angle").notNull(),
  visualDirection: text("visual_direction").notNull(),
  hook: text("hook").notNull(),
  headline: text("headline").notNull(),
  bodyCopy: text("body_copy").notNull(),
  cta: text("cta").notNull(),
  composition: text("composition").notNull(),
  colorDirection: text("color_direction").notNull(),
  emotion: text("emotion").notNull(),
  audienceInsight: text("audience_insight").notNull(),
  creativeCount: integer("creative_count").notNull().default(3),
  ...timestamps,
});

export const creativesTable = pgTable("adforge_creatives", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaignsTable.id, { onDelete: "cascade" }),
  conceptId: text("concept_id")
    .notNull()
    .references(() => creativeConceptsTable.id, { onDelete: "cascade" }),
  conceptName: text("concept_name").notNull(),
  family: text("family").notNull(),
  hook: text("hook").notNull(),
  headline: text("headline").notNull(),
  bodyCopy: text("body_copy").notNull(),
  cta: text("cta").notNull(),
  previewUrl: text("preview_url").notNull(),
  platform: text("platform").notNull(),
  format: text("format").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  emotionalDriver: text("emotional_driver").notNull(),
  creativeAngle: text("creative_angle").notNull(),
  audienceInsight: text("audience_insight").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  status: text("status").notNull().default("ready"),
  ...timestamps,
});

export const creativeVariationsTable = pgTable("adforge_creative_variations", {
  id: text("id").primaryKey(),
  creativeId: text("creative_id")
    .notNull()
    .references(() => creativesTable.id, { onDelete: "cascade" }),
  dimension: text("dimension").notNull(),
  label: text("label").notNull(),
  headline: text("headline").notNull(),
  bodyCopy: text("body_copy").notNull(),
  cta: text("cta").notNull(),
  previewUrl: text("preview_url").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  ...timestamps,
});

export type Brand = typeof brandsTable.$inferSelect;
export type BrandAsset = typeof brandAssetsTable.$inferSelect;
export type Campaign = typeof campaignsTable.$inferSelect;
export type CreativeConcept = typeof creativeConceptsTable.$inferSelect;
export type Creative = typeof creativesTable.$inferSelect;
export type CreativeVariation = typeof creativeVariationsTable.$inferSelect;