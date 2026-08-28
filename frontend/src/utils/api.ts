import { Vehicle, VehicleCreate, ServiceLog, ServiceLogCreate, ChatResponse } from "../types";

const API_BASE_URL = "http://localhost:8000/api/v1";

export async function getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}/vehicles/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
  }
  return response.json();
}

export async function createVehicle(vehicle: VehicleCreate): Promise<Vehicle> {
  const response = await fetch(`${API_BASE_URL}/vehicles/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vehicle),
  });
  if (!response.ok) {
    throw new Error(`Failed to create vehicle: ${response.statusText}`);
  }
  return response.json();
}

export async function getLogs(vehicleId: number): Promise<ServiceLog[]> {
  const response = await fetch(`${API_BASE_URL}/logs/${vehicleId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  return response.json();
}

export async function createLog(log: ServiceLogCreate): Promise<ServiceLog> {
  const response = await fetch(`${API_BASE_URL}/logs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(log),
  });
  if (!response.ok) {
    throw new Error(`Failed to create service log: ${response.statusText}`);
  }
  return response.json();
}

export async function chatWithCopilot(vehicleId: number, question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

    xhr.open("POST", `${API_BASE_URL}/documents/upload-manual`);
    xhr.send(formData);
  });
}
