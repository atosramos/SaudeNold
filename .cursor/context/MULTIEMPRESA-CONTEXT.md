# Multi-Tenant System Context - SaudeNold

**Last Updated:** 2026-01-27

## Overview

The multi-tenant system (family profiles) allows multiple users to manage health data for different family members in a single account, with complete data isolation between profiles and families.

## Core Concepts

### Family (Family)
- **Purpose**: Top-level grouping of related profiles
- **Attributes**: `id`, `name`, `admin_user_id`
- **Relationships**: 1:N with `FamilyProfile`, 1:N with `User`

### Family Profile (FamilyProfile)
- **Purpose**: Represents a family member
- **Attributes**: `id`, `family_id`, `name`, `account_type`, `birth_date`, `gender`, `blood_type`
- **Account Types**: `family_admin`, `adult_member`, `child`, `elder_under_care`
- **Isolation**: All medical data linked via `profile_id`

### User (User)
- **Purpose**: Authentication account
- **Attributes**: `id`, `email`, `password_hash`, `family_id`, `account_type`
- **Relationship**: Belongs to one Family, can have multiple profiles

## Data Isolation Strategy

### Four-Layer Isolation

1. **Frontend Storage Layer**
   ```javascript
   // Profile-scoped AsyncStorage keys
   `profile_${profileId}_medications`
   `profile_${profileId}_medical_exams`
   ```

2. **API Request Layer**
   ```javascript
   // Required header
   headers: { 'X-Profile-Id': profileId }
   ```

3. **Backend Middleware Layer**
   ```python
   # Validate profile belongs to user's family
   profile = db.query(FamilyProfile).filter(
       FamilyProfile.id == profile_id,
       FamilyProfile.family_id == user.family_id
   ).first()
   ```

4. **Database Query Layer**
   ```python
   # Always filter by profile_id
   medications = db.query(Medication).filter(
       Medication.profile_id == profile_id
   ).all()
   ```

## Permission System (RBAC)

### Account Types & Permissions

| Type | Manage Profiles | View Family Data | Edit Family Data | Delete |
|------|----------------|------------------|------------------|--------|
| `family_admin` | ✅ | ✅ | ✅ | ✅ |
| `adult_member` | ❌ | ✅ | ✅ (own) | ❌ |
| `child` | ❌ | ❌ | ❌ | ❌ |
| `elder_under_care` | ❌ | ✅ (own) | ❌ | ❌ |

### Caregiver System

- **Access Levels**: `read_only`, `read_write`, `full`
- **Relationship**: `FamilyCaregiver` model links caregiver to profile
- **Validation**: Caregiver must be in same family

### Data Sharing

- **Scopes**: `all`, `basic`, `emergency_only`, `custom`
- **Model**: `FamilyDataShare` with expiration
- **Granularity**: Per-profile, per-data-type

## Invitation System

### Flow
1. **Admin creates invite** → `POST /api/family/invite-adult`
2. **Invite sent via email** → Contains invite code
3. **User accepts invite** → `POST /api/family/accept-invite`
4. **User added to family** → `account_type: adult_member`

### Invite States
- `pending` - Awaiting acceptance
- `accepted` - User joined family
- `expired` - Past expiration date
- `cancelled` - Admin cancelled

## Migration System

### Migration Phases

1. **Schema Migration**: Create tables and columns
2. **User Migration**: Create families for existing users
3. **Data Migration**: Associate medical data with profiles
4. **Verification**: Validate all data migrated correctly

### Migration Scripts
- `migrate_family_profiles.py` - Schema
- `migrate_existing_users_to_families.py` - Users
- `migrate_medical_data_to_profiles.py` - Data
- `verify_migration.py` - Validation

## Testing Strategy

### Critical Tests
- **Isolation Tests**: Profile A cannot access Profile B data
- **Permission Tests**: Verify RBAC permissions
- **Family Isolation**: Family A cannot access Family B data
- **Middleware Tests**: Verify profile validation

### Test Coverage
- **Isolation**: 100% (11/11 tests passing)
- **Endpoints**: 100% (all endpoints tested)
- **Models**: 100% (13/13 tests passing)
- **Permissions**: >80% coverage

## Common Patterns

### Adding New Medical Data Endpoint
```python
@app.post("/api/new-resource")
def create_resource(
    data: ResourceCreate,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(db, credentials.credentials)
    profile_id = get_profile_id_from_header(request)
    
    # Validate profile access
    ensure_profile_access(user, profile_id, db)
    
    # Create resource with profile_id
    resource = Resource(profile_id=profile_id, **data.dict())
    db.add(resource)
    db.commit()
    return resource
```

### Frontend Profile Switching
```javascript
// Switch profile
await setActiveProfile(newProfileId);

// Reload data for new profile
const medications = await loadMedications(newProfileId);

// Update API headers
// (handled automatically by api.js interceptor)
```

## Security Considerations

- **Profile Validation**: Always verify profile belongs to user's family
- **Permission Checks**: Verify account_type permissions
- **Data Filtering**: Never return data without profile_id filter
- **Audit Logging**: Log all profile access (planned)

## Performance Optimizations

- **Indexes**: On `profile_id`, `family_id` columns
- **Query Optimization**: Use select_related for joins
- **Caching**: Profile data cached in Redis (planned)
- **Pagination**: Always paginate profile lists

## Documentation

- **Architecture**: `docs/multiempresa/ARQUITETURA.md`
- **API**: `docs/multiempresa/API.md`
- **Models**: `docs/multiempresa/MODELOS.md`
- **Migration**: `docs/multiempresa/MIGRACAO.md`
- **Security**: `docs/multiempresa/SEGURANCA.md`
- **User Guide**: `docs/multiempresa/GUIA-USUARIO.md`
