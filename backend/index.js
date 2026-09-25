import { createApp } from './app.js';
import { fileURLToPath } from 'node:url';
const port = Number(process.env.PORT || 3001);
const dataFile = fileURLToPath(new URL('./data/content.json', import.meta.url));
createApp({ dataFile, adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD }).listen(port, () => console.log(`API listening on http://localhost:${port}`));
