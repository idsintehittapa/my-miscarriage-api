import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { isEmail } from 'validator'

//_________Testimony schema
const testimonySchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: 30,
    trim: true,
    default: "Anonymous",
    // validate: /^(?! +$)[A-Za-zăâîșțĂÂÎȘȚ -]+$/ //not allowing starting with whitespace
  },
  when_weeks: {
    type: Number,
    required: true,
    min: 6,
    max: 99
  },
  when_weeks_noticed: {
    type: Number,
    required: true,
    min: 6,
    max: 99
  },
  physical_pain: {
    type: String,
    required: true,
    enum: ['Painless', 'Painful', 'Severe Pain'],
  },
  mental_pain: {
    type: String,
    required: true,
    enum: ['Painless', 'Painful', 'Severe Pain'],
  },
  hospital: {
    type: Boolean,
    required: true,
  },
  period_volume: {
    type: String,
    required: true,
    enum: ['Increased', 'Decreased', 'Unchanged'],
  },
  period_length: {
    type: String,
    required: true,
    enum: ['Additional days', 'Fewer days', 'Unchanged'],
  },
  period_pain: {
    type: String,
    required: true,
    enum: ['Increased', 'Decreased', 'Unchanged'],
  },
  story: {
    type: String,
    trim: true,
    required: true,
    // maxlength: 1000,
    // validate: /^(?! +$)[A-Za-zăâîșțĂÂÎȘȚ -]+$/ //not allowing starting with whitespace
    // this is not working as it should
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  post: {
    type: String,
    enum: ['pending', 'approved', 'decline'],
    default: 'pending'
  }
}
)

export const Testimony = mongoose.model('testimony', testimonySchema)

//_________Moderator schema
const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: [true, 'a password is required'],
    minLength: 5,
    trim: true,
    // validate: /^(?! +$)[A-Za-zăâîșțĂÂÎȘȚ -]+$/ //not allowing starting with whitespace
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    required: true,
    validate: [isEmail, 'invalid email']
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
})

//_________Middleware to hash password before new user is saved
userSchema.pre('save', async function (next) {
  const user = this
  if (!user.isModified('password')) {
    return next()
  }
  const salt = bcrypt.genSaltSync()
  // Hash the password – this happens after the validation.
  user.password = bcrypt.hashSync(user.password, salt)
  next()
})

export const User = mongoose.model('user', userSchema)