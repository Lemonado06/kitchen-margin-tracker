
// Kitchen staff may only view data and add orders.
// This runs before every route, so the limit holds even for routes
// that do not check roles themselves. Owners and managers pass through.

const { requireAuth } = require('./middleware');

// Areas that expose profit, costs, account management or audit activity.
const BLOCKED = [
    '/dashboard',
    '/ai',
    '/fee-rules',
    '/recipe-items',
    '/users',
    '/activity',
];

const under = (path, base) =>
    path === base || path.startsWith(`${base}/`);

function staffGuard(req, res, next) {
    const path = (req.path.replace(/\/+$/, '') || '/').toLowerCase();

    if (
        !req.headers.authorization ||
        under(path, '/auth') ||
        path === '/health'
    ) {
        return next();
    }

    Promise.resolve(
        requireAuth(req, res, () => {
            if (req.user.role !== 'staff') return next();

            const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
            const addsOrder = req.method === 'POST' && path === '/orders';

            if (
                BLOCKED.some((b) => under(path, b)) ||
                !(readOnly || addsOrder)
            ) {
                return res.status(403).json({
                    error: 'Kitchen staff can only view and add orders',
                });
            }

            next();
        })
    ).catch(next);
}

module.exports = staffGuard;
