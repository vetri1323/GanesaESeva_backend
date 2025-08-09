const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const auth = require('../middleware/auth');

// @route   GET api/forms
// @desc    Get all forms
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const forms = await Form.find().sort({ name: 1 });
    res.json(forms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/forms
// @desc    Create a form
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, url } = req.body;

    // Check if form with this URL already exists
    let form = await Form.findOne({ url });
    if (form) {
      return res.status(400).json({ errors: [{ msg: 'A form with this URL already exists' }] });
    }

    form = new Form({
      name,
      url
    });

    await form.save();
    res.json(form);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/forms/:id
// @desc    Update a form
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, url } = req.body;
  
  // Build form object
  const formFields = {};
  if (name) formFields.name = name;
  if (url) formFields.url = url;

  try {
    let form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ msg: 'Form not found' });
    }

    // Check if URL is being updated and already exists
    if (url && url !== form.url) {
      const existingForm = await Form.findOne({ url });
      if (existingForm) {
        return res.status(400).json({ errors: [{ msg: 'A form with this URL already exists' }] });
      }
    }

    form = await Form.findByIdAndUpdate(
      req.params.id,
      { $set: formFields },
      { new: true }
    );

    res.json(form);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Form not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/forms/:id
// @desc    Delete a form
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ msg: 'Form not found' });
    }

    await form.remove();
    res.json({ msg: 'Form removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Form not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/forms/search
// @desc    Search forms
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const forms = await Form.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    
    res.json(forms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
