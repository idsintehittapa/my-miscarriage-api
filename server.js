import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/my-miscarriage"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise


// post model 
// const Message = mongoose.model('post', {
//   message: {
//     type: String,
//     minlength: 5,
//     maxlength: 140,
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: () => new Date()
//   },
//   hearts: {
//     type: Number,
//     default: 0
//   },
//   name: {
//     type: String,
//     default: "Anonymous"
//   }
// })

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

// Doc
app.get('/', (req, res) => {
  res.send('Hello world')
})

// POST endpoints

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
