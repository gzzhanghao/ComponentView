'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can bind events', () => {
    const View = ComponentView.extend({
      onClick: jest.fn(),
      template: `<div on-click="onClick"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.el.click()

    expect(view.onClick.mock.calls.length).toBe(1)
    expect(view.onClick.mock.calls[0][0]).toEqual(jasmine.objectContaining({ type: 'click' }))
  })

  it('can bind events on children', () => {
    const View = ComponentView.extend({
      onClick: jest.fn(),
      template: `<div><span on-click="onClick"></span></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    document.querySelector('span').click()

    expect(view.onClick.mock.calls.length).toBe(1)
    expect(view.onClick.mock.calls[0][0]).toEqual(jasmine.objectContaining({ type: 'click' }))
  })

  it('can update events', () => {
    const View = ComponentView.extend({
      onClickOne: jest.fn(),
      onClickTwo: jest.fn(),
      template: `<div on-click="onClickOne"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.template = `<div on-click="onClickTwo"></div>`
    view.render()
    jest.runAllTimers()
    view.el.click()

    expect(view.onClickOne.mock.calls.length).toBe(0)
    expect(view.onClickTwo.mock.calls.length).toBe(1)
    expect(view.onClickTwo.mock.calls[0][0]).toEqual(jasmine.objectContaining({ type: 'click' }))
  })

  it('can discard events', () => {
    const View = ComponentView.extend({
      onClick: jest.fn(),
      template: `<div on-click="onClick"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.template = `<div></div>`
    view.render()
    jest.runAllTimers()
    view.el.click()

    expect(view.onClick.mock.calls.length).toBe(0)
  })

  it('can discard events when removed', () => {
    const View = ComponentView.extend({
      onClick: jest.fn(),
      template: `<div on-click="onClick"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.remove()
    view.el.click()

    expect(view.onClick.mock.calls.length).toBe(0)
  })

  it('can pass data to event handlers', () => {
    const View = ComponentView.extend({
      onClick: jest.fn(),
      template: `<div on-click="onClick" foo="bar"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()
    view.el.click()

    expect(view.onClick.mock.calls[0][1]).toEqual(ComponentView.getElementData(view.el))
  })
})
