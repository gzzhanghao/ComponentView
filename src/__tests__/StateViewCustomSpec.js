'use strict'

const $ = require('jquery')
const createView = require('./createView')
const PureView = require('./PureView')
const StateView = require('../StateView')

describe('StateView', () => {
  let onButtonClick

  const TranscludeView = StateView.extend({
    initialize() {
      StateView.prototype.initialize.apply(this, arguments)
      this.update(this.state, this.$el)
    },
    update(nextState, $to) {
      this.template = $(nextState.template).clone(true)[0]
      this.forceUpdate()
    },
    remove() {
      this.discardElement(this.container)
    }
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    onButtonClick = jest.fn()
  })

  it('can render with renderElement', () => {
    const view = createView({
      template: '<div></div>',
      subTemplate: '<div>:P</div>'
    })

    jest.runAllTimers()
    view.renderElement(view.el, view.subTemplate)

    expect(document.body.innerHTML).toBe('<div>:P</div>')
  })

  it('can bind events with renderElement', () => {
    const view = createView({
      onButtonClick,
      template: '<div></div>',
      subTemplate: '<div><button on-click="onButtonClick"></button></div>',
    })

    jest.runAllTimers()
    view.renderElement(view.el, view.subTemplate)
    view.$('button').click()

    expect(onButtonClick).toBeCalled()
  })

  it('can discard events with discardElement', () => {
    const view = createView({
      onButtonClick,
      template: '<div></div>',
      subTemplate: '<div><button on-click="onButtonClick"></button></div>',
    })

    jest.runAllTimers()
    view.renderElement(view.el, view.subTemplate)
    view.discardElement(view.el)
    view.$('button').click()

    expect(onButtonClick).not.toBeCalled()
  })

  it('can render children of module', () => {
    createView({
      subView: PureView.extend({
        TranscludeView,
        template: '<div><span c-render="TranscludeView" c-template="children.0"></span></div>'
      }),
      template: '<div><div c-render="subView"><span>:P</span></div></div>'
    })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div><span>:P</span></div></div>')
  })
})
