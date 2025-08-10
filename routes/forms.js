import express from 'express';
import { check } from 'express-validator';
import Form from '../models/Form.js';
import SubForm from '../models/SubForm.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/forms
// @desc    Get all forms
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const forms = await Form.find().sort({ name: 1 });
    res.json(forms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/forms
// @desc    Create or update form
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('url', 'URL is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      const { name, url } = req.body;

      // Check if form with same name or URL already exists
      let form = await Form.findOne({
        $or: [{ name }, { url }]
      });

      // If updating existing form
      if (req.body.id) {
        form = await Form.findById(req.body.id);
        if (!form) {
          return res.status(404).json({ msg: 'Form not found' });
        }

        // Check if another form with the same name or URL exists
        const existingForm = await Form.findOne({
          _id: { $ne: req.body.id },
          $or: [{ name }, { url }]
        });

        if (existingForm) {
          return res.status(400).json({ msg: 'A form with this name or URL already exists' });
        }

        form.name = name;
        form.url = url;
        await form.save();
        return res.json(form);
      }

      // If creating new form
      if (form) {
        return res.status(400).json({ msg: 'A form with this name or URL already exists' });
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
  }
);

// @route   DELETE api/forms/:id
// @desc    Delete a form
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Check if form has sub-forms
    const subForms = await SubForm.find({ formId: req.params.id });
    if (subForms.length > 0) {
      return res.status(400).json({ 
        msg: 'Please delete all sub-forms before deleting this form' 
      });
    }

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

// Sub-form routes
// @route   GET api/forms/subforms
// @desc    Get all sub-forms
// @access  Private
router.get('/subforms', protect, async (req, res) => {
  try {
    const subForms = await SubForm.find().populate('formId', 'name');
    res.json(subForms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/forms/subforms
// @desc    Create or update sub-form
// @access  Private
router.post(
  '/subforms',
  [
    protect,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('formId', 'Form ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    try {
      const { name, formId } = req.body;

      // Check if form exists
      const form = await Form.findById(formId);
      if (!form) {
        return res.status(404).json({ msg: 'Form not found' });
      }

      // Check if sub-form with same name exists for this form
      let subForm = await SubForm.findOne({
        name,
        formId
      });

      // If updating existing sub-form
      if (req.body.id) {
        subForm = await SubForm.findById(req.body.id);
        if (!subForm) {
          return res.status(404).json({ msg: 'Sub-form not found' });
        }

        // Check if another sub-form with the same name exists for this form
        const existingSubForm = await SubForm.findOne({
          _id: { $ne: req.body.id },
          name,
          formId
        });

        if (existingSubForm) {
          return res.status(400).json({ 
            msg: 'A sub-form with this name already exists for the selected form' 
          });
        }

        subForm.name = name;
        subForm.formId = formId;
        await subForm.save();
        return res.json(subForm);
      }

      // If creating new sub-form
      if (subForm) {
        return res.status(400).json({ 
          msg: 'A sub-form with this name already exists for the selected form' 
        });
      }

      subForm = new SubForm({
        name,
        formId
      });

      await subForm.save();
      
      // Populate formId for the response
      await subForm.populate('formId', 'name');
      res.json(subForm);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Form not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/forms/subforms/:id
// @desc    Delete a sub-form
// @access  Private
router.delete('/subforms/:id', protect, async (req, res) => {
  try {
    const subForm = await SubForm.findById(req.params.id);
    if (!subForm) {
      return res.status(404).json({ msg: 'Sub-form not found' });
    }

    await subForm.remove();
    res.json({ msg: 'Sub-form removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Sub-form not found' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;
