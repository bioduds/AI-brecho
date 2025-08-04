import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types
export interface Consignor {
    id: string;
    name: string;
    whatsapp?: string;
    email?: string;
    pix_key?: string;
    percent: number;
    notes?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Item {
    sku: string;
    consignor_id?: string;
    acquisition_type?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    gender?: string;
    size?: string;
    fit?: string;
    color?: string;
    fabric?: string;
    condition?: string;
    flaws?: string;
    title_ig?: string;
    tags?: string;
    summary_title?: string;
    bust?: number;
    waist?: number;
    length?: number;
    cost: number;
    list_price?: number;
    markdown_stage: number;
    acquired_at: string;
    listed_at?: string;
    sold_at?: string;
    sale_price?: number;
    channel_listed?: string;
    channel_sold?: string;
    days_on_hand?: number;
    photos?: string;
    notes?: string;
    active: boolean;
    ai_confidence?: number;
    ai_similar_items?: string;
    created_at: string;
    updated_at: string;
}

export interface Sale {
    id: string;
    sku: string;
    consignor_id?: string;
    date: string;
    sale_price: number;
    discount_value: number;
    channel?: string;
    customer_name?: string;
    customer_whatsapp?: string;
    payment_method?: string;
    notes?: string;
    created_at: string;
}

export interface AIIntakeRequest {
    images: string[];
    session_id?: string;
}

export interface AIIntakeResponse {
    consignor_id?: string;
    proposal: {
        sku: string;
        cadastro: {
            Categoria?: string;
            Subcategoria?: string;
            Marca?: string;
            Gênero?: string;
            Tamanho?: string;
            Modelagem?: string;
            Cor?: string;
            Tecido?: string;
            Condição?: string;
            Defeitos?: string;
            TituloIG?: string;
            Tags?: string[];
            DescricaoCompleta?: string;
            RelatorioDetalhado?: string;
            ValorEstimado?: string;
        };
        price: {
            Faixa?: string;
            Motivo?: string;
        };
        descricao_completa?: string;
        relatorio_detalhado?: string;
        valor_estimado?: string;
    };
    similar_items: Array<{
        id: string;
        distance: number;
        metadata: any;
    }>;
    success: boolean;
    message?: string;
}

// API functions
export const consignorAPI = {
    getAll: async (): Promise<Consignor[]> => {
        const response = await api.get('/consignors/');
        return response.data;
    },

    getById: async (id: string): Promise<Consignor> => {
        const response = await api.get(`/consignors/${id}`);
        return response.data;
    },

    create: async (consignor: Omit<Consignor, 'created_at' | 'updated_at'>): Promise<Consignor> => {
        const response = await api.post('/consignors/', consignor);
        return response.data;
    },

    generateQR: async (consignorId: string, size: number = 200): Promise<string> => {
        const response = await api.post('/qr/consignor', {
            consignor_id: consignorId,
            size: size,
        });
        return response.data.qr_code;
    },
};

export const itemAPI = {
    getAll: async (params?: {
        skip?: number;
        limit?: number;
        consignor_id?: string;
        category?: string;
        active?: boolean;
    }): Promise<Item[]> => {
        const response = await api.get('/items/', { params });
        return response.data;
    },

    getById: async (sku: string): Promise<Item> => {
        const response = await api.get(`/items/${sku}`);
        return response.data;
    },

    create: async (item: Omit<Item, 'acquired_at' | 'created_at' | 'updated_at'>): Promise<Item> => {
        const response = await api.post('/items/', item);
        return response.data;
    },
};

export const saleAPI = {
    getAll: async (params?: { skip?: number; limit?: number }): Promise<Sale[]> => {
        const response = await api.get('/sales/', { params });
        return response.data;
    },

    create: async (sale: Omit<Sale, 'created_at'>): Promise<Sale> => {
        const response = await api.post('/sales/', sale);
        return response.data;
    },
};

export const aiAPI = {
    searchByImage: async (imageBase64: string, topK: number = 5) => {
        const response = await api.post('/ai/search', {
            image: imageBase64,
            top_k: topK,
        });
        return response.data;
    },

    intakeAutoregister: async (images: string[], audio?: string): Promise<AIIntakeResponse> => {
        const response = await api.post('/ai/intake', {
            images: images,
            audio: audio,
        });
        return response.data;
    },

    confirmIntake: async (sku: string, proposal: any, images: string[]) => {
        const response = await api.post('/ai/confirm-intake', {
            sku,
            proposal,
            images,
        });
        return response.data;
    },
};

export const dashboardAPI = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
};

export default api;
