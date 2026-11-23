
const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('./middleware');
const { AuditLog, User } = require('./models');

router.use(requireAuth, requireRole('owner'));

// Every query is scoped to the authenticated owner.
// Never accept account_id from the client.
const accountFilter = (req) => ({
    account_id: req.user.id,
});

function parseDate(value, endOfDay = false) {
    if (!value) return null;

    const date = new Date(
        `${String(value).slice(0, 10)}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    );

    return Number.isNaN(date.getTime()) ? null : date;
}

function pagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}

function serializeLog(log) {
    return typeof log.toJSON === 'function' ? log.toJSON() : log;
}


// GET /activity
// Paginated activity feed with filters.
router.get('/', async (req, res) => {
    try {
        const { page, limit, skip } = pagination(req.query);

        const filter = accountFilter(req);

        if (req.query.user_id) {
            const userExists = await User.exists({
                _id: req.query.user_id,
                $or: [
                    { _id: req.user.id },
                    { owner_id: req.user.id },
                ],
            });

            if (!userExists) {
                return res.status(404).json({ error: 'User not found' });
            }

            filter.user_id = req.query.user_id;
        }

        if (req.query.module) {
            filter.module = String(req.query.module).toUpperCase();
        }

        if (req.query.action) {
            filter.action = String(req.query.action).toUpperCase();
        }

        const from = parseDate(req.query.from);
        const to = parseDate(req.query.to, true);

        if ((req.query.from && !from) || (req.query.to && !to)) {
            return res.status(400).json({ error: 'Invalid date filter' });
        }

        if (from || to) {
            filter.created_at = {};

            if (from) filter.created_at.$gte = from;
            if (to) filter.created_at.$lte = to;
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),

            AuditLog.countDocuments(filter),
        ]);

        res.json({
            logs: logs.map(serializeLog),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /activity/summary
// Overview statistics and recent login history.
router.get('/summary', async (req, res) => {
    try {
        const accountId = req.user.id;
        const now = new Date();
        const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const users = await User.find({
            $or: [
                { _id: accountId },
                { owner_id: accountId },
            ],
        }).select('_id name email role created_at');

        const userIds = users.map((user) => user._id);

        const account = accountFilter(req);

        const [
            totalActions,
            failedLogins,
            successfulLogins,
            activeUserIds,
            recentLogins,
        ] = await Promise.all([
            AuditLog.countDocuments({
                ...account,
                action: { $nin: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT'] },
            }),

            AuditLog.countDocuments({
                ...account,
                action: 'LOGIN_FAILED',
            }),

            AuditLog.countDocuments({
                ...account,
                action: 'LOGIN',
            }),

            AuditLog.distinct('user_id', {
                ...account,
                user_id: { $in: userIds },
                action: { $nin: ['LOGIN_FAILED'] },
                created_at: { $gte: thirtyDaysAgo },
            }),

            AuditLog.find({
                ...account,
                action: { $in: ['LOGIN', 'LOGIN_FAILED'] },
            })
                .sort({ created_at: -1 })
                .limit(10),
        ]);

        res.json({
            stats: {
                total_users: users.length,
                active_users: activeUserIds.filter(Boolean).length,
                total_actions: totalActions,
                failed_logins: failedLogins,
                successful_logins: successfulLogins,
            },

            active_period_days: 30,

            users: users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
            })),

            recent_logins: recentLogins.map(serializeLog),
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /activity/user/:userId
// Activity history for one owner or team member.
router.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.userId,
            $or: [
                { _id: req.user.id },
                { owner_id: req.user.id },
            ],
        }).select('_id name email role created_at');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { page, limit, skip } = pagination(req.query);

        const filter = {
            ...accountFilter(req),
            user_id: user._id,
        };

        const [logs, total, loginCount, failedLoginCount] = await Promise.all([
            AuditLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),

            AuditLog.countDocuments(filter),

            AuditLog.countDocuments({
                ...filter,
                action: 'LOGIN',
            }),

            AuditLog.countDocuments({
                ...filter,
                action: 'LOGIN_FAILED',
            }),
        ]);

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
            },

            stats: {
                total_events: total,
                successful_logins: loginCount,
                failed_logins: failedLoginCount,
            },

            logs: logs.map(serializeLog),

            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /activity/logins
// Successful and failed login attempts.
router.get('/logins', async (req, res) => {
    try {
        const { page, limit, skip } = pagination(req.query);

        const filter = {
            ...accountFilter(req),
            action: { $in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT'] },
        };

        if (req.query.user_id) {
            const userExists = await User.exists({
                _id: req.query.user_id,
                $or: [
                    { _id: req.user.id },
                    { owner_id: req.user.id },
                ],
            });

            if (!userExists) {
                return res.status(404).json({ error: 'User not found' });
            }

            filter.user_id = req.query.user_id;
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),

            AuditLog.countDocuments(filter),
        ]);

        res.json({
            logs: logs.map(serializeLog),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = () => router;
