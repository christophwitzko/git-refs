'use strict'

var fs = require('fs')
var path = require('path')

var walk = require('walk')

var hashRe = /^[0-9a-f]{40}$/
var prefRe = /^([0-9a-f]{40}) refs\/(.*)$/
var refsRe = /^ref: refs\/(.*)$/

module.exports = function (root, cb) {
  if (typeof root === 'function') {
    cb = root
    root = '.git'
  }

  if (typeof cb !== 'function') throw new Error('no callback provided')

  try {
    fs.accessSync(root, fs.R_OK | fs.W_OK)
  } catch (e) {
    return cb('could not access git directory')
  }

  function readText (file, icb) {
    fs.readFile(path.join(root, file), 'utf-8', function (error, data) {
      if (error) return icb(error)
      icb(null, data.trim())
    })
  }

  var foundRefs = {}

  function insertRefHash (refpath, hash) {
    var sref = refpath.split('/')
    var last = foundRefs
    sref.forEach(function (n, i) {
      if (!n.length) return
      if (typeof last === 'object') {
        last[n] = (sref.length - i > 1) ? (last[n] || {}) : hash
      }
      last = last[n]
    })
  }

  function findRefHash (refpath) {
    var sref = refpath.split('/')
    var last = foundRefs
    var err = sref.some(function (n, i) {
      if (!n.length) return false
      if (typeof last[n] === 'undefined') return true
      last = last[n]
    })
    return err ? null : last
  }

  readText('packed-refs', function (err, data) {
    if (!err) {
      data.split('\n').forEach(function (line) {
        var pref = prefRe.exec(line)
        if (pref && pref.length > 2) {
          insertRefHash(pref[2], pref[1])
        }
      })
    }
    var refsRoot = path.join(root, 'refs')
    var walker = walk.walk(refsRoot, {followLinks: false})
    walker.on('file', function (wroot, fileStat, next) {
      var refpath = path.join(wroot.substr(refsRoot.length), fileStat.name)
      readText(path.join('refs', refpath), function (err, data) {
        if (err) return cb('could not read ref')
        if (hashRe.test(data)) {
          insertRefHash(refpath, data)
          return next()
        }
        var ref = refsRe.exec(data)
        if (!ref || !ref.length) return cb('invalid ref')
        var foundRh = findRefHash(ref[1])
        if (foundRh) {
          insertRefHash(refpath, foundRh)
          return next()
        }
        readText(ref[1], function (err, data) {
          if (err) return cb('could not resolve ref')
          if (hashRe.test(data)) {
            insertRefHash(refpath, data)
            return next()
          }
          cb('invalid hash')
        })
      })
    })

    walker.once('errors', function (wroot, nodeStatsArray, next) {
      walker.removeAllListeners('end')
      cb('could not read refs')
    })

    walker.on('end', function () {
      if (Object.keys(foundRefs).length > 0) return cb(null, foundRefs)
      return cb('empty git repository')
    })
  })
}
