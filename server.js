import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { isEmail } from 'validator'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise


//_________Testimony schema
const testimonySchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: 3,
    maxlength: 30,
    trim: true,
    default: "Anonymous"
  },
  when_weeks: {
    // make this into a range?
    type: Number,
    required: true,
    min: 5,
    max: 20
  },
  when_weeks_noticed: {
    // make this into a range?
    type: Number,
    required: true,
    min: 5,
    max: 20
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
    type: Boolean
  },
  period_volume: {
    type: String,
    enum: ['Increased', 'Decreased', 'Unchanged'],
  },
  period_length: {
    type: String,
    enum: ['Fewer days', 'Additional days', 'Unchanged'],
  },
  period_pain: {
    type: Boolean
  },
  story: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 1000,
  },
  //   hearts: {
  //     type: Number,
  //     default: 0
  //   },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
}
)

const Testimony = mongoose.model('testimony', testimonySchema)

//_________Moderator schema
// So, in this schema you can create a user adding a specific code that has been given
// by super admin aka me ^^
const moderatorSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
    required: true,
    minLength: 2,
    maxLength: 20,
  },
  password: {
    type: String,
    required: [true, 'a password is required'],
    minLength: 5,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    required: true,
    validate: [isEmail, 'invalid email']
  },
  code: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'a code is required'],
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

const Moderator = mongoose.model('moderator', moderatorSchema)

// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start


const port = process.env.PORT || 8080
const app = express()

//_________Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

//_________Error message if server is down
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).send({ error: 'service unavailable' })
  }
})

//_________middlewear to authenticate User
const authenticateModerator = async (req, res, next) => {
  try {
    const moderator = await Moderator.findOne({
      accessToken: req.header('Authorization'),
    })

    if (moderator) {
      req.user = moderator
      next()
    } else {
      res
        .status(401)
        .json({ loggedOut: true, message: 'Please try logging in again' })
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: "Access token is missing or wrong", errors: err })
  }
}

//_________Documentation
const listEndpoints = require('express-list-endpoints')
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
}) // add correct documentation here

// GET endpoints
// this works
// query here too RegExp too
app.get('/testimonies', async (req, res) => {
  try {
    const allTestimonies = await Testimony.find(req.query)
      .sort({ createdAt: 'desc' })
      .limit(20)
      .exec()
    res.status(200).json(allTestimonies)
  } catch (error) {
    res.status(400).json({ message: "could not find testimony", errors: err.errors })
  }
})
// add page-nation to this

// GET returns one object from the database via ID
// this works
app.get('/testimonies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const singleProfanity = await Testimony.findOne({ _id: id })
    res.status(200).json(singleProfanity)
  } catch (err) {
    res.status(404).json({ error: 'testimony not found', errors: err.error })
  }
})

// POST endpoints
// this works
app.post('/testimonies', async (req, res) => {
  try {
    const { name, when_weeks, when_weeks_noticed, physical_pain, mental_pain, hospital, period_volume, period_length, period_pain,
      story } = req.body
    const NewTestimony = await new Testimony({
      name, when_weeks, when_weeks_noticed, physical_pain, mental_pain, hospital, period_volume, period_length, period_pain,
      story
    }).save()
    res.status(201).json({ NewTestimony })
  } catch (err) {
    res.status(400).json({
      message: 'Could not create testimony', errors: {
        message: err.message,
        error: err,
      },
    })
  }
})

//_________Secure endpoint, user needs to be logged in to access this moderator-page?
app.get('/users/:id/moderator', authenticateModerator)

//_________POST create moderator
// this works
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password, code  } = req.body
    const user = await new Moderator({ username, email, password, code }).save()
    res.status(201).json({ userId: user._id, userName: user.name, accessToken: user.accessToken })
  } catch (err) {
    res.status(400).json({
      message: "Could not create user", errors: {
        message: err.message,
        error: err,
      },
    })
  }
})

// LOGIN moderator
//_________POST Log in user endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const user = await Moderator.findOne({ username, email })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({ userId: user._id, userName: user.name, accessToken: user.accessToken })
    } else {
      res.status(404).json({ notFound: true })
    }
  } catch (err) {
    res.status(404).json({ notFound: true })
  }
})


//_________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
