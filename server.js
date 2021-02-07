import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
// import crypto from 'crypto'
import bcrypt from 'bcrypt'
// import { isEmail } from 'validator'


import { SignUpKeys, Testimony, User } from './Schemas'


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

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

//_________ GET endpoints - getting all testimonies
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

//_________ GET returns one object from the database via ID
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

//_________ GET secure endpoint to show moderator pending posts // this works
app.get('/moderator/pending', authenticateUser)
app.get('/moderator/pending', async (req, res) => {
  try {
    const pendingTestimonies = await Testimony
      .find({ post: "pending" })
      .limit(5)
      .sort({ createdAt: 'desc' })

    res.status(200).json(pendingTestimonies)

  } catch (error) {
    console.log(error)
    res.status(404).json({ message: "could not find pending testimonies", errors: error.errors })
  }
})

//_________ GET Secure endpoint for pending post by _id
app.get('/moderator/pending/:id', authenticateUser)
app.get('/moderator/pending/:id', async (req, res) => {
  try {
    const { id } = req.params
    const singleTestimony = await Testimony.findOne({ _id: id })
    res.status(200).json(singleTestimony)
  } catch (err) {
    res.status(404).json({ error: 'testimony not found', errors: err.error })
  }
})

//_________ PATCH Secure endpoint update 
app.patch('/moderator/pending/:id', authenticateUser)
app.patch('/moderator/pending/:id', async (req, res) => {
  const { id } = req.params
  try {
    const modifiedTestimony = await Testimony.findOneAndUpdate(
      { _id: id },
      {
        name: req.body.name,
        story: req.body.story,
        post: req.body.post
      },
      { new: true })
    res.status(200).json(modifiedTestimony)
    console.log('modifiedTestimony:', modifiedTestimony)
  } catch (err) {
    res.status(400).json({
      message: 'Update failed.',
      error_message: err.message, error: err
    })
  }
})

//_________POST testimonies
// this works
app.post('/testimonies', async (req, res) => {
  try {
    const {
      name,
      when_weeks,
      when_weeks_noticed,
      physical_pain,
      mental_pain,
      hospital,
      period_volume,
      period_length,
      period_pain,
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

//_________POST create moderator
// this works
app.post('/users', async (req, res) => {
  const { email, key, password } = req.body

  try {
    const signupdata = await SignUpKeys.find({email: email, key: key});

    if ( signupdata.length === 0 ) {
      return res.status(401).json({
        message: 'you are not authorized to register as a moderator',
      })
    }

  } catch (err) {
    console.log(err)
    res.status(500).json({
      message: 'problem retrieving internal configuration',
      error_message: err.message,
      error: err,
    })
  }
  try {
    const user = await new User({
      email,
      password,
    }).save()
    console.log("testing", user)
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
    console.log(user.password)
    if (user && bcrypt.compareSync(password, user.password)) {
      console.log(user.password)
      res.status(201).json({
        userID: user._id,
        accessToken: user.accessToken,
        email: user.email
      })
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

//_________PUT endpoint?

//_________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
