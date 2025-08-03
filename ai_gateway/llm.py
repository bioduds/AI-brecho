import requests, json, re, base64
from io import BytesIO
from config import OLLAMA_URL, GEMMA_MODEL

SYS_INTAKE = (
"Você é um especialista em catalogar roupas para brechó brasileiro. "
"Analise as características visuais das fotos fornecidas e crie uma descrição "
"completa e detalhada da peça. Use as informações de cores, dimensões e "
"produtos similares para identificar todos os aspectos da roupa. "
"Retorne JSON ESTRITO com chaves: "
'{"Categoria","Subcategoria","Marca","Gênero","Tamanho","Modelagem","Cor",'
'"Tecido","Condição","Defeitos","TituloIG","Tags","DescricaoCompleta"}. '
"DescricaoCompleta deve ter 2-3 frases descrevendo detalhadamente a peça, "
"estilo, corte, ocasião de uso e características marcantes. "
"Condição deve ser: A, A-, B ou C. Use português brasileiro."
)

SYS_PRICE = (
"Você é um especialista em precificação de brechó premium em Belo Horizonte. "
"Analise a categoria, qualidade do tecido, marca, condição e tipo de peça. "
"Considere que é um brechó de qualidade que atende classe média/alta. "
"Faixas referenciais: Básicas R$15-40, Qualidade R$40-120, Premium R$100-300+. "
"Para moletom/tricot de qualidade em bom estado: mínimo R$40-80. "
"Retorne JSON: {'Faixa':'R$min–R$max','Motivo':'justificativa detalhada'}"
)

def image_to_base64(pil_image):
    """Converte imagem PIL para base64"""
    buffer = BytesIO()
    pil_image.save(buffer, format='JPEG')
    img_bytes = buffer.getvalue()
    return base64.b64encode(img_bytes).decode('utf-8')


def ollama_multimodal_analyze(images, prompt: str, system: str = "") -> str:
    """Análise multimodal usando Ollama com imagens"""
    # Converter imagens para base64
    image_data = [image_to_base64(img) for img in images]
    
    data = {
        "model": GEMMA_MODEL,
        "prompt": (system + "\n\n" + prompt).strip(),
        "images": image_data,
        "stream": False,
        "options": {"temperature": 0.3}
    }
    
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

def multimodal_intake_analyze(images) -> dict:
    """Análise multimodal completa das imagens de roupas"""
    prompt = (
        "Analise esta peça de roupa mostrada nas fotos. "
        "Forneça o maior detalhamento possível sobre todos os aspectos que conseguir identificar. "
        
        "Examine e descreva: "
        "- Que tipo de peça é (categoria específica) "
        "- Material/tecido que aparenta ser "
        "- Cor e características visuais "
        "- Condição atual da peça "
        "- Estilo e modelagem "
        "- Qualquer detalhe relevante que conseguir observar "
        
        "Para precificação em brechó, considere qualidade e condição observadas. "
        "Faixas típicas: básicas R$15-40, intermediárias R$40-120, premium R$100-300+. "
        
        "Retorne JSON com: "
        '{"Categoria","Subcategoria","Marca","Gênero","Tamanho","Modelagem",'
        '"Cor","Tecido","Condição","Defeitos","TituloIG","Tags",'
        '"DescricaoCompleta","RelatorioDetalhado","ValorEstimado"}. '
        
        "RelatorioDetalhado: análise completa do que observou na peça, "
        "incluindo tipo, material, condição e justificativa do valor."
    )
    
    system = (
        "Você é um especialista em análise visual de roupas. "
        "Analise apenas o que consegue ver claramente nas fotos, sem assumir informações. "
        "Seja preciso na identificação de materiais, tipos de peça e condição. "
        "Condição: A=perfeita, A-=ótima, B=boa com sinais leves, C=visível desgaste."
    )
    
    response = ollama_multimodal_analyze(images, prompt, system)
    return _parse_json(response)


def intake_normalize(context: dict) -> dict:
    prompt = "Dados para padronizar (PT-BR) em JSON válido:\n" + json.dumps(context, ensure_ascii=False)
    return _parse_json(ollama_generate(prompt, system=SYS_INTAKE))

def price_suggest(context: dict) -> dict:
    prompt = "Contexto de preço (PT-BR):\n" + json.dumps(context, ensure_ascii=False)
    return _parse_json(ollama_generate(prompt, system=SYS_PRICE))
