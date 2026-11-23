
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const { User } = require('./models');
const { requireAuth, requireRole } = require('./middleware');
const { validId } = require('./access');
const { recordActivity } = require('./audit');

module.exports = () => {

  // Remove sensitive fields before sending user data to frontend.
  function safeUser(user) {
    const data = user.toJSON();
    delete data.password_hash;
    return data;
  }

  // GET MY PROFILE
  // Accessible to owners, managers and staff.
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let owner = null;

      if (user.owner_id) {
        owner = await User.findById(user.owner_id).select('name');
      }

      res.json({
        ...safeUser(user),
        owner_name: owner?.name || null
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE MY PROFILE
  // All authenticated roles can update their own name and password.
  router.put('/me', requireAuth, async (req, res) => {
    const name = req.body.name?.trim();
    const { current_password, new_password } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }

    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const nameChanged = user.name !== name;
      const passwordChanged = Boolean(new_password);

      if (new_password) {
        if (new_password.length < 6) {
          return res.status(400).json({
            error: 'New password must be at least 6 characters'
          });
        }

        if (
          !current_password ||
          !(await bcrypt.compare(
            current_password,
            user.password_hash
          ))
        ) {
          return res.status(400).json({
            error: 'Current password is incorrect'
          });
        }

        user.password_hash = await bcrypt.hash(new_password, 10);
      }

      user.name = name;

      await user.save();

      if (nameChanged || passwordChanged) {
        const changes = [];

        if (nameChanged) changes.push('name');
        if (passwordChanged) changes.push('password');

        await recordActivity({
          accountId: req.user.accountId,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'UPDATE',
          module: 'PROFILE',
          description: `Updated profile (${changes.join(' and ')})`,
          entityId: user.id,
        });
      }

      res.json(safeUser(user));

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // LIST TEAM
  // Owners can see themselves and all their managers/staff.
  router.get('/', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const team = await User.find({
        $or: [
          { _id: req.user.id },
          { owner_id: req.user.id }
        ]
      }).sort({ role: -1, created_at: 1 });

      res.json(team.map(safeUser));

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // ADD TEAM MEMBER
  // Owners can add managers or kitchen staff.
  router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;
    const role = req.body.role || 'manager';

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required'
      });
    }

    if (!['manager', 'staff'].includes(role)) {
      return res.status(400).json({
        error: 'Role must be manager or staff'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    try {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          error: 'Email already registered'
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const member = await User.create({
        name,
        email,
        password_hash,
        role,
        owner_id: req.user.id
      });

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CREATE',
        module: 'TEAM',
        description: `Added ${role}: ${name}`,
        entityId: member.id,
      });

      res.status(201).json(safeUser(member));

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE TEAM MEMBER
  // Owners can rename, reset passwords and change roles.
  router.put('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    const { password, role } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    if (role && !['manager', 'staff'].includes(role)) {
      return res.status(400).json({
        error: 'Role must be manager or staff'
      });
    }

    try {
      const member = validId(req.params.id)
        ? await User.findOne({
          _id: req.params.id,
          owner_id: req.user.id
        })
        : null;

      if (!member) {
        return res.status(404).json({
          error: 'Team member not found'
        });
      }

      const changes = [];

      if (member.name !== name) changes.push('name changed');
      if (password) changes.push('password reset');
      if (role && member.role !== role) {
        changes.push(`role changed to ${role}`);
      }

      member.name = name;

      if (password) {
        member.password_hash = await bcrypt.hash(password, 10);
      }

      if (role) {
        member.role = role;
      }

      await member.save();

      if (changes.length > 0) {
        await recordActivity({
          accountId: req.user.accountId,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'UPDATE',
          module: 'TEAM',
          description: `Updated ${member.name}: ${changes.join(', ')}`,
          entityId: member.id,
        });
      }

      res.json(safeUser(member));

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // REMOVE TEAM MEMBER
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const member = validId(req.params.id)
        ? await User.findOneAndDelete({
          _id: req.params.id,
          owner_id: req.user.id
        })
        : null;

      if (!member) {
        return res.status(404).json({
          error: 'Team member not found'
        });
      }

      await recordActivity({
        accountId: req.user.accountId,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DELETE',
        module: 'TEAM',
        description: `Removed team member: ${member.name}`,
        entityId: member.id,
      });

      res.json({ deleted: true });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  return router;
};
