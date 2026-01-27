# Frontend Context - SaudeNold

**Last Updated:** 2026-01-27  
**Última Atualização:** 2026-01-27

## Technology Stack

- **Framework**: Expo 54 (React Native)
- **Routing**: Expo Router (file-based)
- **State Management**: React Hooks, Context API
- **Storage**: AsyncStorage (offline-first), SecureStore (tokens)
- **HTTP Client**: Axios with interceptors
- **UI Components**: Custom components optimized for accessibility

## Project Structure

```
app/                      # Expo Router pages (file-based routing)
├── _layout.js           # Root layout with navigation
├── index.js             # Home screen
├── medications/         # Medication management
├── doctor-visits/       # Medical appointments
├── medical-exams/       # Exam records
├── daily-tracking/      # Daily health metrics
├── emergency-contacts/  # Emergency contacts
├── family/              # Family management
│   ├── invites.js      # Manage invitations
│   └── accept-invite.js # Accept invitation
└── profile-selection.js # Profile switching

components/              # Reusable components
├── VoiceTextInput.js   # Voice input component
├── ProfileCard.js       # Profile display card
├── LineChart.js         # Chart component
└── ...

services/                # Business logic
├── api.js              # API client with interceptors
├── auth.js             # Authentication functions
├── authStorage.js      # Token storage (SecureStore)
├── tokenManager.js     # Token refresh loop
├── profileService.js   # Profile management
├── sync.js             # Data synchronization
└── ...

hooks/                   # Custom React hooks
├── useProfileAuthGuard.js
├── useProfileChange.js
└── ...

contexts/                # React contexts
├── ThemeContext.js     # Theme management
└── FontSizeContext.js  # Font size management
```

## Key Services

### API Client (`services/api.js`)
- Axios instance with base configuration
- Request interceptor: Adds JWT token, X-Profile-Id header, CSRF token
- Response interceptor: Handles 401 errors, auto-refresh tokens
- Error handling: Connection errors, authentication errors

### Authentication (`services/auth.js`)
- `loginUser()` - User login
- `registerUser()` - User registration
- `logoutUser()` - User logout
- `refreshAccessToken()` - Refresh access token
- `hasAuthToken()` - Check if user is authenticated

### Token Management (`services/tokenManager.js`)
- `startTokenRefreshLoop()` - Start automatic token refresh (every 13 min)
- `stopTokenRefreshLoop()` - Stop refresh loop
- Integrated with `_layout.js` to start on login

### Profile Management (`services/profileService.js`)
- `getActiveProfile()` - Get current active profile
- `setActiveProfile()` - Switch active profile
- `loadProfiles()` - Load all family profiles
- `syncProfilesWithServer()` - Sync profiles with backend

### Data Synchronization (`services/sync.js`)
- `syncData()` - Main sync function
- Handles bidirectional sync (local ↔ server)
- Conflict resolution (server timestamp wins)
- Offline queue for failed operations

## Storage Architecture

### AsyncStorage Structure
```
# Profile-scoped keys
profile_${profileId}_medications
profile_${profileId}_medical_exams
profile_${profileId}_doctor_visits
...

# Profile-agnostic keys
profiles
activeProfileId
lastSync
```

### SecureStore (Tokens)
```
# Profile-scoped
profile_${profileId}_authToken
profile_${profileId}_refreshToken
profile_${profileId}_authUser
```

## Authentication Flow

1. **Login** → Save tokens to SecureStore → Start refresh loop
2. **API Requests** → Interceptor adds token to headers
3. **Token Refresh** → Automatic every 13 minutes
4. **401 Error** → Auto-refresh → Retry request
5. **Refresh Fails** → Logout user

## Profile Switching Flow

1. **User selects profile** → `setActiveProfile(profileId)`
2. **Load profile data** → From AsyncStorage (profile-scoped keys)
3. **Update API headers** → Set `X-Profile-Id` header
4. **Sync profile data** → Sync with backend if available

## Offline-First Pattern

```javascript
// Save locally first (always works)
await AsyncStorage.setItem(key, JSON.stringify(data));

// Try to sync with backend (optional)
try {
  await api.post('/api/resource', data);
} catch (error) {
  // Continue with local data only
  console.warn('Sync failed, using local data');
}
```

## UI/UX Guidelines

