# Hotel Management System Architecture Diagram

## System Overview
This is a React Native (Expo) mobile application for managing hotel/restaurant businesses with a Django + Strawberry GraphQL backend.

```mermaid
graph TB
    subgraph "Mobile App (React Native/Expo)"
        Root[Root Layout - app/_layout.jsx]
        AuthProvider[AuthProvider]
        RouteGuard[Route Guard]
        Slot[Slot - Route Renderer]
        
        Root --> AuthProvider
        AuthProvider --> RouteGuard
        RouteGuard --> Slot
    end
    
    subgraph "Authentication Flow"
        Login[Login Screen]
        Register[Register Screen]
        VerifyEmail[Verify Email Screen]
        PinGate[Pin Gate Screen]
        SetPin[Set PIN Screen]
        
        Slot --> Login
        Slot --> Register
        Slot --> VerifyEmail
        Slot --> PinGate
        Slot --> SetPin
    end
    
    subgraph "Main App Tabs"
        TabsLayout[Tabs Layout]
        Dashboard[Dashboard]
        Inventory[Inventory Tab]
        Orders[Orders Tab]
        Expenses[Expenses Tab]
        Reports[Reports Tab]
        
        Slot --> TabsLayout
        TabsLayout --> Dashboard
        TabsLayout --> Inventory
        TabsLayout --> Orders
        TabsLayout --> Expenses
        TabsLayout --> Reports
    end
    
    subgraph "Context Providers (State Management)"
        MenuProvider[MenuContext]
        InventoryProvider[InventoryContext]
        POSProvider[POSContext]
        ExpensesProvider[ExpensesContext]
        HRProvider[HRContext]
        ReportsProvider[ReportsContext]
        
        RouteGuard --> MenuProvider
        MenuProvider --> InventoryProvider
        InventoryProvider --> POSProvider
        POSProvider --> ExpensesProvider
        ExpensesProvider --> HRProvider
        HRProvider --> ReportsProvider
    end
    
    subgraph "Service Layer (GraphQL)"
        EmployeeService[employeeService.js]
        ExpenseService[expenseService.js]
        HRService[hrService.js]
        InventoryService[inventoryService.js]
        MenuService[menuService.js]
        POSService[posService.js]
        ReportsService[reportsService.js]
    end
    
    subgraph "API Layer"
        GraphQLClient[lib/graphql.js]
        AuthSession[lib/authSession.js]
    end
    
    subgraph "Storage"
        AsyncStorage[AsyncStorage]
        SecureStore[SecureStore]
    end
    
    subgraph "Backend (Django + GraphQL)"
        GraphQLAPI[GraphQL API]
        AuthAPI[Auth API]
    end
    
    %% Data Flow
    Dashboard --> HRProvider
    Inventory --> InventoryProvider
    Orders --> POSProvider
    Expenses --> ExpensesProvider
    Reports --> ReportsProvider
    
    %% Context to Services
    InventoryProvider --> InventoryService
    POSProvider --> POSService
    ExpensesProvider --> ExpenseService
    HRProvider --> HRService
    ReportsProvider --> ReportsService
    MenuProvider --> MenuService
    
    %% Services to API
    InventoryService --> GraphQLClient
    POSService --> GraphQLClient
    ExpenseService --> GraphQLClient
    HRService --> GraphQLClient
    ReportsService --> GraphQLClient
    MenuService --> GraphQLClient
    
    %% Auth Flow
    AuthProvider --> AuthSession
    AuthProvider --> GraphQLClient
    Login --> AuthProvider
    Register --> AuthProvider
    
    %% Storage
    AuthSession --> AsyncStorage
    AuthSession --> SecureStore
    GraphQLClient --> AsyncStorage
    
    %% Backend
    GraphQLClient --> GraphQLAPI
    GraphQLClient --> AuthAPI
```

## Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant LoginScreen
    participant AuthProvider
    participant GraphQLClient
    participant Backend
    participant AsyncStorage
    participant SecureStore
    participant RouteGuard
    
    User->>LoginScreen: Enter credentials
    LoginScreen->>AuthProvider: login(email, password)
    AuthProvider->>GraphQLClient: publicRequest(LOGIN_MUTATION)
    GraphQLClient->>Backend: POST /auth/ (GraphQL)
    Backend-->>GraphQLClient: JWT token + roles + permissions
    GraphQLClient-->>AuthProvider: Session data
    AuthProvider->>AsyncStorage: Store token, roles, permissions
    AuthProvider->>SecureStore: Check if PIN set
    AuthProvider-->>LoginScreen: Login success
    
    Note over AuthProvider,RouteGuard: Route Guard Check
    AuthProvider->>RouteGuard: isAuthenticated = true
    RouteGuard->>RouteGuard: Check PIN status
    
    alt PIN not set
        RouteGuard->>User: Redirect to /set-pin
        User->>SetPin: Set PIN
        SetPin->>SecureStore: Store hashed PIN
    else PIN set but not verified
        RouteGuard->>User: Redirect to /pin-gate
        User->>PinGate: Enter PIN
        PinGate->>SecureStore: Verify PIN hash
        SecureStore-->>PinGate: Verification result
    end
    
    RouteGuard->>User: Redirect to /tabs
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "UI Components"
        InventoryScreen[Inventory Screen]
        OrdersScreen[Orders Screen]
        ExpensesScreen[Expenses Screen]
    end
    
    subgraph "Context Providers"
        InventoryCtx[InventoryContext]
        POSCtx[POSContext]
        ExpensesCtx[ExpensesContext]
    end
    
    subgraph "Service Layer"
        InventorySvc[inventoryService.js]
        POSSvc[posService.js]
        ExpensesSvc[expenseService.js]
    end
    
    subgraph "API Layer"
        GraphQL[graphql.js]
    end
    
    subgraph "Backend"
        Django[Django + Strawberry GraphQL]
    end
    
    InventoryScreen --> InventoryCtx
    OrdersScreen --> POSCtx
    ExpensesScreen --> ExpensesCtx
    
    InventoryCtx --> InventorySvc
    POSCtx --> POSSvc
    ExpensesCtx --> ExpensesSvc
    
    InventorySvc --> GraphQL
    POSSvc --> GraphQL
    ExpensesSvc --> GraphQL
    
    GraphQL --> Django
    
    Django --> GraphQL
    GraphQL --> InventorySvc
    GraphQL --> POSSvc
    GraphQL --> ExpensesSvc
    
    InventorySvc --> InventoryCtx
    POSSvc --> POSCtx
    ExpensesSvc --> ExpensesCtx
    
    InventoryCtx --> InventoryScreen
    POSCtx --> OrdersScreen
    ExpensesCtx --> ExpensesScreen
```

## Provider Hierarchy & Data Flow

```mermaid
graph TB
    subgraph "Provider Composition Tree"
        AuthP[AuthProvider]
        Guard[RouteGuard]
        MenuP[MenuProvider]
        InvP[InventoryProvider]
        POSP[POSProvider]
        ExpP[ExpensesProvider]
        HRP[HRProvider]
        RepP[ReportsProvider]
        App[App Components]
        
        AuthP --> Guard
        Guard --> MenuP
        MenuP --> InvP
        InvP --> POSP
        POSP --> ExpP
        ExpP --> HRP
        HRP --> RepP
        RepP --> App
    end
    
    subgraph "Shared State Access"
        AuthP -->|provides| AuthData[Token, Roles, Permissions]
        MenuP -->|provides| MenuData[Menu items, categories]
        InvP -->|provides| InvData[Products, stock, categories]
        POSP -->|provides| POSData[Orders, receipts, sessions]
        ExpP -->|provides| ExpData[Expenses, suppliers]
        HRP -->|provides| HRData[Employees, permissions]
        RepP -->|provides| RepData[Reports, analytics]
    end
    
    subgraph "Cross-Provider Dependencies"
        POSP -->|uses| InvP
        POSP -->|uses| MenuP
        InvP -->|uses| MenuP
    end
