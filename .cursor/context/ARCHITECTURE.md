# System Architecture - SaudeNold

**Last Updated:** 2026-01-27  
**Última Atualização:** 2026-01-27

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   AsyncStorage│  │   Services   │  │   Components │      │
│  │  (Offline)    │  │  (Business)  │  │    (UI)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │   API Client   │                        │
│                    │  (Axios + Auth)│                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   BACKEND API    │
                    │    (FastAPI)     │
                    │                  │
                    │  ┌────────────┐ │
                    │  │ Middleware │ │
                    │  │  (Auth,    │ │
                    │  │   CSRF,    │ │
                    │  │   Rate     │ │
                    │  │   Limit)   │ │
                    │  └────────────┘ │
                    │                  │
                    │  ┌────────────┐ │
                    │  │  Routes    │ │
                    │  │  (Endpoints)│ │
                    │  └────────────┘ │
                    │                  │
                    │  ┌────────────┐ │
                    │  │  Services  │ │
                    │  │  (Business)│ │
                    │  └────────────┘ │
                    │                  │
                    │  ┌────────────┐ │
                    │  │  Models    │ │
                    │  │ (SQLAlchemy)│ │
                    │  └────────────┘ │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  PostgreSQL    │  │     Redis       │  │  Google Gemini │
│  (Database)    │  │    (Cache)       │  │      (AI)      │
└────────────────┘  └─────────────────┘  └────────────────┘
```

## Multi-Tenant Architecture

### Data Isolation Layers

1. **Frontend Layer**: Profile-scoped AsyncStorage keys
   ```javascript
   `profile_${profileId}_medications`
   `profile_${profileId}_medical_exams`
   ```

2. **API Layer**: `X-Profile-Id` header required
   ```javascript
   headers: { 'X-Profile-Id': profileId }
   ```

3. **Backend Middleware**: Validates profile belongs to user's family
   ```python
   def ensure_profile_access(user, profile_id):
       # Verify profile.family_id == user.family_id
   ```

4. **Database Layer**: All queries filter by `profile_id`
   ```python
   medications = db.query(Medication).filter(
       Medication.profile_id == profile_id
   ).all()
   ```

## Authentication Flow

```
1. User Login
   ↓
2. Backend validates credentials
   ↓
3. Returns: access_token (30min) + refresh_token (30 days)
   ↓
4. Frontend stores in SecureStore
   ↓
5. TokenManager starts refresh loop (every 13 min)
   ↓
6. API interceptor adds token to requests
   ↓
7. On 401 error → auto-refresh → retry request
```

## Data Synchronization Flow

```
┌─────────────┐
│ App Startup │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Check Backend   │
│ Available?      │
└──────┬──────────┘
       │
   ┌───┴───┐
   │  Yes  │  No
   └───┬───┘   │
       │       │
       ▼       ▼
┌──────────┐ ┌──────────────┐
│ Sync     │ │ Use Local    │
│ Data     │ │ Data Only    │
└────┬─────┘ └──────────────┘
     │
     ▼
┌─────────────────┐
│ Send Local      │
│ Changes → API   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Receive Server  │
│ Updates ← API   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Merge & Save    │
│ to AsyncStorage │
└─────────────────┘
```

## Security Architecture

### Defense in Depth

1. **Transport Layer**: HTTPS/TLS (production)
2. **Authentication**: JWT tokens with refresh mechanism
3. **Authorization**: RBAC with profile-level checks
4. **Input Validation**: Sanitization, XSS protection, size limits
5. **Rate Limiting**: IP-based and email-based limits
6. **CSRF Protection**: Token-based for state-changing operations
7. **Data Isolation**: Profile-level filtering at all layers

### Token Security

- **Access Tokens**: Short-lived (30 min), stored in SecureStore
- **Refresh Tokens**: Long-lived (30 days), stored in database
- **Token Rotation**: Refresh tokens rotated on each use
- **Blacklist**: Revoked tokens cached in Redis
- **Auto-Cleanup**: Expired tokens removed by background job

## Database Schema

### Core Tables

- `users` - User accounts
- `families` - Family groups
- `family_profiles` - Family member profiles
- `family_invites` - Invitation system
- `family_caregivers` - Caregiver relationships
- `family_data_shares` - Data sharing permissions

### Medical Data Tables (all have `profile_id`)

- `medications` - Medication records
- `medication_logs` - Medication intake history
- `doctor_visits` - Medical appointments
- `medical_exams` - Medical exam records
- `exam_data_points` - Extracted exam parameters
- `emergency_contacts` - Emergency contact information
- `daily_tracking` - Daily health metrics

## API Design Patterns

### Standard Endpoint Structure

```python
@app.get("/api/resource")
@limiter.limit("10/minute")
def get_resource(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    profile_id = get_profile_id_from_header(request)
    # Validate profile access
    # Filter by profile_id
    # Return data
```

### Error Handling

- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **413**: Payload Too Large
- **429**: Too Many Requests (rate limit)
- **500**: Internal Server Error

## Performance Optimizations

1. **Database Indexes**: On `profile_id`, `family_id`, `user_id`, `created_at`
2. **Query Optimization**: Eager loading, select only needed fields
3. **Caching**: Redis for rate limits, CSRF tokens, token blacklist
4. **Pagination**: Limit results, use cursor-based pagination
5. **Background Jobs**: Token cleanup, email sending, data processing

## Deployment Architecture

### Development
- Docker Compose: PostgreSQL + Backend
- Expo Go: Mobile app development

### Production
- Kubernetes: Backend services
- PostgreSQL: Managed database
- Redis: Managed cache
- CDN: Static assets
- Mobile: App Store / Play Store distribution

## Monitoring & Observability

- **Logging**: Structured logs with context
- **Metrics**: Request counts, response times, error rates
- **Health Checks**: `/health` endpoint
- **Error Tracking**: (To be implemented)
- **Analytics**: User behavior tracking (privacy-compliant)
