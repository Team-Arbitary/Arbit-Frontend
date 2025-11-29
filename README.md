<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui" />
</p>

<h1 align="center">Arbit Frontend</h1>

<p align="center">
  <strong>Transformer Thermal Inspection Management System - Web Application</strong>
</p>

<p align="center">
  A modern, responsive React application for managing transformer thermal inspections, viewing AI-powered analysis results, and generating comprehensive maintenance reports.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#form-generation-system">Form System</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#team">Team</a>
</p>

---

## Team Arbitary

| Name | Role |
|------|------|
| **Yasiru Basnayake** | Full Stack Developer |
| **Kumal Loneth** | Backend Developer |
| **Dasuni Dissanayake** | Frontend Developer |
| **Hasitha Gallella** | ML/AI Engineer |

---

## Features

- **Interactive Dashboard** - Overview of all transformers, inspections, and analytics
- **Transformer Management** - Add, edit, delete, and filter transformer records
- **Inspection Tracking** - Complete inspection lifecycle management
- **Image Management** - Upload and compare baseline vs thermal images
- **AI Analysis View** - Visualize ML-detected anomalies with annotated images
- **Report Generation** - Dynamic form generation for maintenance records
- **Version History** - View and restore previous report versions
- **PDF Export** - Generate printable reports
- **Dark/Light Mode** - Customizable theme support
- **Responsive Design** - Works on desktop, tablet, and mobile

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **npm 9+** or **yarn** or **bun**

### Installation

```bash
# Clone the repository
git clone https://github.com/Team-Arbitary/Arbit-Frontend.git
cd Arbit-Frontend/app

# Install dependencies
npm install

# Start development server
npm run dev
```

**Access the application at:** `http://localhost:8080`

### Build for Production

```bash
npm run build
npm run preview
```

---

## Form Generation System

### Overview

The application features a sophisticated **dynamic form generation system** for creating and managing inspection reports. Forms are designed to match official CEB (Ceylon Electricity Board) formats.

### Form Types

#### 1. Maintenance Record Form

Comprehensive maintenance documentation including:

| Section | Fields |
|---------|--------|
| **Header Info** | Start/Completion time, Supervised by |
| **Gang Composition** | Tech I, II, III, Helpers |
| **Work Data Sheet** | KVA, Make, Tap Position, Earth Resistance |
| **Transformer Inspection** | Bushing condition, Oil level, Connections |
| **Checklist** | 50+ inspection items with checkboxes |
| **Signatures** | Inspected by, Rectified by, CSS approval |

#### 2. Thermal Image Inspection Form

Thermal analysis documentation including:

| Section | Fields |
|---------|--------|
| **Inspection Details** | Date, Time, Weather conditions |
| **Thermal Findings** | Hotspot locations, Temperature readings |
| **Analysis Results** | ML detection results, Severity levels |
| **Recommendations** | Suggested actions, Priority level |

### How Form Saving Works

```
+------------------+     +------------------+     +------------------+
|  User fills      |---->|  Form validates  |---->|  JSON payload    |
|  form fields     |     |  all sections    |     |  generated       |
+------------------+     +------------------+     +------------------+
                                                         |
                                                         v
+------------------+     +------------------+     +------------------+
|  Version saved   |<----|  Backend saves   |<----|  API POST with   |
|  in history      |     |  new version     |     |  report_data     |
+------------------+     +------------------+     +------------------+
```

### Form Data Structure

Forms are stored as structured JSON:

```typescript
interface MaintenanceReportData {
  // Timing & Supervision
  startTime: string;
  completionTime: string;
  supervisedBy: string;
  
  // Gang Composition
  gangComposition: {
    tech1: string;
    tech2: string;
    tech3: string;
    helpers: string;
  };
  
  // Work Data Sheet
  workDataSheet: {
    gangLeader: string;
    serialNo: string;
    kva: string;
    make: string;
    tapPosition: string;
    earthResistance: string;
    // ... more fields
  };
  
  // Checklist Items
  checklist: {
    [key: string]: boolean;
  };
  
  // Signatures
  signatures: {
    inspectedBy: string;
    inspectedDate: string;
    rectifiedBy: string;
    rectifiedDate: string;
    // ... more signatures
  };
}
```

### Version History

