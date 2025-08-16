# Brecho AI Intake - Mobile App

App móvel React Native para automatizar o processo de cadastro de itens no brechó usando IA.

## 🚀 Funcionalidades

- **📸 Captura de Fotos**: Tire múltiplas fotos dos itens usando a câmera do dispositivo
- **🎤 Gravação de Áudio**: Grave descrições em áudio para contexto adicional
- **📝 Descrições Textuais**: Adicione observações específicas por texto
- **🤖 Análise por IA**: Processamento automático para identificar e categorizar itens
- **📊 Dashboard**: Visualização de estatísticas de produtividade
- **✅ Revisão**: Confirme e ajuste as informações antes de enviar

## 🛠️ Tecnologias

- **React Native** + **Expo** para desenvolvimento mobile multiplataforma
- **TypeScript** para tipagem estática
- **Expo Camera** para captura de fotos
- **Expo AV** para gravação de áudio
- **React Navigation** para navegação entre telas
- **Expo Media Library** para salvar fotos na galeria

## 📱 Telas do App

1. **Home**: Dashboard principal com estatísticas e botão para iniciar intake
2. **Camera**: Captura de múltiplas fotos dos itens
3. **Audio**: Gravação de descrições em áudio e texto
4. **Review**: Análise da IA e confirmação antes do envio

## 🔧 Instalação e Execução

### Pré-requisitos

- Node.js (versão 18+)
- npm ou yarn
- Expo CLI instalado globalmente: `npm install -g @expo/cli`
- App Expo Go no dispositivo móvel

### Configuração

1. **Instalar dependências**:

   ```bash
   cd brecho_mobile
   npm install
   ```

2. **Iniciar servidor de desenvolvimento**:

   ```bash
   npm start
   ```

3. **Abrir no dispositivo**:
   - **iOS**: Escaneie o QR code com a câmera do iPhone
   - **Android**: Escaneie o QR code com o app Expo Go
   - **Simulador**: Pressione `i` para iOS ou `a` para Android

### Scripts Disponíveis

- `npm start` - Inicia o servidor Expo
- `npm run android` - Executa no Android
- `npm run ios` - Executa no iOS
- `npm run web` - Executa no navegador

## 📂 Estrutura do Projeto

```
brecho_mobile/
├── src/
│   ├── screens/          # Telas do aplicativo
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── AudioScreen.tsx
│   │   └── ReviewScreen.tsx
│   ├── components/       # Componentes reutilizáveis
│   ├── services/         # Serviços de API
│   │   └── api.ts
│   └── types/           # Tipagens TypeScript
│       └── index.ts
├── assets/              # Imagens e ícones
├── App.tsx             # Componente principal
├── app.json           # Configurações do Expo
└── package.json       # Dependências
```

## 🔐 Permissões

O app solicita as seguintes permissões:

### iOS

- **NSCameraUsageDescription**: Acesso à câmera para fotografar itens
- **NSMicrophoneUsageDescription**: Acesso ao microfone para gravar descrições
- **NSPhotoLibraryUsageDescription**: Acesso à galeria para salvar fotos

### Android

- **android.permission.CAMERA**: Uso da câmera
- **android.permission.RECORD_AUDIO**: Gravação de áudio
- **android.permission.READ_EXTERNAL_STORAGE**: Leitura da galeria
- **android.permission.WRITE_EXTERNAL_STORAGE**: Escrita na galeria

## 🔗 Integração com Backend

O app se conecta com o backend FastAPI para:

- **POST /ai/analyze**: Envio de fotos e áudio para análise da IA
- **POST /items/bulk**: Criação em lote dos itens analisados
- **GET /stats/intake**: Obtenção de estatísticas de produtividade

### Configuração da API

Edite `src/services/api.ts` para apontar para seu servidor:

```typescript
const API_BASE_URL = 'https://seu-servidor.com'; // ou http://localhost:8000 para desenvolvimento
```

## 📱 Deploy

### Desenvolvimento (Expo Go)

- Use `npm start` e o QR code para testar no dispositivo
- Ideal para desenvolvimento rápido e testes

### Produção (TestFlight/Play Store)

1. **Configurar perfil de desenvolvimento**:

   ```bash
   expo configure
   ```

2. **Build para iOS**:

   ```bash
   expo build:ios
   ```

3. **Build para Android**:

   ```bash
   expo build:android
   ```

4. **Publicar**:

   ```bash
   expo publish
   ```

## 🎯 Próximas Funcionalidades

- [ ] **Offline Mode**: Funcionar sem conexão de internet
- [ ] **Sincronização**: Upload automático quando conectado
- [ ] **Histórico**: Visualizar intakes anteriores
- [ ] **Configurações**: Personalizar qualidade de fotos e áudio
- [ ] **Integração Barcode**: Leitura de códigos de barras
- [ ] **Templates**: Categorias pré-definidas para agilizar o processo

## 🐛 Troubleshooting

### Problemas Comuns

**"Metro bundler não inicia"**

```bash
npx expo start --clear
```

**"Permissões negadas"**

- Verifique se as permissões estão configuradas no `app.json`
- Reinstale o app no dispositivo

**"Erro de rede na API"**

- Verifique se o backend está rodando
- Confirme a URL da API em `src/services/api.ts`
- Teste a conectividade de rede do dispositivo

**"Fotos não salvam na galeria"**

- Verifique permissões de Media Library
- Confirme se `expo-media-library` está instalado

## 📄 Licença

Este projeto faz parte do sistema Brecho AI e segue a mesma licença do projeto principal.

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

**Desenvolvido com ❤️ para otimizar o processo de intake do brechó**
