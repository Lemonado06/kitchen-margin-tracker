// Kitchen staff may only view data and add orders. This runs before every route, so the limit holds
// even for routes that do not check roles themselves. Owners and managers pass straight through.
const { requireAuth } = require('./middleware');

// Areas that expose profit, costs or account management: closed to staff completely
const BLOCKED = ['/dashboard', '/ai', '/fee-rules', '/recipe-items', '/users'];
const under = (path, base) => path === base || path.startsWith(`${base}/`);

function staffGuard(req, res, next) {
    const path = (req.path.replace(/\/+$/, '') || '/').toLowerCase(); // Express matches routes case-insensitively
    if (!req.headers.authorization || under(path, '/auth') || path === '/health') return next(); // routes return their own 401
    Promise.resolve(requireAuth(req, res, () => {
        if (req.user.role !== 'staff') return next();
        const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
        const addsOrder = req.method === 'POST' && path === '/orders';
        if (BLOCKED.some((b) => under(path, b)) || !(readOnly || addsOrder)) {
            return res.status(403).json({ error: 'Kitchen staff can only view and add orders' });
        }
        next();
    })).catch(next);
}

module.exports = staffGuard;