- **Auto-versioning**: Each save creates a new version automatically
- **History View**: Browse all previous versions in a table
- **Restore**: Click to restore any previous version as current
- **Compare**: View differences between versions

---

## Architecture

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component library |
| **React Router** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |
| **GSAP** | Animations |

### Project Structure

```
Arbit-Frontend/
└── app/
    ├── public/
    │   └── robots.txt
    ├── src/
    │   ├── components/
    │   │   ├── ui/                    # shadcn/ui components
    │   │   │   ├── button.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   └── ...
    │   │   ├── AddTransformerModal.tsx
    │   │   ├── AddInspectionModal.tsx
    │   │   ├── MaintenanceRecordForm.tsx    # Main report form
    │   │   ├── ThermalImageInspectionForm.tsx
    │   │   ├── AppSidebar.tsx
    │   │   ├── Layout.tsx
    │   │   └── ThemeProvider.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx          # Main dashboard
    │   │   ├── TransformerDetail.tsx  # Transformer view
    │   │   ├── InspectionDetail.tsx   # Inspection + analysis
    │   │   ├── Reports.tsx            # Report management
    │   │   ├── Settings.tsx
    │   │   ├── Login.tsx
    │   │   └── Signup.tsx
    │   ├── hooks/
    │   │   ├── use-mobile.tsx
    │   │   └── use-toast.ts
    │   ├── lib/
    │   │   ├── api.ts                 # API client and endpoints
    │   │   ├── auth.ts                # Authentication context
    │   │   └── utils.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `app/` directory:

```env
VITE_API_BASE_URL=http://localhost:5509/transformer-thermal-inspection
VITE_ML_API_URL=http://localhost:8000
```

### API Configuration (`src/lib/api.ts`)

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  || 'http://localhost:5509/transformer-thermal-inspection';

export const API_ENDPOINTS = {
  // Transformers
  TRANSFORMER_CREATE: '/transformer-management/create',
  TRANSFORMER_VIEW_ALL: '/transformer-management/view-all',
  TRANSFORMER_VIEW: (id: string) => `/transformer-management/view/${id}`,
  
  // Inspections
  INSPECTION_CREATE: '/inspection-management/create',
  INSPECTION_VIEW_ALL: '/inspection-management/view-all',
  
  // Reports
  MAINTENANCE_RECORDS: '/api/maintenance-records',
  THERMAL_REPORTS: '/api/thermal-inspection-reports',
  
  // ... more endpoints
};
```

---

## UI Components

### Key Components

| Component | Description |
|-----------|-------------|
| `Dashboard` | Main overview with stats, lists, and filters |
| `TransformerDetail` | Transformer info with inspection history |
| `InspectionDetail` | Full inspection view with images and analysis |
| `MaintenanceRecordForm` | Multi-tab form for maintenance records |
| `ThermalImageInspectionForm` | Thermal inspection documentation |
| `AppSidebar` | Navigation sidebar with user info |

### Theme Support

The application supports both light and dark modes:

```tsx
import { useTheme } from "@/components/ThemeProvider";

const { theme, setTheme } = useTheme();
setTheme("dark"); // or "light" or "system"
```

---

## API Integration

### Authentication

```typescript
// Login
const response = await api.post(API_ENDPOINTS.USER_LOGIN, {
  username: "user",
  password: "password"
});
const token = response.data.jwt;
localStorage.setItem("token", token);

// Authenticated requests (automatic via interceptor)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Data Fetching Example

```typescript
// Fetch inspections
const fetchInspections = async () => {
  const response = await api.get(API_ENDPOINTS.INSPECTION_VIEW_ALL);
  return response.data.responseData;
};

// Save maintenance record
const saveRecord = async (data: MaintenanceRecordRequest) => {
  const response = await api.post(API_ENDPOINTS.MAINTENANCE_RECORDS, data);
  return response.data;
};
```

---

## Responsive Design

The application is fully responsive:

| Breakpoint | Layout |
|------------|--------|
| Mobile (<768px) | Collapsible sidebar, stacked cards |
| Tablet (768-1024px) | Side-by-side with compact sidebar |
| Desktop (>1024px) | Full sidebar, multi-column layouts |

---

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Code Quality

- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** - Code formatting (recommended)

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Deployment

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made by <strong>Team Arbitary</strong>
</p>
