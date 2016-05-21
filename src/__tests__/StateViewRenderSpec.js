'use strict'

jest
  .unmock('jquery')
  .unmock('underscore')
  .unmock('backbone')
  .unmock('morphdom')
  .unmock('./createView')
  .unmock('../StateView')

const createView = require('./createView')

describe('StateView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render template', () => {
    createView({ tagName: 'h1', template: '<h1>It works!</h1>' })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<h1>It works!</h1>')
  })

  it('can update with template', () => {
    const view = createView({ template: '<div>foo</div>' })

    jest.runAllTimers()
    view.template = '<div>bar</div>'
    view.render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can render with state', () => {
    createView({ template: ({ text }) => `<div>${text}</div>` }, [{ text: 'foo' }])

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>foo</div>')
  })

  it('can update render with setState', () => {
    const view = createView({ template: ({ text }) => `<div>${text}</div>` }, [{ text: 'foo' }])

    jest.runAllTimers()
    view.setState({ text: 'bar' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can update render with forceUpdate', () => {
    const view = createView({ template: ({ text }) => `<div>${text}</div>` }, [{ text: 'foo' }])

    jest.runAllTimers()
    view.state.text = 'bar'
    view.forceUpdate()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>bar</div>')
  })

  it('can update elements', () => {
    const view = createView({
      template: ({ state }) => `<div>${state ? '<h1>:D</h1>' : '<span>:(</span>'}</div>`
    })

    jest.runAllTimers()
    view.setState({ state: true })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><h1>:D</h1></div>')
  })

})
