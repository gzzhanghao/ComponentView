'use strict'

const ComponentView = require('../ComponentView')

describe('ComponentView', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render sub-views', () => {
    const View = ComponentView.extend({
      Child: ComponentView.extend({ template: `<div>:)</div>` }),
      template: `<div><div c-render="Child"></div></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>:)</div></div>')
  })

  it('can pass props to sub-views', () => {
    const View = ComponentView.extend({
      Child: ComponentView.extend({ template() { return `<div>${this.props.text}</div>` } }),
      template: `<div><div c-render="Child" text="foo"></div></div>`
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>foo</div></div>')
  })

  it('can update props of sub-views', () => {
    const View = ComponentView.extend({
      Child: ComponentView.extend({ template() { return `<div>${this.props.text}</div>` } }),
      template() { return `<div><div c-render="Child" text="${this.props.text}"></div></div>` }
    })

    const view = new View({ props: { text: 'foo' } }).appendTo(document.body).render()
    jest.runAllTimers()
    view.update({ text: 'bar' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>bar</div></div>')
  })

  it('can get children with `props.children`', () => {
    const View = ComponentView.extend({
      Child: ComponentView.extend({ template() { return `<div>${this.props.children[0].outerHTML}</div>` } }),
      template() { return `<div><div c-render="Child"><span>foo</span></div></div>` }
    })

    const view = new View().appendTo(document.body).render()
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div><span>foo</span></div></div>')
  })

  it('can update sub-views with `props.children`', () => {
    const View = ComponentView.extend({
      Child: ComponentView.extend({ template() { return `<div>${this.props.children[0].outerHTML}</div>` } }),
      template() { return `<div><div c-render="Child"><span>${this.props.text}</span></div></div>` }
    })

    const view = new View({ props: { text: 'foo' } }).appendTo(document.body).render()
    jest.runAllTimers()
    view.update({ text: 'bar' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div><span>bar</span></div></div>')
  })
})
