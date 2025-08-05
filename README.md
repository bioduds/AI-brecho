# AI Brechó - Sistema Inteligente de Gestão para Brechós

Sistema completo de gestão para brechós com análise de imagens por IA multimodal, utilizando **Gemma 3:4b** via Ollama para identificação automática de categorias, marcas, tamanhos, condições e sugestão de preços.

## 🚀 Características Principais

- **IA Multimodal**: Análise automática de imagens usando Gemma 3:4b
- **Detecção de QR**: Identificação automática de consignantes
- **Gateway de IA**: Servidor dedicado com ChromaDB para busca por similaridade
- **Interface Editável**: Permite correção dos dados fornecidos pela IA
- **Sistema Completo**: Frontend React + Backend FastAPI + AI Gateway

## 🏗️ Arquitetura

```
brecho/
├── ai_gateway/          # Servidor de IA (FastAPI + Gemma 3:4b + ChromaDB)
├── brecho_local_app/    # Aplicação Streamlit local
└── brecho_app/          # Sistema web completo
    ├── backend/         # API FastAPI
    └── frontend/        # React + TypeScript + Material-UI
```

## ⚙️ Configuração

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- Ollama com modelo Gemma 3:4b
- Git

### 1. AI Gateway

```bash
cd ai_gateway
pip install -r requirements.txt
python server.py
# Servidor rodará na porta 8808
```

### 2. Backend API

```bash
cd brecho_app/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend React

```bash
cd brecho_app/frontend
npm install
npm start
# Aplicação rodará na porta 3000
```

### 4. Configurar Ollama

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelo Gemma 3:4b
ollama pull gemma3:4b
# ou
ollama pull llama3.2:latest
```

## 🤖 Funcionalidades da IA

### Análise Multimodal

- **Identificação automática**: Categoria, marca, tamanho, cor, tecido
- **Avaliação de condição**: Estados A, A-, B, C
- **Detecção de defeitos**: Identificação automática de problemas
- **Sugestão de preços**: Baseada em condição e mercado de brechó
- **Busca por similaridade**: ChromaDB para encontrar itens similares

### Interface de Edição

- **Dados editáveis**: Todos os campos podem ser corrigidos
- **Dropdowns inteligentes**: Opções pré-definidas para categorias
- **Validação em tempo real**: Verificação de dados antes do cadastro
- **Preview antes do cadastro**: Revisão completa dos dados

## 🛠️ Tecnologias

### IA e Machine Learning

- **Gemma 3:4b**: Modelo de linguagem multimodal via Ollama
- **ChromaDB**: Banco vetorial para busca por similaridade
- **OpenCLIP**: Embeddings para análise de imagens

### Backend

- **FastAPI**: API REST de alta performance
- **SQLAlchemy**: ORM para banco de dados
- **Pydantic**: Validação de dados
- **Pillow**: Processamento de imagens

### Frontend

- **React 18**: Framework de interface
- **TypeScript**: Tipagem estática
- **Material-UI**: Componentes de interface
- **React Dropzone**: Upload de arquivos por drag & drop

## 📱 Funcionalidades do Sistema

### Gestão de Consignantes

- Cadastro completo de dados pessoais
- Sistema de QR codes únicos
- Histórico de itens consignados

### Cadastro de Itens

- **Upload de fotos**: Drag & drop para até 6 imagens
- **Análise automática**: IA identifica todos os dados do item
- **Edição manual**: Correção dos dados da IA antes do cadastro
- **SKU automático**: Geração única de códigos

### Controle de Vendas

- Registro de vendas com comissões
- Cálculo automático de repasses
- Relatórios de desempenho

### Dashboard e Relatórios

- Visão geral do negócio
- Métricas de vendas e estoque
- Análise de performance por categoria

## 🔧 Configurações Avançadas

### Timeouts

- **AI Gateway**: 10 minutos para análise completa
- **Backend**: 10 minutos para chamadas de IA
- **Ollama**: 5 minutos para processamento

### Prompts de IA

Os prompts foram otimizados para análise profissional de roupas de brechó, incluindo:

- Expertise em moda e tecidos
- Conhecimento do mercado de segunda mão
- Preços específicos para o contexto brasileiro

## 📊 Performance

- **Análise completa**: ~30-60 segundos por conjunto de imagens
- **Detecção de QR**: Instantânea quando presente
- **Busca por similaridade**: <1 segundo
- **Sugestões de preço**: Baseadas em análise de condição e mercado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para dúvidas e suporte:

- Abra uma issue no GitHub
- Entre em contato via email

---

**Desenvolvido com ❤️ para revolucionar a gestão de brechós através da IA**
