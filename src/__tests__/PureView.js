'use strict'

jest
  .unmock('jquery')
  .unmock('underscore')
  .unmock('backbone')
  .unmock('morphdom')
  .unmock('../StateView')

const StateView = require('../StateView')

module.exports = StateView.extend({
  initialize($container, initialState) {
    StateView.prototype.initialize.call(this, initialState)
    this.children = Array.from($container.children())
    this.setElement($container.html(''))
    this.render()
  },
  update($to, nextState) {
    this.children = Array.from($to.children())
    this.state = nextState
    this.forceUpdate()
  },
  remove() {
    this.discardElement(this.el)
    this.stopListening()
  }
})