```

## Key Architecture Patterns

### 1. **File-Based Routing (Expo Router)**
- `app/_layout.jsx` - Root layout with route guard
- `app/(auth)/` - Authentication screens group
- `app/(tabs)/` - Main tab navigation group
- Automatic route protection based on auth state

### 2. **Context-Based State Management**
- Modular providers for each domain (Auth, Inventory, POS, etc.)
- Provider composition tree for dependency injection
- Centralized state management with React hooks

### 3. **Service Layer Pattern**
- Separation of UI logic from API calls
- GraphQL services in `services/` directory
- Normalized data responses from backend
- Centralized error handling

### 4. **Authentication & Security**
- JWT-based authentication with Django backend
- Role-based access control (RBAC)
- PIN gate for device-level security
- Secure storage for sensitive data (SecureStore)
- Session persistence with AsyncStorage

### 5. **API Communication**
- Custom GraphQL client (`lib/graphql.js`)
- Automatic token injection in requests
- Environment-based API endpoint configuration
- Centralized error handling with auth failure detection

## Technology Stack

**Frontend:**
- React Native 0.81.5
- Expo ~54.0.36
- Expo Router for navigation
- React Context API for state management
- AsyncStorage for session persistence
- Expo SecureStore for sensitive data

**Backend:**
- Django + Strawberry GraphQL
- JWT authentication
- Multi-tenant architecture (schema-based)
- Role-based access control

**Key Libraries:**
- `@react-navigation/native` - Navigation
- `@react-native-async-storage/async-storage` - Storage
- `expo-secure-store` - Secure storage
- `react-native-chart-kit` - Charts/reports
- `expo-haptics` - Haptic feedback

## File Structure

```
hotel-management/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── verify-email.jsx
│   │   └── _layout.jsx
│   ├── (tabs)/              # Main tab navigation
│   │   ├── index.jsx        # Dashboard
│   │   ├── inventory.jsx
│   │   ├── orders.jsx
│   │   ├── expenses.jsx
│   │   ├── reports.jsx
│   │   └── _layout.jsx
│   ├── _layout.jsx          # Root layout + route guard
│   ├── pin-gate.jsx         # PIN verification
│   └── set-pin.jsx          # PIN setup
├── context/                 # State management providers
│   ├── AuthContext.jsx
│   ├── InventoryContext.jsx
│   ├── POSContext.jsx
│   ├── ExpensesContext.jsx
│   ├── HRContext.jsx
│   ├── ReportsContext.jsx
│   └── MenuContext.jsx
├── services/                # GraphQL service layer
│   ├── employeeService.js
│   ├── expenseService.js
│   ├── hrService.js
│   ├── inventoryService.js
│   ├── menuService.js
│   ├── posService.js
│   └── reportsService.js
├── lib/                     # Core utilities
│   ├── graphql.js          # GraphQL client
│   └── authSession.js      # Auth session management
├── components/             # Reusable UI components
│   ├── Expenses/
│   ├── HR/
│   ├── Inventory/
│   ├── POS/
│   └── Reports/
└── hooks/                  # Custom React hooks
    └── useTheme.js
```

## Data Flow Summary

1. **User Authentication**: Login → JWT token → AsyncStorage → Route Guard → Main App
2. **PIN Security**: Session active → PIN check → SecureStore verification → App access
3. **Data Loading**: Component → Context Provider → Service → GraphQL → Backend
4. **State Updates**: Backend response → Service normalization → Context update → UI re-render
5. **Cross-Domain**: POS uses Inventory data, Inventory uses Menu data (provider dependencies)

## Security Features

- JWT token-based authentication
- Role-based access control (RBAC)
- PIN gate with lockout after failed attempts
- Secure storage for PIN hashes
- Automatic session cleanup on auth failure
- Environment-based API endpoint configuration
