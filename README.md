# College website and management system

The repository contains separate frontend and backend applications:

```text
college/
├── frontend/             React web application
│   ├── public/assets/    Website images
│   └── src/              TypeScript and CSS source
├── backend/              ASP.NET Core Web API
│   ├── Controllers/      HTTP API controllers
│   ├── Models/           API and storage models
│   ├── Services/         JSON content storage
│   └── Program.cs        Application setup and middleware
├── docs/                 Project decisions and template inventory
├── package.json          Convenient root commands
└── package-lock.json     Frontend dependency versions
```

## Technology

- Frontend: React 19, TypeScript, Vite, and CSS
- Backend: ASP.NET Core 8 Web API with C#
- Current data storage: local JSON file for development only
- Authentication: ASP.NET Core cookie authentication for the development admin

## Requirements

- Node.js 22 and npm
- .NET 8 SDK

Install frontend dependencies once from the project root:

```sh
npm install
```

## Run locally

Start the backend and frontend in separate terminals from the project root.

Backend:

```sh
ADMIN_EMAIL=admin@example.edu ADMIN_PASSWORD='a-long-unique-development-password' npm run api
```

Frontend:

```sh
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3001`. Use **Admin portal** to create and publish notices. Runtime notice data is written to the ignored `backend/data/content.json` file.

## Build

```sh
npm run build
```

This validates and builds both applications. Use `npm run build:frontend` or `npm run build:backend` to build one application. `npm run clean` removes generated build output.

## Current limits

This is a development slice. Authentication uses one environment-configured admin and content uses local file storage. Do not use it for real student data or public deployment. Production work still requires a database, production identity provider, MFA, authorization scopes, audit controls, and the remaining modules from the requirements.
