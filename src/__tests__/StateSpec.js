'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render with state', () => {
    const View = ComponentView.extend({
      getInitialState() {
        return { foo: 'bar' }
      },
      template() {
        return `<div>${this.state.foo}</div>`
      }
    })

    new View().appendTo(document.body).render()

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can update with state', () => {
    const View = ComponentView.extend({
      getInitialState() {
        return { foo: 'bar' }
      },
      template() {
        return `<div>${this.state.foo}</div>`
      }
    })

    const view = new View().appendTo(document.body).render()

    jest.runAllTimers()
    view.setState({ foo: 'baz' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>baz</div>')
  })

  it('can update with forceUpdate', () => {
    const View = ComponentView.extend({
      getInitialState() {
        return { foo: 'bar' }
      },
      template() {
        return `<div>${this.state.foo}</div>`
      }
    })

    const view = new View().appendTo(document.body).render()

    jest.runAllTimers()
    view.state.foo = 'baz'
    view.forceUpdate()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>baz</div>')
  })
})
