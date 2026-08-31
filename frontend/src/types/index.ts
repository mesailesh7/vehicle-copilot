export type UserRole = "owner" | "admin" | "manager" | "technician" | "service_advisor";

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  tenant_id?: number;
  tenant_name?: string;
  tenant_slug?: string;
  tenant_plan?: string;
  tenant_status?: string;
  created_at?: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan_tier: "starter" | "pro" | "enterprise";
  subscription_status: string;
  max_vehicles: number;
  max_members: number;
  current_period_end?: string;
  created_at?: string;
}

export interface Member {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  created_at?: string;
}

export interface TenantInvite {
  id: number;
  code: string;
  role: UserRole;
  tenant_id: number;
  tenant_name?: string;
  created_at: string;
  expires_at?: string;
  is_used: boolean;
}

export interface PlanInfo {
  id: string;
  name: string;
  price_monthly: number;
  description: string;
  max_vehicles: number;
  max_members: number;
  badge?: string;
  features: string[];
}

export interface SubscriptionInfo {
  tenant_id: number;
  tenant_name: string;
  tenant_slug: string;
  plan_tier: string;
  plan_name: string;
  plan_price_monthly: number;
  subscription_status: string;
  current_period_end?: string;
  max_vehicles: number;
  max_members: number;
  vehicle_count: number;
  member_count: number;
  has_stripe_customer: boolean;
  stripe_configured: boolean;
}

export interface Vehicle {
  id: number;
  vin?: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  tenant_id?: number;
}

export interface VehicleCreate {
  vin?: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
}

export interface ServiceLog {
  id: number;
  vehicle_id: number;
  service_date: string; // ISO string
  mileage_at_service: number;
  category: string;
  description: string;
  parts_replaced?: string;
  cost?: number;
  notes?: string;
  tenant_id?: number;
}

export interface ServiceLogCreate {
  vehicle_id: number;
  service_date?: string; // ISO string
  mileage_at_service: number;
  category: string;
  description: string;
  parts_replaced?: string;
  cost?: number;
  notes?: string;
}

export interface ChatRequest {
  vehicle_id: number;
  question: string;
}

export interface ChatResponse {
  vehicle_id: number;
  question: string;
  answer: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
