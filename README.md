# Transformer Thermal Inspection - Frontend

This repository contains the frontend for managing transformer thermal inspections, built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. It provides a modern, responsive user interface for interacting with the backend API.

-----

## Prerequisites

Ensure the following are installed on your system before proceeding with the setup:

* **Node.js 18+**
* **npm 9+** (or **yarn**)
* **VS Code** or **IntelliJ IDEA**

-----

## Setup Instructions

### Setup Using npm

1. Open the project folder in VS Code or your preferred editor.
2. In the integrated terminal, run:
    ```powershell
    npm install
    ```

### How to Run

1. Start the development server:
    ```powershell
    npm run dev
    ```
2. Access the application at:
    * **Frontend Port**: `http://localhost:8080`
    * **Backend API Port**: `https://arbit-backend-1.onrender.com` (for data)


## Configuration Details

Core configurations for the frontend are found in:

* **`vite.config.ts`**: Vite build and dev server settings.
* **`tailwind.config.ts`**: Tailwind CSS customization.
* **`tsconfig.json`**: TypeScript configuration.
* **`src/index.css`**: Global styles.

API endpoints for backend communication should be configured in your service or environment files as needed.

-----

### Features

- **Dashboard:** View summaries and statistics of all transformer inspections, including recent activity and status highlights.
- **Transformer Management:** Add, view, update, delete, and filter transformer records by criteria such as location, status, or type.
- **Inspection Management:** Log new inspections, review inspection history, update results, and filter by date, transformer, or outcome.
- **Image Management:** Upload, view, update, delete, and compare baseline and maintenance (thermal) images for transformers and inspections to monitor health and detect anomalies.
- **Settings:** Adjust application preferences such as theme and notifications.

-----

## Limitations and Known Issues

* **No Authentication/Authorization**: The frontend currently does not implement user authentication or authorization.
* **API Endpoint Configuration**: Ensure the backend API URL is correctly set for production and development environments.
* **Port Conflicts**: The app runs on port `5173` by default. Change the port in `vite.config.ts` if needed.
* **Error Handling**: Error handling for API failures is basic.
* **Backend Dependency**: The frontend requires the backend API to be running and accessible for full functionality.

-----

## Folder Structure

```
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   ├── robots.txt
│   └── user.png
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── AddInspectionModal.tsx
│   │   ├── AddTransformerModal.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── Layout.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ui/
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── ... (other UI components)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   └── pages/
│       ├── Dashboard.tsx
│       ├── InspectionDetail.tsx
│       ├── NotFound.tsx
│       ├── Settings.tsx
│       └── TransformerDetail.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── ... (other config and lock files)
```

-----

