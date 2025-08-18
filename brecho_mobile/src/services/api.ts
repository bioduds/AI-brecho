const API_BASE_URL = 'http://192.168.18.21:8000';
const AI_GATEWAY_URL = 'https://ai.celflow.com'; // AI Gateway via Cloudflare tunnel! // Update with your actual API URL

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
            console.log('🚀 CHAMANDO DIRETO O AI GATEWAY (igual browser)');

            // Preparar FormData igual o browser faz
            const formData = new FormData();

            // Adicionar imagens
            console.log('📸 Convertendo', request.photos.length, 'imagens...');
            for (let i = 0; i < request.photos.length; i++) {
                const photoUri = request.photos[i];
                const response = await fetch(photoUri);
                const blob = await response.blob();
                console.log('📊 Imagem', i, 'tamanho:', blob.size, 'bytes');

                formData.append('images', {
                    uri: photoUri,
                    type: 'image/jpeg',
                    name: `image_${i}.jpg`,
                } as any);
            }

            // Adicionar áudio se houver
            if (request.audioUri) {
                console.log('🎤 Adicionando áudio...');
                const audioResponse = await fetch(request.audioUri);
                const audioBlob = await audioResponse.blob();
                console.log('📊 Áudio tamanho:', audioBlob.size, 'bytes');

                formData.append('audio', {
                    uri: request.audioUri,
                    type: 'audio/m4a',
                    name: 'audio.m4a',
                } as any);
            }

            console.log('🎯 Enviando para AI Gateway:', `${AI_GATEWAY_URL}/intake/autoregister`);

            // Chamar AI Gateway DIRETO igual browser
            const response = await fetch(`${AI_GATEWAY_URL}/intake/autoregister`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();
            console.log('📦 Resposta DIRETA do AI Gateway:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                return {
                    success: false,
                    error: data.detail || data.message || 'Failed to analyze items',
                };
            }

            // Processar resposta IGUAL o browser
            const proposal = data.proposal || {};
            const cadastro = proposal.cadastro || {};
            console.log('📋 Proposta:', proposal);

            const items = [];
            if (cadastro && Object.keys(cadastro).length > 0) {
                console.log('✅ Processando item do AI Gateway...');
                // Mapear campos corretos conforme retorno da IA
                const item = {
                    name: cadastro.TituloIG || cadastro.Nome ||
                        `${cadastro.categoria || 'Item'} ${cadastro.subcategoria || ''}`.trim() || 'Item não identificado',
                    category: cadastro.categoria || cadastro.Categoria || 'Não especificado',
                    subcategory: cadastro.subcategoria || cadastro.Subcategoria || '',
                    brand: cadastro.marca || cadastro.Marca || '',
                    size: cadastro.tamanho || cadastro.Tamanho || '',
                    color: cadastro.cor || cadastro.Cor || '',
                    condition: cadastro.condicao || cadastro.Condição || cadastro.Estado || 'Usado',
                    estimatedPrice: cadastro.preco_sugerido || proposal.price?.valor_sugerido || proposal.valor_estimado || 0,
                    description: cadastro.descricao_completa || cadastro.DescricaoCompleta || cadastro.Descricao || '',
                    confidence: 0.9 // AI Gateway direto = maior confiança
                };
                console.log('🎯 Item final:', item);
                items.push(item);
            } else {
                console.log('❌ Nenhum cadastro válido na resposta do AI Gateway');
            }

            const result: AnalysisResult = {
                items,
                suggestions: data.similar_topk?.map((item: any) =>
                    `Similar: ${item.description || 'Item similar'}`
                ) || []
            };

            console.log('✅ Resultado final:', result);
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            console.error('❌ Erro ao chamar AI Gateway direto:', error);
            return {
                success: false,
                error: 'Network error. Please check your connection.',
            };
        }
    }

    static async createItems(items: AnalysisResult['items'], photos: string[] = []): Promise<APIResponse<{ created: number }>> {
        try {
            let created = 0;

            // Converter fotos para base64
            const photosBase64 = [];
            if (photos && photos.length > 0) {
                console.log(`🔄 Convertendo ${photos.length} fotos para base64...`);
                for (const photoUri of photos) {
                    try {
                        const response = await fetch(photoUri);
                        const blob = await response.blob();
                        const base64 = await this.blobToBase64(blob);
                        photosBase64.push(base64);
                        console.log(`✅ Foto convertida: ${base64.substring(0, 50)}...`);
                    } catch (error) {
                        console.error('❌ Erro ao converter foto:', error);
                    }
                }
            }

            // Criar itens um por um usando o endpoint individual
            for (const item of items) {
                // Preparar dados básicos do item com fotos em base64
                const itemData = {
                    sku: `MOB-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
                    category: item.category,
                    subcategory: item.subcategory,
                    brand: item.brand,
                    size: item.size,
                    color: item.color,
                    condition: item.condition,
                    list_price: item.estimatedPrice,
                    title_ig: item.name,
                    notes: item.description,
                    photos: photosBase64 // Fotos em base64
                };

                console.log(`📤 Enviando item com ${photosBase64.length} fotos...`);

                // Criar item
                const response = await fetch(`${API_BASE_URL}/api/v1/items/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(itemData),
                });

                if (response.ok) {
                    const createdItem = await response.json();
                    console.log('✅ Item criado com fotos:', createdItem.sku);
                    created++;
                } else {
                    console.error('❌ Erro ao criar item:', await response.text());
                }
            }

            return {
                success: created > 0,
                data: { created },
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

    static async uploadPhotosForItem(sku: string, photos: string[]): Promise<boolean> {
        try {
            console.log(`📸 Fazendo upload de ${photos.length} fotos para item ${sku}...`);

            for (let i = 0; i < photos.length; i++) {
                const photoUri = photos[i];
                const formData = new FormData();

                // Converter foto para blob
                const response = await fetch(photoUri);
                const blob = await response.blob();

                formData.append('file', {
                    uri: photoUri,
                    type: 'image/jpeg',
                    name: `${sku}_photo_${i + 1}.jpg`,
                } as any);

                // Upload da foto
                const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/items/${sku}/photos`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (uploadResponse.ok) {
                    console.log(`✅ Foto ${i + 1} enviada com sucesso`);
                } else {
                    console.error(`❌ Erro no upload da foto ${i + 1}:`, await uploadResponse.text());
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Erro no upload das fotos:', error);
            return false;
        }
    }

    static async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
