# 📱 Business Management Mobile App

A scalable mobile application built with React Native (Expo) for managing small and medium-sized businesses. The app connects to a **Django + Strawberry GraphQL backend** and implements **JWT authentication with role-based access control (RBAC)**.

---

## 🚀 Tech Stack

* **Framework:** React Native (Expo Router)
* **Navigation:** File-based routing (Expo Router + Tabs)
* **State Management:** Context API (Modular Providers)
* **API Layer:** GraphQL (Custom Fetch Client)
* **Storage:** AsyncStorage (Session persistence)
* **Authentication:** JWT + RBAC (from backend)

---

## 🧠 Architecture Overview

This frontend follows a **modular domain-driven architecture**:

### 🔹 Global Providers

The app is composed of multiple domain providers:

* Auth (authentication & session)
* Menu (UI state)
* Inventory
* POS (orders)
* Expenses
* HR (employees)
* Reports

All providers are composed centrally and injected globally.

---

### 🔹 Route Protection (Auth Guard)

* Uses Expo Router segments to control access

* Redirect logic:

  * ❌ Not authenticated → `/login`
  * ✅ Authenticated → main app tabs

* Displays loading screen during session restore

---

### 🔹 Tab Navigation

Main application is structured using bottom tabs:

* Dashboard
* Inventory
* Orders
* Expenses
* Reports

Each tab is:

* Themed dynamically
* Icon-driven (Ionicons)
* Safe-area aware

---

## 🔐 Authentication & RBAC

### ✅ Authentication Flow

1. User logs in via GraphQL mutation
2. Backend returns:

   * JWT token
   * Roles
   * Permissions
3. Data is stored in AsyncStorage
4. App restores session automatically on launch

---

### ✅ Stored Session Data

```json id="c8zv7s"
{
  "token": "...",
  "roles": ["Admin"],
  "permissions": ["create_order", "view_expense"]
}
```

---

### ✅ Authorization (Frontend-Aware)

* Permissions are available globally via `AuthContext`
* UI can adapt dynamically based on:

  * Roles
  * Permissions

Example:

* Hide buttons if permission is missing
* Restrict screens

---

## 🔗 GraphQL Integration

Custom lightweight GraphQL client:

```javascript id="a1u0t6"
graphqlRequest(query, variables)
```

### Features:

* Automatically attaches JWT token
* Handles:

  * Network errors
  * GraphQL errors
* Centralized request logic

---

### 🔌 Endpoint Configuration

```javascript id="f4nt1u"
const GRAPHQL_URL = "http://<your-local-ip>:8000/graphql/";
```

> ⚠️ Use local network IP for Android emulator (not localhost)

---

## 📦 Features

### 🛒 Orders / POS

* Create and manage orders
* Integrated POS workflow

---

### 💸 Expenses

* Record and track expenses
* Supplier debt tracking

---

### 📊 Inventory

* Track stock levels
* Monitor product flow

---

### 👨‍💼 Employee Management (HR)

* Create employees with permissions
* Fetch grouped permissions
* Role-based onboarding

---

### 📈 Reports

* Business insights (extendable)

---

## ⚙️ Setup & Installation

### 1️⃣ Clone repository

```bash id="hzr3u6"
git clone https://github.com/your-username/business-management-frontend.git
cd business-management-frontend
```

---

### 2️⃣ Install dependencies

```bash id="lcmn2g"
npm install
```

---

### 3️⃣ Start development server

```bash id="6fgx2p"
npx expo start
```

---

### 4️⃣ Run on device

* Android → Expo Go / Emulator
* iOS → Expo Go / Simulator

---

## 🧠 Project Structure

```id="4y3g7c"
app/
│── (auth)/              # Authentication screens
│── (tabs)/              # Main tab navigation
│── _layout.jsx          # Root layout + route guard

context/
│── AuthContext.jsx
│── InventoryContext.jsx
│── ExpensesContext.jsx
│── POSContext.jsx
│── HRContext.jsx
│── ReportsContext.jsx

lib/
│── graphql.js           # API client

services/
│── employeeService.js   # GraphQL service layer

hooks/
│── useTheme.js

components/
│── Reusable UI components
```

---

## 🧩 Service Layer Design

API logic is separated into services:

### Example: Employee Onboarding

* Single GraphQL mutation
* Fully atomic operation (backend controlled)

```javascript id="0m8y9r"
createEmployeeWithPermissionsService(...)
```

---

## 🎯 Design Principles

* Separation of concerns (UI vs API vs State)
* Centralized authentication logic
* Scalable context-based state management
* Modular and reusable components
* Backend-driven authorization (RBAC)

---

## 🔄 Future Improvements

* Offline support
* Push notifications
* Real-time updates (GraphQL subscriptions)
* Permission-based navigation guards
* UI personalization per role

---

## 🔗 Backend Dependency

This app requires the backend:

* Django + Strawberry GraphQL
* Custom JWT + RBAC system

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Part of a full-stack business management system integrating:

* Mobile (React Native)
* Backend (Django + GraphQL)
* Desktop (PySide6)

---
