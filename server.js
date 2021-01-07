import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// post model 
const Testimonies = mongoose.model('testimonies', {
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

// GET endpoints
// query here too RegExp too
app.get('/testimonies', async (req, res) => {
  try {
    const testimonies = await Testimonies.find()
      .sort({ createdAt: 'desc' })
      .limit(20)
      .exec()
    res.status(200).json(testimonies)
  } catch (error) {
    res.status(400).json({ testimonies: "could not find testimony", errors: err.errors })
  }
})

// Doc
app.get('/', (req, res) => {
  res.send('Hello world')
  // add documentation here
})

// POST endpoints

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
