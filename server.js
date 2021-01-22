import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

import { Testimony, Moderator } from './Schemas'


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const mongoosePaginate = require('mongoose-paginate-v2')




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

//_________middlewear to authenticate Moderator
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
      // query here too RegExp too
app.get('/testimonies', async (req, res) => {
  // Pagination page and limit set to default values
  const { page = 1, limit = 10 } = req.query
  delete(req.query.page)
  delete(req.query.limit)

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
    const singleProfanity = await Testimony.findOne({ _id: id })
    res.status(200).json(singleProfanity)
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
app.get('/users/:id/moderator', authenticateModerator)

//_________POST create moderator
// this works
app.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await new Moderator({ email, password }).save()
    res.status(201).json({ userId: user._id, accessToken: user.accessToken })
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
    const { email, password } = req.body
    const user = await Moderator.findOne({ email, password })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({ userId: user._id , accessToken: user.accessToken })
    } else {
      res.status(404).json({ notFound: true })
    }
  } catch (err) {
    res.status(404).json({ notFound: true })
  }
})

//_________I guess I need to have some kind of moderate endpoint too?

//_________Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
