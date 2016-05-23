'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render with props', () => {
    const View = ComponentView.extend({
      template() {
        return `<div>${this.props.foo}</div>`
      }
    })

    new View({ props: { foo: 'bar' }}).appendTo(document.body).render()

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can update with props', () => {
    const View = ComponentView.extend({
      template() {
        return `<div>${this.props.foo}</div>`
      }
    })

    const view = new View({ props: { foo: 'bar' } }).appendTo(document.body).render()

    jest.runAllTimers()
    view.update({ foo: 'baz' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>baz</div>')
  })
})
