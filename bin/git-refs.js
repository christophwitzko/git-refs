#!/usr/bin/env node

'use strict'

var gitRef = require('../')

gitRef(function (err, data) {
  if (err) return console.error(err)
  var dump = data.dump()
  Object.keys(dump).forEach(function (k) {
    console.log(dump[k], (k !== 'HEAD') ? 'refs/' + k : k)
  })
})
