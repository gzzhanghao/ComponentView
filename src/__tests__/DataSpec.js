'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can get data on element', () => {
    const View = ComponentView.extend({
      template: `<div foo="bar"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(view.el)).toEqual({ foo: 'bar' })
  })

  it('can get data on children', () => {
    const View = ComponentView.extend({
      template: `<div><span foo="bar"></span></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(document.querySelector('span'))).toEqual({ foo: 'bar' })
  })

  it('can get dynamic data', () => {
    const View = ComponentView.extend({
      foo: {},
      template: `<div c-foo="foo"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(view.el)).toEqual({ foo: view.foo })
  })

  it('can get deep data', () => {
    const View = ComponentView.extend({
      deep: { depp: { data: 'bar' } },
      template: `<div c-foo="deep.deep"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(view.el)).toEqual({ foo: view.deep.deep })
  })

  it('can bind shallow functions', () => {
    const View = ComponentView.extend({
      foo() { return this },
      template: `<div c-foo="foo"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(view.el).foo()).toBe(view)
  })

  it('can cache shallow functions', () => {
    const View = ComponentView.extend({
      foo() { return this },
      template: `<div c-foo="foo"></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(ComponentView.getElementData(view.el).foo).toBe(ComponentView.getElementData(view.el).foo)
  })
})
