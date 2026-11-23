
const { AuditLog } = require('./models');

/**
 * Records an activity event.
 *
 * Logging is best-effort: an audit logging failure must not
 * prevent an otherwise successful application operation.
 */
async function recordActivity({
    accountId,
    userId = null,
    userName = 'Unknown user',
    userRole = null,
    action,
    module,
    description,
    entityId = null,
    outletId = null,
}) {
    try {
        if (!accountId || !action || !module || !description) {
            console.error('Audit log skipped: required fields missing');
            return;
        }

        await AuditLog.create({
            account_id: accountId,
            user_id: userId,
            user_name: String(userName).slice(0, 100),
            user_role: userRole,
            action,
            module,
            description: String(description).slice(0, 300),
            entity_id: entityId ? String(entityId) : null,
            outlet_id: outletId ? String(outletId) : null,
        });
    } catch (err) {
        console.error('Failed to record activity:', err.message);
    }
}

module.exports = { recordActivity };