### Accessibility Requirements
- **Font Sizes**: 24-40px for body text
- **Button Sizes**: Minimum 80x80px
- **Touch Targets**: Minimum 44x44px
- **Color Contrast**: WCAG AA compliant
- **Icons + Text**: Always together, never icon-only

### Color Palette
- 🟦 **Azul/Turquesa (#4ECDC4)**: Medicamentos
- 🟥 **Vermelho (#FF6B6B)**: Contatos de Emergência
- 🟩 **Verde (#95E1D3)**: Visitas Médicas
- 🟧 **Coral (#F38181)**: Histórico
- 🟪 **Roxo (#9B59B6)**: Exames Médicos

### Navigation Patterns
- **Simple Navigation**: Max 3-4 buttons per screen
- **Breadcrumbs**: Show current location
- **Back Button**: Always visible
- **Loading States**: Show progress indicators
- **Error States**: Clear error messages

## Code Examples

### Complete Screen Component
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { getMedications } from '../services/medications';
import { getActiveProfile } from '../services/profile';

export default function MedicationsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const profile = await getActiveProfile();
      if (!profile) {
        router.push('/profile/select');
        return;
      }
      const data = await getMedications(profile.id);
      setMedications(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Carregando...</Text>;

  return (
    <View>
      {medications.map(med => (
        <View key={med.id}>
          <Text>{med.name}</Text>
        </View>
      ))}
    </View>
  );
}
```

### Token Refresh Loop
```javascript
// services/tokenManager.js
import { refreshAccessToken } from './auth';

let refreshInterval = null;

export const startTokenRefreshLoop = async () => {
  if (refreshInterval) clearInterval(refreshInterval);
  
  await refreshTokenIfNeeded();
  refreshInterval = setInterval(refreshTokenIfNeeded, 780000); // 13 min
};

const refreshTokenIfNeeded = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (refreshToken) {
      await refreshAccessToken(refreshToken);
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
};
```

## Common Patterns

### API Calls with Profile
```javascript
const profileId = await getActiveProfileId();
const response = await api.get('/api/medications', {
  headers: { 'X-Profile-Id': profileId }
});
```

### Offline Data Handling
```javascript
// Load from local storage
const localData = await AsyncStorage.getItem(key);
if (localData) {
  return JSON.parse(localData);
}

// Try to fetch from server
try {
  const serverData = await api.get('/api/resource');
  await AsyncStorage.setItem(key, JSON.stringify(serverData));
  return serverData;
} catch (error) {
  // Return empty or cached data
  return [];
}
```

### Error Handling
```javascript
try {
  await api.post('/api/resource', data);
} catch (error) {
  if (error.response?.status === 401) {
    // Token refresh handled by interceptor
    throw error;
  } else if (error.response?.status === 403) {
    Alert.alert('Erro', 'Sem permissão para esta ação');
  } else {
    Alert.alert('Erro', error.response?.data?.detail || 'Erro desconhecido');
  }
}
```

## State Management

### Context API Usage
- **ThemeContext**: Theme colors, dark/light mode
- **FontSizeContext**: Font size preferences

### Local State
- Use `useState` for component-specific state
- Use `useEffect` for side effects
- Use `useCallback` for memoized functions
- Use `useMemo` for expensive computations

## Performance Optimization

- **Lazy Loading**: Load screens on demand
- **Image Optimization**: Compress images before upload
- **List Virtualization**: Use FlatList for long lists
- **Memoization**: Memoize expensive components
- **Debouncing**: Debounce search inputs

## Testing Considerations

- **Unit Tests**: Test services and utilities
- **Integration Tests**: Test API interactions
- **E2E Tests**: Test user flows (planned)
- **Accessibility Tests**: Test with screen readers

## Environment Variables

```env
# Backend URL
EXPO_PUBLIC_API_URL=http://localhost:8000

# API Key (for public endpoints)
EXPO_PUBLIC_API_KEY=your-api-key

# Gemini AI (for exam extraction)
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

## Common Issues & Solutions

### Token Expiration
- **Symptom**: 401 errors after inactivity
- **Solution**: Token refresh loop handles automatically

### Profile Not Found
- **Symptom**: Data not loading
- **Solution**: Check `X-Profile-Id` header, verify profile exists

### Sync Conflicts
- **Symptom**: Data inconsistencies
- **Solution**: Server timestamp wins, local changes queued

### Offline Mode
- **Symptom**: API calls failing
- **Solution**: App continues with local data, syncs when online
