import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
  'Accounting',
  'Air Conditioning',
  'App Development',
  'Appliance Installation',
  'Babysitting',
  'Beauty & Makeup',
  'Car Wash',
  'Carpentry',
  'Cleaning',
  'Cooking',
  'Courier Service',
  'Data Entry',
  'Delivery',
  'Digital Marketing',
  'DJ & Entertainment',
  'Driving',
  'Elder Care',
  'Electrical Work',
  'Errand Running',
  'Event Planning',
  'Event Setup',
  'Fitness Training',
  'Gardening',
  'Graphic Design',
  'Hairdressing',
  'Handyman',
  'Interior Design',
  'IT Support',
  'Laundry',
  'Makeup Artist',
  'Massage Therapy',
  'Moving Help',
  'Painting',
  'Pest Control',
  'Pet Care',
  'Photography',
  'Plumbing',
  'Printing',
  'Repairs',
  'Roofing',
  'Security Guard',
  'Security Installation',
  'Tailoring',
  'Tour Guide',
  'Translation',
  'Tutoring',
  'Virtual Assistant',
  'Web Design',
  'Writing & Editing',
  'Other',

]

  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  budget: {
    min: {
      type: Number,
      default: 0,
      min: 0
    },
    max: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    additionalContact: {
      type: String,
      default: ''
    }
  },
  images: [{
    type: String // File names
  }],
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  }
}, {
  timestamps: true
});

// Index for better query performance
taskSchema.index({ clientId: 1, createdAt: -1 });
taskSchema.index({ category: 1, status: 1 });
taskSchema.index({ location: 'text', title: 'text', description: 'text' });

export default mongoose.model('Task', taskSchema);