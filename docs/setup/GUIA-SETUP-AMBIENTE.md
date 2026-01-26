## Guia de setup do ambiente

Este guia resume o setup basico. Para passos detalhados, veja:
- `docs/setup/SETUP.md`
- `docs/setup/SETUP-COMPLETO.md`
- `docs/setup/CONFIGURACAO-VARIAVEIS-AMBIENTE.md`
- `docs/setup/CONFIGURAR-BACKEND-MOBILE.md`

### 1) Requisitos
- Node.js (recomendado LTS)
- Python 3.11+
- PostgreSQL
- Android Studio / SDK Android (para build local)

### 2) Backend
1. Abra o diretorio `backend/`
2. Crie o ambiente virtual e instale dependencias:
   - `python -m venv venv`
   - `.\venv\Scripts\Activate.ps1`
   - `pip install -r requirements.txt`
3. Configure o arquivo `.env` em `backend/`
4. Inicie o servidor:
   - `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### 3) Frontend (app)
1. Na raiz do projeto:
   - `npm install`
   - `npm start`
2. Configure `EXPO_PUBLIC_API_URL` conforme o dispositivo (emulador ou celular).

### 4) Build APK local
Use o script:
- `.\scripts\build\build-local-apk.ps1`

### 5) Teste rapido
Abra `http://localhost:8000/health` para confirmar backend ativo.

