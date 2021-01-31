import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { isEmail } from 'validator'

// import { Testimony, User } from './Schemas'


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

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
    type: String,
    enum: ['Increased', 'Decreased', 'Unchanged'],
  },
  story: {
    type: String,
    trim: true,
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

const Testimony = mongoose.model('testimony', testimonySchema)


//_________Moderator schema
const userSchema = new mongoose.Schema({
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

const User = mongoose.model('user', userSchema)

// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

//_________Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

//_________middlewear to authenticate User
const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization'),
    })
    if (user) {
      req.user = user
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

//_________Middleware to hash password before new user is saved
userSchema.pre('save', async function (next) {
  const user = this
  if (!user.isModified('password')) {
    return next()
  }
  const salt = bcrypt.genSaltSync(10)
  // Hash the password – this happens after the validation.
  user.password = bcrypt.hashSync(user.password, salt)
  next()
})


//_________Error message if server is down
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).send({ error: 'service unavailable' })
  }
})


//_________Documentation
const listEndpoints = require('express-list-endpoints')
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
}) // add correct documentation here

// GET endpoints
// query here too RegExp too
app.get('/testimonies', async (req, res) => {
  // Pagination page and limit set to default values
  const { page = 1, limit = 10 } = req.query
  delete (req.query.page)
  delete (req.query.limit)

  try {
    // execute query with page and limit values
    const allTestimonies = await Testimony.find(req.query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: 'desc' })
      .exec()

    // get total entries in the collection
    const count = await Testimony.countDocuments();

    // return response with, total pages and current page
    res.status(200).json({
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      allTestimonies,
    })
  } catch (error) {
    res.status(400).json({ message: "could not find testimony", errors: error.errors })
  }
})

// GET returns one object from the database via ID
// this works
app.get('/testimonies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const singleTestimony = await Testimony.findOne({ _id: id })
    res.status(200).json(singleTestimony)
  } catch (err) {
    res.status(404).json({ error: 'testimony not found', errors: err.error })
  }
})

//_________POST testimonies
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
app.get('/users/:id/moderator', authenticateUser)

//_________POST create moderator
// this works
app.post('/users', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await new User({
      email,
      password,
    }).save()
    console.log(user)
    res.status(201).json({ userId: user._id, accessToken: user.accessToken, email: user.email })
  } catch (err) {
    res.status(400).json({
      message: 'Create was unsuccessful',
      error_message: err.message,
      error: err,
    })
  }
})


// LOGIN moderator
//_________POST Log in user endpoint
app.post('/sessions', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    console.log('User:', user)
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({ 
        userID: user._id, 
        accessToken: user.accessToken, 
        email: user.email })
    } else {
      res.status(404).json({
        message:
          'Oops, something went wrong. Check your username and/or password!'
      })
    }
  } catch (err) {
    res.status(404).json({
      message: 'No user found',
      error_message: err.message,
      error: err,
    })
  }
})

//_________I guess I need to have some kind of moderate endpoint too?

//_________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
