export interface Item {
    id?: number;
    name: string;
    category: string;
    subcategory?: string;
    brand?: string;
    size?: string;
    color?: string;
    condition: string;
    price: number;
    description: string;
    photos: string[];
    consignorId?: number;
    status: 'available' | 'sold' | 'reserved';
    createdAt?: string;
    updatedAt?: string;
}

export interface AIAnalysisItem {
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
}

export interface IntakeSession {
    id: string;
    photos: string[];
    audioUri?: string;
    description?: string;
    analysisResult?: {
        items: AIAnalysisItem[];
        suggestions: string[];
    };
    status: 'draft' | 'analyzed' | 'submitted';
    createdAt: Date;
}

export interface AppStats {
    todayCount: number;
    weekCount: number;
    totalCount: number;
}
