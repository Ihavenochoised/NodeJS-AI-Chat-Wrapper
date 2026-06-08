import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'public');

const routesFile = path.join(__dirname, 'routes.json');
const routes = JSON.parse(fs.readFileSync(routesFile, 'utf-8'));

for (const [routePath, pageFile] of Object.entries(routes)) {
    router.get(routePath, (req, res) => {
        res.sendFile(path.join(root, pageFile));
    });
    router.all(routePath, (req, res) => {
        res.status(405).set('Allow', 'GET').send('Method Not Allowed');
    });
}

export default router;
