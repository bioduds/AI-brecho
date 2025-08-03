# Brechó Management System

A modern, AI-powered management system for Brazilian thrift shops (brechós) with intelligent photo-based item intake.

## 🌟 Features

### 🤖 AI-First Approach

- **AI Intake**: Upload 2-6 photos and let AI automatically categorize items, detect brands, sizes, conditions, and suggest prices
- **QR Code Integration**: Automatic consignor detection via QR codes in photos
- **Visual Similarity Search**: Find similar items using computer vision
- **Gemma LLM Integration**: Smart field normalization and price suggestions

### 🏪 Shop Management

- **Consignor Management**: Track consignors with commission rates and contact info
- **Inventory Management**: Complete item lifecycle from intake to sale
- **Sales Tracking**: Record sales with customer info and payment methods
- **Analytics Dashboard**: Business insights and performance metrics

### 📱 Mobile-Ready

- **Responsive Web App**: Works on all devices
- **Mobile API**: Ready for native mobile app development
- **PWA Capabilities**: Install as app on mobile devices

## 🏗️ Architecture

```
brecho_app/
├── backend/          # FastAPI + SQLAlchemy backend
│   ├── main.py      # API endpoints
│   ├── models.py    # Database models
│   ├── schemas.py   # Pydantic schemas
│   ├── crud.py      # Database operations
│   ├── ai_services.py # AI Gateway integration
│   └── config.py    # Configuration
├── frontend/         # React + TypeScript frontend
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/     # Page components
│   │   └── services/  # API services
└── ai_gateway/       # AI microservice (OpenAI o3 generated)
    ├── server.py     # FastAPI AI endpoints
    ├── embedder.py   # OpenCLIP image embeddings
    ├── llm.py        # Gemma LLM integration
    └── vstore.py     # Chroma vector database
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama with Gemma model

### 1. Setup AI Gateway

```bash
cd ai_gateway
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install and run Gemma
ollama pull gemma2:2b
ollama serve

# Start AI Gateway
uvicorn server:app --reload --port 8808
```

### 2. Setup Backend

```bash
cd brecho_app/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start Backend API
uvicorn main:app --reload --port 8000
```

### 3. Setup Frontend

```bash
cd brecho_app/frontend
npm install
npm start
```

### 4. Access the Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **AI Gateway**: <http://localhost:8808>
- **API Docs**: <http://localhost:8000/docs>

## 🤖 AI Workflow

### The Magic of AI Intake

1. **Photo Upload**: Your mother takes 2-6 photos of items
2. **QR Detection**: AI automatically detects consignor QR codes in photos
3. **Visual Analysis**: OpenCLIP generates image embeddings
4. **Similarity Search**: Chroma finds similar existing items
5. **LLM Processing**: Gemma normalizes fields and suggests pricing
6. **Review & Confirm**: Human review of AI suggestions
7. **Auto-Cataloging**: Item automatically added to inventory

### QR Code System

```bash
# Generate QR codes for consignors
curl -X POST http://localhost:8000/api/v1/qr/consignor \
  -H "Content-Type: application/json" \
  -d '{"consignor_id": "C0001", "size": 200}'
```

## 📱 Mobile API

Perfect for building a mobile app:

```typescript
// Quick intake for mobile
POST /api/v1/mobile/quick-intake
{
  "images": ["base64_image1", "base64_image2"],
  "consignor_id": "C0001",
  "notes": "Optional notes"
}

// Response
{
  "item_sku": "ABC12345",
  "ai_suggestions": {...},
  "needs_review": false,
  "success": true
}
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in both backend and frontend:

**Backend (.env)**:

```env
DATABASE_URL=sqlite:///./brecho.db
AI_GATEWAY_URL=http://localhost:8808
SECRET_KEY=your-secret-key
```

**Frontend (.env)**:

```env
REACT_APP_API_URL=http://localhost:8000
```

## 🎯 Next Steps

### Immediate Enhancements

1. **Authentication System**: User login and role-based access
2. **Advanced Dashboard**: Charts, analytics, and KPIs
3. **Photo Management**: Upload, crop, and organize item photos
4. **Print Integration**: QR codes, labels, and receipts

### AI Improvements

1. **Fine-tuning**: Train Gemma on your specific inventory data
2. **Defect Detection**: AI-powered condition assessment
3. **Price Optimization**: Dynamic pricing based on market data
4. **Trend Analysis**: Predict popular items and optimal timing

### Mobile App

1. **React Native App**: Native mobile experience
2. **Offline Capability**: Work without internet connection
3. **Barcode Scanning**: Quick item lookup and management
4. **Push Notifications**: New items, sales, and alerts

## 🛠️ Development

### Backend Development

```bash
# Run with auto-reload
uvicorn main:app --reload

# Run tests
pytest

# Database migrations
alembic upgrade head
```

### Frontend Development

```bash
# Development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### AI Gateway Development

```bash
# Test AI endpoints
curl -X POST http://localhost:8808/search_by_image \
  -F "image=@test_image.jpg" \
  -F "top_k=5"
```

## 📊 Database Schema

```sql
-- Consignors (consignantes)
CREATE TABLE consignors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    pix_key TEXT,
    percent REAL DEFAULT 0.5,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Items
CREATE TABLE items (
    sku TEXT PRIMARY KEY,
    consignor_id TEXT REFERENCES consignors(id),
    category TEXT,
    brand TEXT,
    size TEXT,
    condition TEXT,
    list_price REAL,
    sale_price REAL,
    photos TEXT,  -- JSON array
    ai_confidence REAL,
    ai_similar_items TEXT  -- JSON array
);

-- Sales
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    sku TEXT REFERENCES items(sku),
    sale_price REAL,
    date DATETIME,
    customer_name TEXT,
    payment_method TEXT
);
```

## 🤝 Contributing

This system was built to revolutionize how small businesses manage inventory using AI. Contributions are welcome!

## 📄 License

MIT License - feel free to use this for your own brechó or retail business!

---

**Built with ❤️ for Brazilian entrepreneurs using cutting-edge AI**
