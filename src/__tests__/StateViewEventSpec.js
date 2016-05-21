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
  let onButtonClick

  beforeEach(() => {
    document.body.innerHTML = ''
    onButtonClick = jest.fn()
  })

  it('can bind events', () => {
    const view = createView({
      onButtonClick,
      template: `
        <div>
          <button on-click="onButtonClick">click me</button>
        </div>
      `
    })

    jest.runAllTimers()
    view.$('button').click()

    expect(onButtonClick).toBeCalled()
    expect(onButtonClick.mock.calls.length).toBe(1)
    expect(onButtonClick.mock.calls[0][0].type).toEqual('click')
  })

  it('can discard event handler', () => {
    const view = createView({
      onButtonClick,
      template: ({ state }) => `
        <div>
          <button ${state ? 'on-click="onButtonClick"' : ''}>click me</button>
        </div>
      `
    }, [{ state: true }])

    jest.runAllTimers()
    view.setState({ state: false })
    jest.runAllTimers()
    view.$('button').click()

    expect(onButtonClick).not.toBeCalled()
  })

  it('can update event handler', () => {
    const yetAnotherHandler = jest.fn()
    const view = createView({
      onButtonClick,
      yetAnotherHandler,
      template: ({ state }) => `
        <div>
          <button on-click="${state ? 'onButtonClick' : 'yetAnotherHandler'}">click me</button>
        </div>
      `
    }, [{ state: true }])

    jest.runAllTimers()
    view.setState({ state: false })
    jest.runAllTimers()
    view.$('button').click()

    expect(onButtonClick).not.toBeCalled()
    expect(yetAnotherHandler).toBeCalled()
  })

  it('can trigger events with data', () => {
    const view = createView({
      inst: {},
      onButtonClick,
      template: `
        <div>
          <button on-click="onButtonClick" key="value" c-inst="inst">click me</button>
        </div>
      `
    })

    jest.runAllTimers()
    view.$('button').click()

    expect(onButtonClick.mock.calls[0][1].key).toEqual('value')
    expect(onButtonClick.mock.calls[0][1].inst).toBe(view.inst)
    expect(onButtonClick.mock.calls[0][1].onClick).toEqual(jasmine.any(Function))
  })

  it('can trigger events with deep data', () => {
    const view = createView({
      deep: { deep: ['data'] },
      onButtonClick,
      template: `
        <div>
          <button on-click="onButtonClick" c-data="deep.deep.0">click me</button>
        </div>
      `
    })

    jest.runAllTimers()
    view.$('button').click()

    expect(onButtonClick.mock.calls[0][1].data).toBe('data')
  })
})
