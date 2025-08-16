const API_BASE_URL = 'http://192.168.18.21:8000'; // Update with your actual API URL

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
            // Convert images to base64
            const images: string[] = [];
            for (const photoUri of request.photos) {
                try {
                    const response = await fetch(photoUri);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve) => {
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            // Remove data:image/jpeg;base64, prefix
                            const base64Data = result.split(',')[1];
                            resolve(base64Data);
                        };
                        reader.readAsDataURL(blob);
                    });
                    images.push(base64);
                } catch (error) {
                    console.warn('Failed to convert image to base64:', error);
                }
            }

            // Convert audio to base64 if available
            let audioBase64: string | undefined;
            if (request.audioUri) {
                try {
                    const response = await fetch(request.audioUri);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    audioBase64 = await new Promise<string>((resolve) => {
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            // Remove data:audio/m4a;base64, prefix
                            const base64Data = result.split(',')[1];
                            resolve(base64Data);
                        };
                        reader.readAsDataURL(blob);
                    });
                } catch (error) {
                    console.warn('Failed to convert audio to base64:', error);
                }
            }

            const requestBody = {
                images,
                audio: audioBase64,
                description: request.description
            };

            const response = await fetch(`${API_BASE_URL}/api/v1/ai/intake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.detail || data.message || 'Failed to analyze items',
                };
            }

            // Transform the response to match our interface
            const result: AnalysisResult = {
                items: data.proposal?.items || [],
                suggestions: data.proposal?.suggestions || []
            };

            return {
                success: true,
                data: result,
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
