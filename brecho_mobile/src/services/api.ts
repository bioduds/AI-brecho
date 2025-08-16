const API_BASE_URL = 'http://localhost:8000'; // Update with your actual API URL

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface AnalysisRequest {
    photos: string[];
    audioUri?: string;
    description?: string;
}

export interface AnalysisResult {
    items: Array<{
        name: string;
        category: string;
        subcategory?: string;
        brand?: string;
        size?: string;
        color?: string;
        condition: string;
        estimatedPrice: number;
        description: string;
        confidence: number;
    }>;
    suggestions: string[];
}

export class APIService {
    static async analyzeItems(request: AnalysisRequest): Promise<APIResponse<AnalysisResult>> {
        try {
            const formData = new FormData();

            // Add photos
            request.photos.forEach((photoUri, index) => {
                formData.append('photos', {
                    uri: photoUri,
                    type: 'image/jpeg',
                    name: `photo_${index}.jpg`,
                } as any);
            });

            // Add audio if available
            if (request.audioUri) {
                formData.append('audio', {
                    uri: request.audioUri,
                    type: 'audio/m4a',
                    name: 'audio.m4a',
                } as any);
            }

            // Add description if available
            if (request.description) {
                formData.append('description', request.description);
            }

            const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.detail || 'Failed to analyze items',
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Network error. Please check your connection.',
            };
        }
    }

    static async createItems(items: AnalysisResult['items']): Promise<APIResponse<{ created: number }>> {
        try {
            const response = await fetch(`${API_BASE_URL}/items/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.detail || 'Failed to create items',
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Network error. Please check your connection.',
            };
        }
    }

    static async getStats(): Promise<APIResponse<{ todayCount: number; weekCount: number }>> {
        try {
            const response = await fetch(`${API_BASE_URL}/stats/intake`);
            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.detail || 'Failed to get stats',
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Network error. Please check your connection.',
            };
        }
    }
}
