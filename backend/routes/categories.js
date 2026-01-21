const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT c.*,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id) as products_count
      FROM categories c
      ORDER BY c.name
    `);

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create category (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, name_ar, name_en, icon } = req.body;

    if (!name || !name_ar || !name_en) {
      return res.status(400).json({ error: 'Le nom en français, arabe et anglais est requis' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, name_ar, name_en, icon) VALUES (?, ?, ?, ?)',
      [name, name_ar, name_en, icon || 'package']
    );

    const [newCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update category (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, name_en, icon } = req.body;

    if (!name || !name_ar || !name_en) {
      return res.status(400).json({ error: 'Le nom en français, arabe et anglais est requis' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, name_ar = ?, name_en = ?, icon = ? WHERE id = ?',
      [name, name_ar, name_en, icon || 'package', id]
    );

    const [updatedCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    res.json(updatedCategory[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete category (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la catégorie a des produits
    const [products] = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: `Impossible de supprimer cette catégorie car elle contient ${products[0].count} produit(s)` 
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
