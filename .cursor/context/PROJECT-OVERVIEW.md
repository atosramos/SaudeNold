# Project Overview - SaudeNold

**Last Updated:** 2026-01-27  
**Version:** 1.0.0

## What is SaudeNold?

SaudeNold is a comprehensive mobile health management application designed specifically for elderly users, with a focus on accessibility, simplicity, and offline functionality.

## Core Purpose

Enable elderly users and their families to manage health information, medications, appointments, and medical records in an intuitive, accessible interface that works offline-first.

## Key Differentiators

1. **Elderly-Optimized UI**: Large fonts (24-40px), extra-large buttons (80x80px minimum), high contrast, simple navigation
2. **Offline-First**: Full functionality without internet connection, optional backend sync
3. **Multi-Profile Family System**: Multiple family members can share one account with complete data isolation
4. **AI-Powered Data Extraction**: Automatic extraction of medical exam data using Google Gemini AI
5. **Comprehensive Health Tracking**: Medications, appointments, exams, daily vitals, emergency contacts

## Target Users

- **Primary**: Elderly individuals (60+ years)
- **Secondary**: Family caregivers managing multiple family members' health
- **Tertiary**: Healthcare professionals (view-only access)

## Business Model

- **Free Tier**: Basic features, local-only storage
- **PRO License**: Cloud sync, multi-profile, advanced features, family sharing

## Project Status

### ✅ Completed Features
- Multi-tenant family profiles system
- JWT token management with auto-refresh
- Rate limiting and security protections
- Medical data management (medications, exams, visits)
- Offline-first architecture
- AI-powered exam data extraction
- Complete test coverage for critical features

### 🟡 In Progress
- RBAC permissions system (partial)
- UI for family invites (mostly complete)
- WhatsApp integration for invites (optional)

### ❌ Planned
- 2FA authentication
- Social login (OAuth)
- Biometric device authentication
- Dark mode and age-specific interfaces

## Technical Architecture

### Frontend (Mobile App)
- **Framework**: Expo 54 with React Native
- **Routing**: Expo Router (file-based)
- **State**: React hooks, Context API
- **Storage**: AsyncStorage (offline-first)
- **UI**: Custom components optimized for accessibility

### Backend (Optional)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT tokens with refresh mechanism
- **Security**: Rate limiting, CSRF protection, input validation

### Infrastructure
- **Development**: Docker Compose
- **Production**: Kubernetes
- **CI/CD**: GitHub Actions (planned)

## Data Flow

1. **User Action** → Save to AsyncStorage (immediate)
2. **Background Sync** → Send to backend if available
3. **Backend Processing** → Validate, store in PostgreSQL
4. **Sync Response** → Update local storage with server data
5. **Conflict Resolution** → Server timestamp wins

## Security Model

- **Authentication**: JWT tokens (15-30 min access, 30 day refresh)
- **Authorization**: RBAC with family-based isolation
- **Data Protection**: Profile-level isolation, encryption support
- **Rate Limiting**: IP-based and email-based limits
- **Input Validation**: Sanitization, XSS protection, payload size limits

## Development Workflow

1. **Local Development**: Expo Go or local build
2. **Backend Testing**: Docker Compose setup
3. **Integration Testing**: Full stack tests
4. **Migration**: Scripts with dry-run and rollback
5. **Deployment**: Kubernetes with health checks

## Key Metrics

- **Test Coverage**: >80% for critical features, 100% for isolation tests
- **Offline Support**: 100% of core features
- **Accessibility**: WCAG 2.1 Level AA compliance (target)
- **Performance**: <2s app startup, <500ms API response (target)

## Related Documentation

- Architecture: `docs/multiempresa/ARQUITETURA.md`
- API Reference: `docs/multiempresa/API.md`
- Current State: `.issues/ESTADO-ATUAL-APLICACAO.md`
- Setup Guide: `docs/setup/SETUP-COMPLETO.md`
