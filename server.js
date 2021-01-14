import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//how does this work
// One schema to rule them all and then models for each user and one for moderator?
// post model 
const Testimony = mongoose.model('testimony', {
  name: {
    type: String,
    minlength: 3,
    maxlength: 30,
    default: "Anonymous"
  },
  when_weeks: {
    // any: mongoose.Mixed,
    type: String,
    required: true
  },
  when_weeks_noticed: {
    type: String,
  },
  physical_pain: {
    type: String,
  },
  mental_pain: {
    type: String,
  },
  hospital: {
    type: Boolean
  },
  period_volume: {
    type: String
  },
  period_length: {
    type: String
  },
  period_pain: {
    type: Boolean
  },
  story: {
    type: String,
    minlength: 3,
    maxlength: 500,
  },
  //   hearts: {
//     type: Number,
//     default: 0
//   },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
})

// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// server ready
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).send({ error: 'service unavailable' })
  }
})

// // Doc
app.get('/', (req, res) => {
  res.send('Hello world')
  // add documentation here
})

// GET endpoints
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

// GET returns one object from the database via ID
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
app.post('/testimonies', async (req, res) => {
  try {
    const { name, when_weeks, when_weeks_noticed, physical_pain, mental_pain, hospital, period_volume, period_length, period_pain,
    story } = req.body
    const NewTestimony = await new Testimony({ name, when_weeks, when_weeks_noticed, physical_pain, mental_pain, hospital, period_volume, period_length, period_pain,
      story}).save()
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

// SIGN-UP moderator


// LOGIN moderator



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
