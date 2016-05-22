'use strict'

const StateView = require('../StateView')

module.exports = StateView.extend({
  initialize() {
    StateView.prototype.initialize.apply(this, arguments)
    this.update(this.state, this.$el)
    this.$el.html('')
  },
  update(nextState, $to) {
    this.children = $to.children()
    this.state = nextState
    this.forceUpdate()
  },
  remove() {
    this.discardElement(this.el)
    this.stopListening()
  }
})
