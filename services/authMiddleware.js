function authMiddleware(req, res, next) {
    if (req.session.loggedIn) {
        console.log("Authenticated access to:", req.originalUrl);
        next(); 
    } else {
        console.log(`Unauthorized access attempt to: ${req.originalUrl}, using ${req.method} method`);
        res.redirect('/login');
    }
}

export default authMiddleware;