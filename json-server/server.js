const jsonServer = require('json-server')
const express = require('express')
const server = jsonServer.create()
const router = jsonServer.router('./json-server/db.json')
const middlewares = jsonServer.defaults(
  {
    static: './json-server/public'
  }
)

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares)
server.use(jsonServer.bodyParser)

// Add custom routes before JSON Server router
server.get('/echo', (req, res) => {
  res.jsonp(req.query)
})

// To handle POST, PUT and PATCH you need to use a body-parser
// You can use the one used by JSON Server
server.use(jsonServer.bodyParser)
server.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log("Received Post", req.path);
    if (req.path === '/contact-form') {
      console.log("Received Post", req.body);
      if (req.body.name && req.body.message  && req.body.name !== 'invalid') {
        res.status(200).jsonp({
          message: "Your message has been sent"
        })
      } else {
        res.status(400).jsonp({
          message: "There was an issue with sending your message"
        });
      }
    } else {
      res.status(400).jsonp({
        message: "Not supported"
      });
    }
  } else {
    // Continue to JSON Server router
    next();
  }
})

// Use default router
server.use(router)
server.listen(3000, () => {
  console.log('JSON Server is running')
})