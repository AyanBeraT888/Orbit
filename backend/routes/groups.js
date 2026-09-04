const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/authMiddleware');
const { locationReadLimiter } = require('../middleware/rateLimiter');
const { validateGroupName, validateMembersArray } = require('../middleware/sanitize');

// POST /groups/create -> create group
router.post('/create', authMiddleware, async (req, res) => {
  const { name, members } = req.body; // members is list of friend UIDs
  const ownerId = req.user.uid;

  // Validate group name
  const nameCheck = validateGroupName(name);
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });

  // Validate members array
  const membersCheck = validateMembersArray(members);
  if (!membersCheck.ok) return res.status(400).json({ error: membersCheck.error });

  try {
    const groupRef = await db.collection('groups').add({
      name: nameCheck.value,
      ownerId,
      members: [...membersCheck.value, ownerId],
      isSharing: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Group created', groupId: groupRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// POST /groups/:id/add -> add friend to group
router.post('/:id/add', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  const uid = req.user.uid;

  try {
    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    if (groupDoc.data().ownerId !== uid) return res.status(403).json({ error: 'Only owner can add members' });

    const members = groupDoc.data().members;
    if (members.includes(memberId)) return res.status(400).json({ error: 'Member already in group' });

    await groupRef.update({
      members: [...members, memberId]
    });

    res.status(200).json({ message: 'Member added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /groups/:id/member/:userId -> remove member
router.delete('/:id/member/:userId', authMiddleware, async (req, res) => {
  const { id, userId } = req.params;
  const uid = req.user.uid;

  try {
    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });

    // Only owner can remove others, but members can remove themselves (leave)
    if (groupDoc.data().ownerId !== uid && uid !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const members = groupDoc.data().members.filter(m => m !== userId);
    await groupRef.update({ members });

    res.status(200).json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// DELETE /groups/:id -> delete entire group
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;

  try {
    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    if (groupDoc.data().ownerId !== uid) return res.status(403).json({ error: 'Only owner can delete group' });

    await groupRef.delete();
    res.status(200).json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// GET /groups/list -> get all groups user belongs to
router.get('/list', authMiddleware, locationReadLimiter, async (req, res) => {
  const uid = req.user.uid;

  try {
    const groupsQuery = await db.collection('groups')
      .where('members', 'array-contains', uid)
      .get();

    const groups = groupsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /groups/:id/share -> start group location sharing
router.post('/:id/share', authMiddleware, locationReadLimiter, async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;

  try {
    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    if (!groupDoc.data().members.includes(uid)) return res.status(403).json({ error: 'Not a member' });

    await groupRef.update({ isSharing: true });

    res.status(200).json({ message: 'Group sharing session started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start group sharing' });
  }
});

module.exports = router;
