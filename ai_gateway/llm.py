import requests, json, re, base64
from io import BytesIO
from typing import Optional
from config import OLLAMA_URL, GEMMA_MODEL
from speech import transcribe_audio, is_whisper_available

SYS_INTAKE = (
    "Você é um especialista em catalogação inteligente para brechó brasileiro. "
    "Analise as fotos e identifique EXATAMENTE o item. Seja DINÂMICO e INTELIGENTE: "
    "escolha apenas os campos RELEVANTES para este tipo específico de item. "
    "Para uma luminária: tipo_luz, potencia, voltagem, material, estilo. "
    "Para roupa: tecido, tamanho, genero, modelagem, estacao. "
    "Para eletrônico: marca, modelo, funcionalidade, estado, conectividade. "
    "Para decoração: material, estilo, dimensoes, epoca, funcao. "
    "NUNCA force campos irrelevantes! Retorne JSON com apenas campos úteis. "
    "Use português brasileiro e seja preciso na identificação."
)

SYS_PRICE = (
    "Você é um especialista em precificação de brechó premium em Belo "
    "Horizonte. Analise o tipo de item, categoria, marca, condição e "
    "qualidade do produto. ADAPTE os preços baseado no tipo de item: "
    "ROUPAS - Básicas R$15-40, Qualidade R$40-120, Premium R$100-300+. "
    "ELETRÔNICOS - Funcionais R$20-80, Qualidade R$50-200, Premium R$150+. "
    "DECORAÇÃO - Simples R$10-30, Elaborada R$30-100, Artística R$80+. "
    "ILUMINAÇÃO - Básica R$25-60, Design R$60-180, Premium R$150+. "
    "Considere: marca, estado, funcionalidade, design, raridade. "
    "Retorne JSON: {'Faixa':'R$min–R$max','Motivo':'justificativa "
    "detalhada baseada no tipo de item'}"
)

def image_to_base64(pil_image):
    """Converte imagem PIL para base64"""
    buffer = BytesIO()
    pil_image.save(buffer, format='JPEG')
    img_bytes = buffer.getvalue()
    return base64.b64encode(img_bytes).decode('utf-8')


def ollama_multimodal_analyze(images, prompt: str, system: str = "",
                              audio_base64: Optional[str] = None) -> str:
    """Análise multimodal usando Ollama com imagens e opcionalmente áudio"""
    # Converter imagens para base64
    image_data = [image_to_base64(img) for img in images]
    
    # Se há áudio, incluir informação no prompt
    if audio_base64:
        prompt = f"""IMPORTANTE: O usuário forneceu uma gravação de áudio em português 
        descrevendo o produto. Embora você não possa processar o áudio diretamente, 
        use esta informação para dar mais atenção aos detalhes que o usuário 
        mencionaria verbalmente (como defeitos, características especiais, marca, 
        materiais específicos, etc.). Analise as imagens com mais cuidado para 
        capturar todos os detalhes que uma pessoa descreveria ao falar sobre a peça.
        
        {prompt}"""
    
    data = {
        "model": GEMMA_MODEL,
        "prompt": (system + "\n\n" + prompt).strip(),
        "images": image_data,
        "stream": False,
        "options": {"temperature": 0.3}
    }
    
    # NOTA: Não enviamos áudio diretamente pois o Ollama/Gemma pode não suportar
    # A informação do áudio está incluída no prompt acima
    
    try:
        r = requests.post(OLLAMA_URL, json=data, timeout=300)  # 5 minutos
        r.raise_for_status()
        return r.json().get("response", "").strip()
    except Exception as e:
        print(f"Erro na análise multimodal: {e}")
        return ""


def ollama_generate(prompt: str, system: str = "") -> str:
    data = {
        "model": GEMMA_MODEL,
        "prompt": (system + "\n\n" + prompt).strip(),
        "stream": False,
        "options": {"temperature": 0.2}
    }
    r = requests.post(OLLAMA_URL, json=data, timeout=180)  # 3 minutos
    r.raise_for_status()
    return r.json().get("response","").strip()

