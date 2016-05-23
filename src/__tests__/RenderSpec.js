'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render', () => {
    const View = ComponentView.extend({ template: `<div>Hello world:)</div>` })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>Hello world:)</div>')
  })

  it('can render with leading whitespaces', () => {
    const View = ComponentView.extend({ template: ` <div>Hello world:)</div> ` })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>Hello world:)</div>')
  })

  it('can merge multiple render tasks', () => {
    const View = ComponentView.extend({
      template: jest.fn(() => `<div>foo</div>`)
    })

    const view = new View().appendTo(document.body).render()
    view.render().render()
    jest.runAllTimers()

    expect(view.template.mock.calls.length).toBe(1)
  })

  it('can update', () => {
    const View = ComponentView.extend({ template: `<div>foo</div>` })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.template = `<div>bar</div>`
    view.render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can invoke render callback', () => {
    const renderCallback = jest.fn()
    const View = ComponentView.extend({ template: `<div>foo</div>` })

    const view = new View().appendTo(document.body).render(renderCallback)
    jest.runAllTimers()

    expect(renderCallback.mock.calls.length).toBe(1)
  })
})
