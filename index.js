import 'dotenv/config';
import express from "express";
import session from "express-session"
import path from "path";
import { fileURLToPath } from "url";
import pageRouter from "./routes/routes.js";
import apiRouter from "./routes/api.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultsecretthatssuperlongandsecure1234567890!@#$%^&*()XYZ',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        sameSite: 'lax'
    } 
}));

// 🧩 Routers
app.use("/", pageRouter);
app.use("/api", express.json(), apiRouter);

// 404 fallback
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "/public/404.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