def _parse_json(txt: str) -> dict:
    m = re.search(r'\{.*\}', txt, re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {}

def multimodal_intake_analyze(images, audio_base64: Optional[str] = None) -> dict:
    """Análise multimodal completa das imagens e áudio (convertido para texto)"""
    
    # Convert audio to text if provided
    audio_description = ""
    if audio_base64 and is_whisper_available():
        try:
            print(f"Processando áudio: {len(audio_base64)} bytes base64")
            audio_bytes = base64.b64decode(audio_base64)
            print(f"Áudio decodificado: {len(audio_bytes)} bytes")
            transcribed_text = transcribe_audio(audio_bytes)
            if transcribed_text:
                audio_description = f"\n\nINFORMAÇÕES ADICIONAIS DO USUÁRIO (via áudio): {transcribed_text}"
                print(f"Áudio transcrito com sucesso: {transcribed_text}")
            else:
                print("Nenhum texto foi transcrito do áudio")
        except Exception as e:
            print(f"Erro ao processar áudio: {e}")
    elif audio_base64:
        print("Áudio fornecido mas Whisper não está disponível")
    else:
        print("Nenhum áudio fornecido")
    
    prompt = (
        "Analise as imagens e identifique o item. Seja INTELIGENTE na escolha dos campos! "
        f"{audio_description}"
        
        "INSTRUÇÕES DINÂMICAS: "
        "1. Identifique PRIMEIRO o tipo de item (roupa, eletrônico, decoração, iluminação, etc.) "
        "2. Escolha APENAS os campos RELEVANTES para esse tipo específico "
        "3. Use nomes de campos em português, descritivos e úteis "
        
        "EXEMPLOS de campos inteligentes por categoria: "
        "• ROUPA: categoria, subcategoria, tamanho, genero, tecido, cor, estacao, modelagem, marca, condicao "
        "• LUMINÁRIA: categoria, tipo_luminaria, fonte_luz, potencia, voltagem, material, cor, estilo, marca, condicao "
        "• ELETRÔNICO: categoria, tipo_eletronico, marca, modelo, funcionalidade, conectividade, voltagem, cor, condicao "
        "• DECORAÇÃO: categoria, tipo_decoracao, material, estilo, dimensoes, cor, epoca, funcao, marca, condicao "
        
        "CAMPOS SEMPRE INCLUIR: categoria, cor, condicao (A/A-/B/C), descricao_completa "
        "NUNCA inclua campos irrelevantes! Para luminária NÃO coloque 'tecido' ou 'genero'! "
        
        "Retorne JSON com campos inteligentes e relevantes apenas."
    )
    
    system = (
        "Você é um especialista em análise inteligente de itens para brechó. "
        "REGRAS FUNDAMENTAIS: "
        "1. Identifique corretamente o tipo de item - NUNCA confunda categorias! "
        "2. Use apenas campos RELEVANTES para o tipo identificado "
        "3. Seja preciso e baseado apenas no que vê nas fotos "
        "4. Condição: A=perfeito, A-=ótimo, B=bom com sinais, C=desgaste visível "
        "5. Descrição completa: 2-3 frases sobre o item e suas características "
        "SEJA DINÂMICO E INTELIGENTE NA ESCOLHA DOS CAMPOS!"
    )
    
    response = ollama_multimodal_analyze(images, prompt, system, audio_base64)
    return _parse_json(response)


def intake_normalize(context: dict) -> dict:
    prompt = "Dados para padronizar (PT-BR) em JSON válido:\n" + json.dumps(context, ensure_ascii=False)
    return _parse_json(ollama_generate(prompt, system=SYS_INTAKE))

def price_suggest(context: dict) -> dict:
    prompt = "Contexto de preço (PT-BR):\n" + json.dumps(context, ensure_ascii=False)
    return _parse_json(ollama_generate(prompt, system=SYS_PRICE))
