import express from 'express';
import loginLimiter from '../services/rateLimit.js';
import Database from "better-sqlite3";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const databasePath = path.join(__dirname, '..', 'users', 'app.db');
const db = new Database(databasePath);

router.post('/', loginLimiter, express.urlencoded({ extended: true }), (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    if (username === ADMIN_USERNAME && bcrypt.compare(password, hashedAdminPassword)) {
        req.session.loggedIn = true;
        res.redirect("/");
    } else {
        res.send("Login failed 😢");
    }
});

export default router;