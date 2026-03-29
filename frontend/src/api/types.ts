export type CategoryType = "tops" | "bottoms" | "outerwear" | "dresses" | "shoes" | "accessories"
export type StyleType = "casual" | "office" | "sport" | "evening" | "street" | "smart_casual" | "date" | "travel"
export type OccasionType = "daily" | "work" | "date" | "party" | "workout" | "travel" | "event" | "casual"
export type GenderType = "male" | "female" | "unisex"
export type TryOnJobStatus = "queued" | "processing" | "completed" | "failed"

export interface Product {
  id: string
  sku_id: string
  name: string
  brand: string
  category: CategoryType
  subcategory: string
  gender: GenderType
  description: string
  color: string
  color_name: string
  color_hex: string
  pattern: string
  fit: string
  material: string
  price: number
  promo_price?: number
  currency: string
  sizes: string[]
  in_stock: boolean
  image_url: string
  style_tags: string[]
  occasion_tags: string[]
  season: string
  seller_id: string
}

export interface ProductBrief {
  id: string
  name: string
  brand: string
  category: CategoryType
  color_hex: string
  color_name: string
  price: number
  promo_price?: number
  currency?: string
  image_url: string
  in_stock: boolean
}

export interface OutfitItem {
  product: ProductBrief
  role: string
  replaceable: boolean
}

export interface Outfit {
  id: string
  items: OutfitItem[]
  style: string
  occasion: string
  total_price: number
  compatibility_score: number
  explanation: string
  badges: string[]
}

export interface CatalogResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface OutfitGenerateRequest {
  style: StyleType
  occasion: OccasionType
  gender: GenderType
  budget_min?: number
  budget_max?: number
  colors?: string[]
  excluded_brands?: string[]
  must_include_categories?: string[]
  must_exclude_categories?: string[]
  anchor_product_id?: string
  count?: number
}

export interface TryOnJob {
  job_id: string
  status: TryOnJobStatus
  progress: number
  current_step?: string
  total_items: number
  completed_items: number
  output_image_url?: string
  failure_reason?: string
  provider_used?: string
  created_at: string
  completed_at?: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  image_url?: string
}

export interface ChatResponse {
  answer: string
  extracted_filters?: Record<string, unknown>
  recommended_products: ProductBrief[]
  recommended_outfits: Outfit[]
  explanations: string[]
  cta_actions: { type: string; label: string }[]
}

// Auth types
export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: "user" | "admin"
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// Admin types
export interface AdminStats {
  total_products: number
  total_users: number
  total_events: number
  total_outfits_generated: number
  total_tryon_jobs: number
  active_rules: number
}

// Video generation (Veo)
export type VideoJobStatus = "queued" | "processing" | "completed" | "failed"

export interface VideoJob {
  job_id: string
  status: VideoJobStatus
  progress: number
  video_url?: string
  failure_reason?: string
  created_at: string
  completed_at?: string
}

// Profile & Photos (Feature 1)
export interface UserPhoto {
  id: number
  image_url: string
  is_default: boolean
  created_at: string
}

export interface UserPreferences {
  preferred_styles: string[]
  preferred_gender?: string
  city?: string
}

// Wardrobe & Capsule (Feature 2)
export interface WardrobeItem {
  id: number
  product_id?: string
  category: string
  name: string
  color_name: string
  color_hex: string
  image_url: string
  style_tags: string[]
  created_at: string
}

export interface RecommendationInsight {
  product_id: string
  reason: string
  new_outfits_count: number
  pairs_with: string[]
  marketing_hook: string
}

export interface CapsuleAnalysis {
  total_items: number
  current_outfits_count: number
  possible_outfits: Outfit[]
  missing_categories: string[]
  gap_recommendations: ProductBrief[]
  recommendation_insights: RecommendationInsight[]
  analysis_text: string
  style_tips: string[]
}

// Daily Outfit (Feature 3)
export interface DailyOutfit {
  outfit: Outfit
  weather_summary: string
  temperature_c?: number
  date: string
}
