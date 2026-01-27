# Backend Context - SaudeNold

**Last Updated:** 2026-01-27

## Technology Stack

- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Security**: PyJWT, bcrypt, passlib

## Project Structure

```
backend/
├── main.py                 # FastAPI app, routes, middleware
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── auth.py               # Authentication functions
├── database.py            # Database connection
├── config/                # Configuration
│   ├── redis_config.py   # Redis setup
│   └── ...
├── services/              # Business logic
│   ├── encryption_service.py
│   ├── rate_limit_service.py
│   ├── token_blacklist.py
│   ├── csrf_service.py
│   └── ...
├── middleware/            # Custom middleware
│   ├── validation_middleware.py
│   └── ...
├── migrations/            # Migration scripts
│   ├── migrate_existing_users_to_families.py
│   ├── migrate_medical_data_to_profiles.py
│   └── ...
└── tests/                # Test suite
    ├── test_family_models.py
    ├── test_family_endpoints.py
    ├── test_profile_isolation.py
    ├── test_rbac_permissions.py
    └── ...
```

## Key Models

### User & Family Models
- `User`: User account with email, password, family_id, account_type
- `Family`: Family group with admin_user_id
- `FamilyProfile`: Family member profile with account_type, permissions
- `FamilyInvite`: Invitation system
- `FamilyCaregiver`: Caregiver relationships with access levels
- `FamilyDataShare`: Data sharing permissions

### Medical Data Models (all have `profile_id`)
- `Medication`: Medication records
- `MedicationLog`: Intake history
- `DoctorVisit`: Medical appointments
- `MedicalExam`: Exam records with images
- `ExamDataPoint`: Extracted exam parameters
- `EmergencyContact`: Emergency contacts
- `DailyTracking`: Daily health metrics

## Authentication System

### Token Management
- **Access Token**: 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Refresh Token**: 30 days (configurable via `REFRESH_TOKEN_EXPIRE_DAYS`)
- **Token Rotation**: Refresh tokens rotated on each use
- **Blacklist**: Revoked tokens in Redis with TTL

### Key Functions
```python
# auth.py
create_access_token(data: dict) -> str
create_refresh_token(db, user_id, device_id) -> str
verify_refresh_token(db, raw_token) -> Optional[RefreshToken]
revoke_refresh_token(db, token_hash, access_token) -> None
get_user_from_token(db, token) -> User
```

### Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/revoke` - Revoke refresh token
- `POST /api/auth/revoke-all` - Revoke all user tokens

## Security Features

### Rate Limiting
- **IP-based**: Using `slowapi` with Redis
- **Email-based**: Custom service for email endpoints
- **Daily limits**: Per-user email sending limits

### Input Validation
- **Sanitization**: Remove control characters, HTML escaping
- **Size Limits**: Max payload size validation
- **Type Validation**: Pydantic schemas

### CSRF Protection
- **Token Generation**: Per-session CSRF tokens
- **Storage**: Redis with session_id
- **Validation**: Middleware checks for state-changing operations

## Multi-Tenant Implementation

### Profile Isolation
```python
# Always filter by profile_id
profile_id = request.headers.get('X-Profile-Id')
if not profile_id:
    raise HTTPException(400, "X-Profile-Id header required")

# Verify profile belongs to user's family
profile = db.query(FamilyProfile).filter(
    FamilyProfile.id == profile_id,
    FamilyProfile.family_id == user.family_id
).first()

if not profile:
    raise HTTPException(403, "Access denied")
```

### Permission Checks
```python
# ACCOUNT_PERMISSIONS in main.py
ACCOUNT_PERMISSIONS = {
    "family_admin": {
        "can_manage_profiles": True,
        "can_view_family_data": True,
        "can_edit_family_data": True
    },
    # ... other roles
}
```

## API Endpoints Structure

### Family Endpoints
- `GET /api/family/profiles` - List family profiles
- `POST /api/family/invite-adult` - Create invitation
- `POST /api/family/accept-invite` - Accept invitation
- `GET /api/family/invites` - List invitations
- `DELETE /api/family/invite/{id}` - Cancel invitation
- `POST /api/family/invite/{id}/resend` - Resend invitation

### Medical Data Endpoints
All endpoints require `X-Profile-Id` header and filter by `profile_id`:
- `/api/medications` - CRUD operations
- `/api/medication-logs` - Intake history
- `/api/doctor-visits` - Medical appointments
- `/api/medical-exams` - Exam records
- `/api/emergency-contacts` - Emergency contacts
- `/api/daily-tracking` - Daily health metrics

## Database Migrations

### Migration Scripts
1. `migrate_family_profiles.py` - Schema migration
2. `migrate_existing_users_to_families.py` - User migration
3. `migrate_medical_data_to_profiles.py` - Data migration
4. `verify_migration.py` - Post-migration validation
5. `run_all_migrations.py` - Master script

### Migration Best Practices
- Always use `--dry-run` first
- Create backups before migration
- Validate after migration
- Support rollback

## Testing Strategy

### Test Coverage
- **Models**: 100% coverage
- **Endpoints**: >80% coverage
- **Isolation**: 100% coverage (critical)
- **Permissions**: >80% coverage

### Test Files
- `test_family_models.py` - Model tests
- `test_family_endpoints.py` - Endpoint tests
- `test_profile_isolation.py` - Isolation tests (CRITICAL)
- `test_rbac_permissions.py` - Permission tests
- `test_family_security.py` - Security tests
- `test_migration.py` - Migration tests

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/saudenold

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Security
REQUIRE_EMAIL_VERIFICATION=true
ALLOW_EMAIL_DEBUG=false
```

## Common Patterns

### Error Handling
```python
try:
    # Operation
except IntegrityError as e:
    raise HTTPException(400, "Data conflict")
except SQLAlchemyError as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(500, "Database error")
except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(500, "Internal server error")
```

### Database Session Management
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def safe_db_commit(db: Session):
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise
```

## Performance Considerations

- **Indexes**: On `profile_id`, `family_id`, `user_id`, `created_at`
- **Query Optimization**: Use `select_related` for joins
- **Caching**: Redis for rate limits, CSRF tokens
- **Background Tasks**: Use FastAPI BackgroundTasks for non-critical operations
- **Pagination**: Always paginate large result sets
