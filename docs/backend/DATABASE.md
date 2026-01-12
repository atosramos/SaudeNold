# Solução de Banco de Dados - SaudeNold

## 📊 Situação Atual

### Implementado:
- ✅ **AsyncStorage** (armazenamento local)
- ✅ Dados salvos no dispositivo
- ✅ Funcional para uso offline
- ✅ Sem necessidade de conexão com internet

### Não Implementado:
- ❌ Backend API (FastAPI)
- ❌ MongoDB
- ❌ Sincronização entre dispositivos
- ❌ Backup na nuvem

## 🔄 Opções de Implementação

### Opção 1: Manter AsyncStorage (Atual)
**Vantagens:**
- ✅ Funciona offline
- ✅ Rápido e simples
- ✅ Não precisa de servidor
- ✅ Dados privados no dispositivo

**Desvantagens:**
- ❌ Dados perdidos se o app for desinstalado
- ❌ Não sincroniza entre dispositivos
- ❌ Sem backup
- ❌ Limite de armazenamento do dispositivo

**Quando usar:**
- MVP/Prova de conceito
- App usado em um único dispositivo
- Dados temporários ou não críticos

---

### Opção 2: Implementar Backend Completo (MongoDB + FastAPI)

#### Estrutura Proposta:

```
backend/
├── main.py                 # FastAPI app
├── models/
│   ├── medication.py       # Modelos MongoDB
│   ├── contact.py
│   ├── visit.py
│   └── log.py
├── routes/
│   ├── medications.py      # Endpoints REST
│   ├── contacts.py
│   ├── visits.py
│   └── logs.py
├── database.py             # Conexão MongoDB
└── requirements.txt
```

#### Collections MongoDB:
1. **medications**
   ```json
   {
     "_id": "ObjectId",
     "name": "string",
     "dosage": "string",
     "schedules": ["08:00", "12:00"],
     "image_base64": "string",
     "notes": "string",
     "active": true,
     "user_id": "string"
   }
   ```

2. **medication_logs**
   ```json
   {
     "_id": "ObjectId",
     "medication_id": "string",
     "medication_name": "string",
     "scheduled_time": "datetime",
     "taken_at": "datetime",
     "status": "taken|skipped|postponed",
     "user_id": "string"
   }
   ```

3. **emergency_contacts**
   ```json
   {
     "_id": "ObjectId",
     "name": "string",
     "phone": "string",
     "photo_base64": "string",
     "relation": "string",
     "order": 0,
     "user_id": "string"
   }
   ```

4. **doctor_visits**
   ```json
   {
     "_id": "ObjectId",
     "doctor_name": "string",
     "specialty": "string",
     "visit_date": "datetime",
     "notes": "string",
     "prescription_image": "string",
     "user_id": "string"
   }
   ```

#### Endpoints API:
- `GET /api/medications` - Listar medicamentos
- `POST /api/medications` - Criar medicamento
- `PUT /api/medications/{id}` - Atualizar medicamento
- `DELETE /api/medications/{id}` - Deletar medicamento
- `GET /api/medication-logs` - Listar logs
- `POST /api/medication-logs` - Criar log
- `GET /api/emergency-contacts` - Listar contatos
- `POST /api/emergency-contacts` - Criar contato
- `GET /api/doctor-visits` - Listar visitas
- `POST /api/doctor-visits` - Criar visita

**Vantagens:**
- ✅ Backup na nuvem
- ✅ Sincronização entre dispositivos
- ✅ Dados seguros
- ✅ Escalável

**Desvantagens:**
- ❌ Precisa de servidor/cloud
- ❌ Custo de hospedagem
- ❌ Requer conexão internet (pode ter cache offline)

---

### Opção 3: Híbrida (AsyncStorage + Backend Opcional)

Usar AsyncStorage como padrão e adicionar opção de sincronização com backend quando disponível.

**Fluxo:**
1. Salvar primeiro no AsyncStorage (funciona offline)
2. Se tiver conexão, sincronizar com backend em background
3. Carregar do backend quando disponível, senão usar AsyncStorage

---

## 🔧 Para Implementar Backend

### Passos:
1. Criar estrutura de pastas `backend/`
2. Configurar FastAPI com CORS
3. Conectar MongoDB (Motor)
4. Criar modelos e rotas
5. Atualizar frontend para usar Axios
6. Criar serviço de sincronização
7. Adicionar tratamento de erro offline

### Dependências Backend:
```txt
fastapi==0.104.1
uvicorn==0.24.0
motor==3.3.2
pymongo==4.6.0
python-dotenv==1.0.0
```

### Variáveis de Ambiente:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=saudenold
CORS_ORIGINS=http://localhost:8082,exp://*
```

---

## 📝 Recomendação

**Para MVP/Protótipo:** Manter AsyncStorage (atual)
**Para Produção:** Implementar backend completo

Deseja que eu implemente o backend agora?

