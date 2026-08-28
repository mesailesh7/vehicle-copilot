export interface Vehicle {
  id: number;
  vin?: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
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
