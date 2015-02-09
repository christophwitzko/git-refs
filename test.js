'use strict'

var exec = require('child_process').exec

var test = require('tape')

var gitRefs = require('./')

var refRe = /^([0-9a-f]{40}) refs\/(.*)$/

var compareRefs = {}

function findRefHash (refObj, refpath) {
  if (typeof refObj === 'undefined') return null
  var sref = refpath.split('/')
  var last = refObj
  var err = sref.some(function (n, i) {
    if (!n.length) return false
    if (typeof last[n] === 'undefined') return true
    last = last[n]
  })
  return err ? null : last
}

test('get git refs', function (t) {
  t.plan(2)
  exec('git show-ref', function (error, stdout, stderr) {
    t.error(error, 'error')
    stdout.trim().split('\n').forEach(function (line) {
      var pref = refRe.exec(line)
      if (pref && pref.length > 2) {
        compareRefs[pref[2]] = pref[1]
      }
    })
    t.ok(Object.keys(compareRefs).length > 0, 'refs length')
  })
})

test('compare refs', function (t) {
  t.plan(1 + Object.keys(compareRefs).length)
  gitRefs(function (err, data) {
    t.error(err, 'error')
    Object.keys(compareRefs).forEach(function (k, i) {
      t.equal(findRefHash(data, k), compareRefs[k], 'ref ' + (i + 1))
    })
  })
})
