# College website and management system

A small npm workspace containing two applications:

```text
college/
├── frontend/             React web application
│   ├── public/assets/    Images used by the website
│   └── src/              TypeScript and CSS source
├── backend/              Node.js API and tests
├── docs/                 Project decisions and template inventory
├── package.json          Shared development commands
└── package-lock.json     Reproducible dependency versions
```

## Technology

- Frontend: React 19, TypeScript, Vite, and CSS
- Backend: Node.js using the built-in HTTP, crypto, filesystem, and test modules
- Current data storage: local JSON file for development only
- Package setup: npm workspaces

## Run locally

Requires Node.js 22 and npm. Install dependencies once from the project root:

```sh
npm install
```

Start the backend and frontend in separate terminals from the project root:

```sh
ADMIN_EMAIL=admin@example.edu ADMIN_PASSWORD='a-long-unique-development-password' npm run api
```

```sh
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3001`. Use **Admin portal** to create and publish notices. Runtime notice data is written to the ignored `backend/data/content.json` file.

## Checks

```sh
npm run build
npm test
npm run clean
```

`build` validates TypeScript and creates `frontend/dist`. `test` checks the protected notice publishing workflow. `clean` removes generated frontend build output.

## Current limits

This is a development slice. Authentication uses one environment-configured admin, sessions live in server memory, and content uses local file storage. Do not use it for real student data or public deployment. Production work still requires a database, production identity provider, MFA, authorization scopes, audit controls, and the remaining modules from the requirements.
