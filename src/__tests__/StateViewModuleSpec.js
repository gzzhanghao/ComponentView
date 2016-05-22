'use strict'

const createView = require('./createView')
const PureView = require('./PureView')

describe('StateView', () => {
  const StateView = require('../StateView')

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('can render sub-views', () => {
    createView({
      subView: PureView.extend({ template: `<div>:P</div>` }),
      template: `<div><div c-render="subView"></div></div>`
    })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>:P</div></div>')
  })

  it('can pass parameters to sub-views', () => {
    createView({
      subView: PureView.extend({
        template() {
          return `<div>${this.state.config.text}</div>`
        }
      }),
      config: { text: ':P' },
      template: `<div><div c-render="subView" c-config="config"></div></div>`
    })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>:P</div></div>')
  })

  it('can update sub-views', () => {
    const view = createView({
      subView: PureView.extend({
        template() {
          return `<div>${this.state.text}</div>`
        }
      }),
      template() {
        return `<div><div c-render="subView" text="${this.state.text}"></div></div>`
      }
    }, [{ text: 'foo' }])

    jest.runAllTimers()
    view.setState({ text: 'bar' })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>bar</div></div>')
  })

  it('can dynamically create sub-views', () => {
    const view = createView({
      subView: PureView.extend({ template: `<div>:P</div>` }),
      template() {
        return `<div><div ${this.state.state ? 'c-render="subView"' : ''}></div></div>`
      }
    })

    jest.runAllTimers()
    view.setState({ state: true })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div>:P</div></div>')
  })

  it('can discard sub-views', () => {
    const view = createView({
      subView: PureView.extend({ template: `<div>:P</div>` }),
      template() {
        return `<div><div ${this.state.state ? 'c-render="subView"' : ''}></div></div>`
      }
    }, [{ state: true }])

    jest.runAllTimers()
    view.setState({ state: false })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div></div></div>')
  })

  it('can render grandchildren', () => {
    createView({
      subView: PureView.extend({
        grandChild: PureView.extend({ template: '<div>:P</div>' }),
        template: `<div><div c-render="grandChild"></div></div>`
      }),
      template: `<div><div c-render="subView"></div></div>`
    })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div><div>:P</div></div></div>')
  })

  it('can dynamically render grandchildren', () => {
    const view = createView({
      subView: PureView.extend({
        grandChild: PureView.extend({ template: '<div>:P</div>' }),
        anotherGrandChild: PureView.extend({ template: '<div>:(</div>' }),
        template() {
          return `<div><div c-render="${this.state.state ? 'grandChild' : 'anotherGrandChild'}"></div></div>`
        }
      }),
      template() {
        return `<div><div c-render="subView" ${this.state.state ? 'state' : ''}></div></div>`
      }
    })

    jest.runAllTimers()
    view.setState({ state: true })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div><div><div>:P</div></div></div>')
  })

  it('can render multiple views on one element', () => {
    createView({
      subView: PureView.extend({
        grandChild: PureView.extend({ template: '<div>:P</div>' }),
        template: '<div c-render="grandChild"></div>'
      }),
      template: '<div c-render="subView"></div>'
    })

    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>:P</div>')
  })

  it('can update multiple views on one element', () => {
    const view = createView({
      subView: PureView.extend({
        grandChild: PureView.extend({ template: '<div>:P</div>' }),
        anotherGrandChild: PureView.extend({ template: '<div>:(</div>' }),
        template() {
          return `<div c-render="${this.state.state ? 'grandChild' : 'anotherGrandChild'}"></div>`
        }
      }),
      template() {
        return `<div c-render="subView" ${this.state.state ? 'state' : ''}></div>`
      }
    })

    jest.runAllTimers()
    view.setState({ state: true })
    jest.runAllTimers()

    expect(document.body.innerHTML).toBe('<div>:P</div>')
  })
})
