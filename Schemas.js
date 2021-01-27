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
    min: 5,
    max: 20
  },
  when_weeks_noticed: {
    type: Number,
    // required: true,
    min: 5,
    max: 25
  },
  physical_pain: {
    type: String,
    enum: ['Painless', 'Painful', 'Severe Pain'],
  },
  mental_pain: {
    type: String,
    enum: ['Painless', 'Painful', 'Severe Pain'],
  },
  hospital: {
    type: Boolean,
  },
  period_volume: {
    type: String,
    enum: ['Increased', 'Decreased', 'Unchanged'],
  },
  period_length: {
    type: String,
    enum: ['Additional days', 'Fewer days', 'Unchanged'],
  },
  period_pain: {
    type: Boolean,
  },
  story: {
    type: String,
    trim: true,
    // maxlength: 1000,
    // validate: /^(?! +$)[A-Za-zăâîșțĂÂÎȘȚ -]+$/ //not allowing starting with whitespace
    // this is not working as it should
  },
  //   hearts: {
  //     type: Number,
  //     default: 0
  //   },
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
const moderatorSchema = new mongoose.Schema({
  // username: {
  //   type: String,
  //   trim: true,
  //   required: true,
  //   minLength: 2,
  //   maxLength: 20,
  //   validate: /^(?! +$)[A-Za-zăâîșțĂÂÎȘȚ -]+$/ //not allowing starting with whitespace
  // },
  password: {
    type: String,
    required: [true, 'a password is required'],
    // minLength: 5,
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

moderatorSchema.pre('save', async function (next) {
  const moderator = this
  // isModified: "Returns true if any of the given paths is modified, else false. 
  // If no arguments, returns true if any path in this document is modified."
  // https://mongoosejs.com/docs/api.html#document_Document-isModified
  if (!moderator.isModified('password')) {
    return next()
  }
  const salt = bcrypt.genSaltSync(10)
  // Hash the password – this happens after the validation.
  moderator.password = bcrypt.hashSync(moderator.password, salt)
  next()
})

export const Moderator = mongoose.model('moderator', moderatorSchema)