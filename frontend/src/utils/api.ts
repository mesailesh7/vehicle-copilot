import {
  Vehicle,
  VehicleCreate,
  ServiceLog,
  ServiceLogCreate,
  ChatResponse,
  PlanInfo,
  SubscriptionInfo,
  Member,
  TenantInvite,
  UserRole,
} from "../types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ==============================================================================
// VEHICLES & SERVICE LOGS
// ==============================================================================

export async function getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}/vehicles/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to fetch vehicles: ${response.statusText}`);
  }
  return response.json();
}

export async function createVehicle(vehicle: VehicleCreate): Promise<Vehicle> {
  const response = await fetch(`${API_BASE_URL}/vehicles/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(vehicle),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to create vehicle: ${response.statusText}`);
  }
  return response.json();
}

export async function getLogs(vehicleId: number): Promise<ServiceLog[]> {
  const response = await fetch(`${API_BASE_URL}/logs/${vehicleId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to fetch logs: ${response.statusText}`);
  }
  return response.json();
}

export async function createLog(log: ServiceLogCreate): Promise<ServiceLog> {
  const response = await fetch(`${API_BASE_URL}/logs/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(log),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to create service log: ${response.statusText}`);
  }
  return response.json();
}

export async function getServiceCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/service-categories/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch service categories: ${response.statusText}`);
  }
  return response.json();
}

export async function getCommonParts(query: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/common-parts/?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch common parts: ${response.statusText}`);
  }
  return response.json();
}

// ==============================================================================
// AI COPILOT & MANUAL UPLOADER
// ==============================================================================

export async function chatWithCopilot(vehicleId: number, question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ vehicle_id: vehicleId, question }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `Copilot error: ${response.statusText}`);
  }
  return response.json();
}

export function uploadManual(
  vehicleId: number,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ status: string; filename: string; vehicle_id: number; chunks_index: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("vehicle_id", vehicleId.toString());
    formData.append("file", file);

    const token = getAuthToken();
    if (token) {
      xhr.open("POST", `${API_BASE_URL}/documents/upload-manual`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    } else {
      xhr.open("POST", `${API_BASE_URL}/documents/upload-manual`);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error("Invalid response from server"));
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.detail || `Upload failed: ${xhr.statusText}`));
        } catch (e) {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error occurred during manual upload."));
    });

    xhr.send(formData);
  });
}

// ==============================================================================
// STRIPE BILLING & SUBSCRIPTIONS
// ==============================================================================

export async function getPlans(): Promise<{ plans: PlanInfo[]; stripe_live_mode: boolean }> {
  const response = await fetch(`${API_BASE_URL}/billing/plans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.statusText}`);
  }
  return response.json();
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const response = await fetch(`${API_BASE_URL}/billing/subscription`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to fetch subscription: ${response.statusText}`);
  }
  return response.json();
}

export async function createCheckoutSession(planTier: string): Promise<{ url: string; session_id: string; is_simulated: boolean }> {
  const successUrl = `${window.location.origin}/?billing_success=true`;
  const cancelUrl = `${window.location.origin}/?billing_canceled=true`;

  const response = await fetch(`${API_BASE_URL}/billing/create-checkout-session`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      plan_tier: planTier,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Checkout error: ${response.statusText}`);
  }
  return response.json();
}

export async function createPortalSession(): Promise<{ url: string; is_simulated: boolean }> {
  const returnUrl = `${window.location.origin}/`;
  const response = await fetch(`${API_BASE_URL}/billing/create-portal-session`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ return_url: returnUrl }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Customer portal error: ${response.statusText}`);
  }
  return response.json();
}

export async function simulateSubscriptionUpgrade(planTier: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/billing/simulate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan_tier: planTier }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Simulation error: ${response.statusText}`);
  }
  return response.json();
}

// ==============================================================================
// TEAM & INVITATION CODES
// ==============================================================================

export async function getTenantMembers(): Promise<Member[]> {
  const response = await fetch(`${API_BASE_URL}/auth/members`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load workshop members: ${response.statusText}`);
  }
  return response.json();
}

export async function removeTenantMember(memberId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/members/${memberId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to remove member: ${response.statusText}`);
  }
}

export async function getInvites(): Promise<TenantInvite[]> {
  const response = await fetch(`${API_BASE_URL}/auth/invites`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load invites: ${response.statusText}`);
  }
  return response.json();
}

export async function createInviteCode(role: UserRole, expiresInDays = 7): Promise<TenantInvite> {
  const response = await fetch(`${API_BASE_URL}/auth/invites`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role, expires_in_days: expiresInDays }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to generate invite code: ${response.statusText}`);
  }
  return response.json();
}

export async function revokeInvite(inviteId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/invites/${inviteId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to revoke invite: ${response.statusText}`);
  }
}
