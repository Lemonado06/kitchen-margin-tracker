const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User } = require('./models');
const { requireAuth, requireRole } = require('./middleware');
const { validId } = require('./access');

module.exports = () => {
  // MY PROFILE
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      const owner = user.role === 'manager' ? await User.findById(user.owner_id) : null;
      res.json({ ...user.toJSON(), owner_name: owner?.name || null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE MY PROFILE (name, and password when current_password is given)
  router.put('/me', requireAuth, async (req, res) => {
    const name = req.body.name?.trim();
    const { current_password, new_password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
      const user = await User.findById(req.user.id);
      if (new_password) {
        if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
        if (!current_password || !(await bcrypt.compare(current_password, user.password_hash))) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        user.password_hash = await bcrypt.hash(new_password, 10);
      }
      user.name = name;
      await user.save();
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // LIST TEAM (owners only): the owner plus their managers
  router.get('/', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const team = await User.find({ $or: [{ _id: req.user.id }, { owner_id: req.user.id }] }).sort({ role: -1, created_at: 1 });
      res.json(team);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADD MANAGER (owners only)
  router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
      if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
      const password_hash = await bcrypt.hash(password, 10);
      const manager = await User.create({ name, email, password_hash, role: 'manager', owner_id: req.user.id });
      res.status(201).json(manager);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE MANAGER (owners only): rename, or reset their password
  router.put('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    const name = req.body.name?.trim();
    const { password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (password && password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
      const manager = validId(req.params.id) ? await User.findOne({ _id: req.params.id, owner_id: req.user.id }) : null;
      if (!manager) return res.status(404).json({ error: 'Team member not found' });
      manager.name = name;
      if (password) manager.password_hash = await bcrypt.hash(password, 10);
      await manager.save();
      res.json(manager);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // REMOVE MANAGER (owners only)
  router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
    try {
      const manager = validId(req.params.id) ? await User.findOneAndDelete({ _id: req.params.id, owner_id: req.user.id }) : null;
      if (!manager) return res.status(404).json({ error: 'Team member not found' });
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
