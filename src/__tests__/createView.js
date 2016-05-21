'use strict'

module.exports = function(opts, args = []) {
  return new (require('../StateView').extend(opts))(...args).appendTo(document.body).render()
}
