const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ScanSessionResponse {
  scan_id: string;
  bottle_id: string;
  upload_url: string;
}

export interface UploadResponse {
  scan_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

export interface BottleBBox {
  x: number;
  y: number;
  w: number;
  h: number;
  image_w: number;
  image_h: number;
}

export interface ScanResult {
  scan: string;
  oil_ratio: number;
  remaining_volume_liters: number;
  consumed_volume_liters: number;
  remaining_cups: number;
  consumed_cups: number;
  consumed_cups_range: [number, number];
  remaining_liters_estimate: number;
  processed_image_url: string | null;
  original_image_url: string | null;
  bottle_bbox: BottleBBox | null;
  confidence_score: number;
  processing_time_ms: number;
}

export interface ScanResultResponse {
  status: 'pending' | 'processing' | 'done' | 'failed';
  result?: ScanResult;
}

export interface TargetResponse {
  scan: string;
  target_cups: number;
  target_image_url: string | null;
}

export interface FeedbackResponse {
  scan: string;
  actual_cups: number;
  notes: string;
  created_at: string;
}

// Single 1.5L bottle - all product IDs map to it
const DEFAULT_BOTTLE_ID = 'afia-1500';

export function getBottleId(productId: string): string {
  void productId;
  return DEFAULT_BOTTLE_ID;
}

/** Step 1: Create a scan session */
export async function createScanSession(bottleId: string): Promise<ScanSessionResponse> {
  const res = await fetch(`${API_URL}/scan/${bottleId}/`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to create scan session: ${res.status}`);
  return res.json();
}

/** Step 2: Upload bottle image and start processing */
export async function uploadBottleImage(
  bottleId: string,
  image: File,
  scanId?: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('bottle_id', bottleId);
  formData.append('image', image);
  if (scanId) formData.append('scan_id', scanId);

  const res = await fetch(`${API_URL}/api/upload-bottle-image/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || err.image?.[0] || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/** Step 3: Get scan result (poll if needed) */
export async function getScanResult(scanId: string): Promise<ScanResultResponse> {
  const res = await fetch(`${API_URL}/api/result/${scanId}/`);
  if (!res.ok) throw new Error(`Failed to get result: ${res.status}`);
  return res.json();
}

/** Step 4 (optional): Set target level */
export async function setTargetLevel(scanId: string, targetCups: number): Promise<TargetResponse> {
  const res = await fetch(`${API_URL}/api/target-level/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan_id: scanId, target_cups: targetCups }),
  });
  if (!res.ok) throw new Error(`Failed to set target: ${res.status}`);
  return res.json();
}

/** Step 5 (optional): Submit feedback */
export async function submitFeedback(
  scanId: string,
  actualCups: number,
  notes: string = '',
): Promise<FeedbackResponse> {
  const res = await fetch(`${API_URL}/api/feedback/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan: scanId, actual_cups: actualCups, notes }),
  });
  if (!res.ok) throw new Error(`Failed to submit feedback: ${res.status}`);
  return res.json();
}

/** Step 6: Upload a training image for the local engine */
export async function uploadTrainingImage(
  bottleId: string,
  image: File,
  actualOilPercentage: number,
  lighting: string = 'daylight',
  environment: string = 'kitchen',
  cameraInfo: string = '',
  notes: string = '',
  uploadedBy: string = '',
): Promise<{ id: number; bottle_id: string; actual_oil_percentage: number }> {
  const formData = new FormData();
  formData.append('bottle_id', bottleId);
  formData.append('image', image);
  formData.append('actual_oil_percentage', actualOilPercentage.toString());
  formData.append('lighting', lighting);
  formData.append('environment', environment);
  if (cameraInfo) formData.append('camera_info', cameraInfo);
  if (notes) formData.append('notes', notes);
  if (uploadedBy) formData.append('uploaded_by', uploadedBy);

  const res = await fetch(`${API_URL}/api/training/upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/** Get training stats */
export async function getTrainingStats(): Promise<{
  total_images: number;
  verified_images: number;
  by_lighting: Record<string, number>;
  by_environment: Record<string, number>;
  by_bottle: Array<{ bottle__bottle_id: string; bottle__bottle_name: string; count: number }>;
}> {
  const res = await fetch(`${API_URL}/api/training/stats/`);
  if (!res.ok) throw new Error(`Failed to get stats: ${res.status}`);
  return res.json();
}

/** Full flow: upload image → get result (with polling for non-eager mode) */
export async function analyzeBottleImage(
  bottleId: string,
  image: File,
): Promise<{ scanId: string; result: ScanResult }> {
  // Upload and start processing
  const upload = await uploadBottleImage(bottleId, image);
  const scanId = upload.scan_id;

  // If already done (eager mode), get result directly
  if (upload.status === 'done') {
    const data = await getScanResult(scanId);
    if (data.result) return { scanId, result: data.result };
  }

  // Poll for result (non-eager mode)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const data = await getScanResult(scanId);
    if (data.status === 'done' && data.result) {
      return { scanId, result: data.result };
    }
    if (data.status === 'failed') {
      throw new Error('Image processing failed');
    }
  }

  throw new Error('Processing timed out');
}
