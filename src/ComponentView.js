var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var morphdom = require('morphdom');

var CONTEXT_KEY = 'ComponentView.Context';
var SUBVIEW_KEY = 'ComponentView.SubView#';

var SEP_REGEX     = /-./g;
var COMMENT_REGEX = /<!--[\w\W]*?-->/g;

/**
 * request / cancel animation frame and its polyfills
 */
var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;
if (!requestAnimationFrame) {
  requestAnimationFrame = function(cb) { return window.setTimeout(cb, 0) };
  cancelAnimationFrame = function(id) { return window.clearTimeout(id) };
}

/**
 * Build HTML string to DOM Element
 *
 * @private
 *
 * @param {string} html
 *
 * @return {Node}
 */
var buildTemplate = (function() {

  // For range.createContextualFragment
  if (document.createRange) {
    var range = document.createRange();
    if (range.createContextualFragment) {
      return function(html) {
        return range.createContextualFragment(stripComments(html.trim())).firstChild;
      };
    }
  }

  return function(html) {
    var fragment = document.createElement('body');
    fragment.innerHTML = stripComments(html.trim());
    return fragment.firstChild;
  };

})();

/**
 * ComponentView class
 */
var ComponentView = Backbone.View.extend({

  /**
   * View methods
   */

   /**
    * Instanciate ComponentView
    *
    * @constructor ComponentView
    *
    * @inherits Backbone.View
    *
    * @param {Object?} opts
    */
  initialize: function(opts) {
    this.boundMethods = {};
    this.renderTask = null;
    this.renderCallback = [];
    this.isFirstRender = true;

    this.state = _.result(this, 'getInitialState', {});

    this.props = {};
    if (opts && opts.props) {
      this.props = opts.props;
    }
  },

  /**
   * Enqueue a rendering task
   *
   * @param {Function} callback
   *
   * @return {ComponentView} self
   */
  render: function(callback) {
    var self = this;

    if (self.isFirstRender) {
      self.componentWillMount();
    } else {
      self.componentWillUpdate();
    }

    if (self.renderTask) {
      cancelAnimationFrame(self.renderTask);
    }
    if (callback) {
      self.renderCallback.push(callback);
    }

    self.renderTask = requestAnimationFrame(function() {
      var isFirstRender = self.isFirstRender;

      self.renderTask = null;
      self.isFirstRender = false;

      self.renderElement(self.el, _.result(self, 'template'));

      for (var i = self.renderCallback.length - 1; i >= 0; i--) {
        self.renderCallback[i]();
      }
      self.renderCallback = [];

      if (isFirstRender) {
        self.componentDidMount();
      } else {
        self.componentDidUpdate();
      }
    });

    return self;
  },

  /**
   * Append the view to a parent element
   *
   * @param {HTMLElement|jQuery} parent
   *
   * @return {ComponentView} self
   */
  appendTo: function(parent) {
    this.$el.appendTo(parent);
    return this;
  },

  /**
   * Default update method
   *
   * @param {Object} nextProps
   *
   * @return {ComponentView} self
   */
  update: function(nextProps) {
    this.componentWillReceiveProps(nextProps);
    if (this.shouldComponentUpdate(nextProps, this.state) !== false) {
      this.props = nextProps;
      this.render();
    }
    return this;
  },

  /**
   * Remove the ComponentView
   *
   * It will remove all sub-views bound on the element
   *
   * @return {ComponentView} self
   */
  remove: function() {
    this.componentWillUnmount();
    this.discardElement(this.el);
    this.stopListening();
    return this;
  },

  /**
   * React aligned methods
   */

  /**
   * Update state and trigger a render process
   *
   * This will not mutate the origin state object
   *
   * @param {Object}   nextState
   * @param {Function} callback
   *
   * @return {ComponentView} self
   */
  setState: function(nextState, callback) {
    var nextState = _.extend({}, this.state, nextState);
    if (this.shouldComponentUpdate(this.props, nextState) === false) {
      return this;
    }
    this.state = nextState;
    return this.render(callback);
  },

  /**
   * Trigger a render process
   *
   * @alias ComponentView.prototype.render
   *
   * @param {Function} callback
   *
   * @return {ComponentView} self
   */
  forceUpdate: function(callback) {
    return this.render(callback);
  },

  /**
   * Internal methods
   */

  /**
   * Bind the template with the ComponentView instance
   *
   * @param {string|HTMLElement} tmpl
   *
   * @return {Node}
   */
  bindTemplate: function(tmpl) {
    if (_.isString(tmpl)) {
      tmpl = buildTemplate(tmpl);
    }

    var children = tmpl.querySelectorAll('*');

    $(tmpl).data(CONTEXT_KEY, this);
    for (var i = children.length - 1; i >= 0; i--) {
      $(children[i]).data(CONTEXT_KEY, this);
    }

    return tmpl;
  },

  /**
   * Render an element with given template
   *
   * @param {HTMLElement}        el
   * @param {string|HTMLElement} tmpl
   * @param {boolean}            childrenOnly
   *
   * @return {ComponentView} self
   */
  renderElement: function(el, tmpl, childrenOnly) {
    var self = this;
    var renderLevel = 0;

    if (_.isString(tmpl)) {
      tmpl = self.bindTemplate(tmpl);
    }

    morphdom(el, tmpl, {

      childrenOnly: childrenOnly,

      /**
       * Render the added node
       */
      onNodeAdded: function(node) {
        if (_.isElement(node) && !renderLevel) {
          renderView(self, node);
        }
      },

      /**
       * Discard node before removed
       */
      onBeforeNodeDiscarded: function(node) {
        if (_.isElement(node)) {
          self.discardElement(node);
        }
      },

      /**
       * Update views and events
       */
      onBeforeElUpdated: function(fromEl, toEl) {
        var $from = $(fromEl);
        var $to = $(toEl);

        // bump render level to prevent rendering grandchildren

        var toRender = toEl.getAttribute('c-render');

        if (toRender) {
          renderLevel += 1;
        }

        // update element context

        $from.data(CONTEXT_KEY, $to.data(CONTEXT_KEY));

        // update bound view if exists

        var view = $from.data(SUBVIEW_KEY + self.cid);

        if (view) {
          var props = ComponentView.getElementData(toEl);

          // update view if it is compatible with the new one

          if (view.update && toRender && view instanceof props.render) {
            props.children = $to.children();
            if (view.update(props) !== false) {
              renderLevel -= 1;
              return false;
            }
          }

          // discard view otherwise

          self.discardElement(fromEl);
        }

        if (toRender) {
          return;
        }

        // update bound events

        var fromEvents = getEvents(fromEl);
        var toEvents = getEvents(toEl);

        var newEvents = _.difference(toEvents, fromEvents);
        for (var i = newEvents.length - 1; i >= 0; i--) {
          $from.on(newEvents[i], dispatchEvent);
        }

        var removedEvents = _.difference(fromEvents, toEvents);
        for (var i = removedEvents.length - 1; i >= 0; i--) {
          $from.off(removedEvents[i], dispatchEvent);
        }
      },

      /**
       * Re-bind views
       */
      onElChildrenUpdated: function(el) {
        if (!el.getAttribute('c-render')) {
          return;
        }
        renderLevel -= 1;
        if (!renderLevel) {
          renderView(self, el);
        }
      },

    });
  },

  /**
   * Remove bound views and events from the element and its children
   *
   * @param {HTMLElement} el
   *
   * @return {ComponentView} self
   */
  discardElement: function(el) {
    var self = this;

    walkTree(el, function(el) {
      var $el = $(el);

      var view = $el.data(SUBVIEW_KEY + self.cid);
      if (view) {
        view.remove && view.remove();
        return false;
      }

      var events = getEvents(el);
      for (var i = events.length - 1; i >= 0; i--) {
        $el.off(events[i], dispatchEvent);
      }
    });
  },

  /**
   * Lifecycle methods
   */

  componentWillMount: _.noop,

  componentDidMount: _.noop,

  componentWillReceiveProps: _.noop,

  shouldComponentUpdate: _.noop,

  componentWillUpdate: _.noop,

  componentDidUpdate: _.noop,

  componentWillUnmount: _.noop,

}, {

  /**
   * Get element's bound data
   *
   * This method will autobind shallow functions
   *
   * @param {HTMLElement} el
   *
   * @return {Object}
   */
  getElementData: function(el) {
    var $el = $(el);

    var ctx = $el.data(CONTEXT_KEY);
    if (!ctx) {
      return {};
    }

    var data = {};
    var attrs = el.attributes;

    for (var i = attrs.length - 1; i >= 0; i--) {
      var name = attrs[i].nodeName;
      var value = attrs[i].value;

      if (name.slice(0, 2) === 'c-') {
        name = name.slice(2);
      } else if (name.slice(0, 3) !== 'on-') {
        data[camelize(name)] = value || true;
        continue;
      }

      var path = value.split('.');

      // already bound method
      if (ctx.boundMethods[value]) {
        data[camelize(name)] = ctx.boundMethods[value];
        continue;
      }

      // shallow property, auto-bind if is method
      if (path.length === 1) {
        value = ctx[path[0]];
        if (_.isFunction(value)) {
          value = ctx.boundMethods[path[0]] = value.bind(ctx);
        }
        data[camelize(name)] = value;
        continue;
      }

      // deep property
      value = ctx;
      for (var j = 0, jj = path.length; j < jj; j++) {
        value = value[path[j]];
      }
      data[camelize(name)] = value;
    }

    return data;
  },

});

/**
 * Return camelized string
 *
 * @private
 *
 * @example
 *   camelize('str-to-camelize') === 'strToCamelize'
 *
 * @param {string} str
 *
 * @return {string}
 */
function camelize(str) {
  return str.replace(SEP_REGEX, function(match) {
    return match.charAt(1).toUpperCase();
  });
}

/**
 * Return capitalized string
 *
 * @private
 *
 * @example
 *   capitalize('str-to-capitalize') === 'Str-to-capitalize'
 *
 * @param {string} str
 *
 * @return {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Return HTML that removed comments
 *
 * @private
 *
 * @param {string} html
 *
 * @return {string}
 */
function stripComments(html) {
  if (html.indexOf('<!--') < 0) {
    return html;
  }
  return html.replace(COMMENT_REGEX, '');
}

/**
 * Dispatch events to handlers
 *
 * @private
 *
 * Event's target element must have an attribute that specifies the event handler
 *
 * @example
 *   on-click="eventHandler"
 *
 * @param {Event} event
 */
function dispatchEvent(event) {
  var data = ComponentView.getElementData(event.currentTarget);
  if (data) {
    return data['on' + capitalize(camelize(event.type))](event, data);
  }
}

/**
 * Get all attributes with prefix `on-`
 *
 * @private
 *
 * @param {HTMLElement} el
 *
 * @return {Array} target attribute names without leading `on-`
 */
function getEvents(el) {
  var events = [];
  var attrs = el.attributes;
  for (var i = attrs.length - 1; i >= 0; i--) {
    var name = attrs[i].nodeName;
    if (name.slice(0, 3) === 'on-') {
      events.push(name.slice(3));
    }
  }
  return events;
}

/**
 * Walk through a DOM tree with DFS
 *
 * @private
 *
 * @param {HTMLElement}               rootEl
 * @param {(HTMLElement) => boolean?} callback
 */
function walkTree(rootEl, callback) {
  var children = rootEl.querySelectorAll('*');
  if (callback(rootEl) === false) {
    return;
  }
  for (var i = 0, ii = children.length; i < ii; i++) {
    if (callback(children[i]) !== false) {
      continue;
    }
    for (var j = i; j >= 0; j--) {
      var nextSibling = children[j].nextSibling;
      while (nextSibling && !_.isElement(nextSibling)) {
        nextSibling = nextSibling.nextSibling;
      }
      if (!nextSibling) {
        continue;
      }
      var k = i + 1;
      while (k < children.length && children[k] !== nextSibling) {
        k += 1;
      }
      i = k - 1;
      break;
    }
    if (j < 0) {
      break;
    }
  }
}

/**
 * Render element and its children
 *
 * @private
 *
 * @param {ComponentView}   ctx
 * @param {HTMLElement} rootEl
 */
function renderView(ctx, rootEl) {
  walkTree(rootEl, function(el) {
    var $el = $(el);

    if (el.getAttribute('c-render')) {
      var props = ComponentView.getElementData(el);
      props.children = $el.children().remove();
      $el.data(SUBVIEW_KEY + ctx.cid, new props.render({ el: el, props: props }).render());
      return false;
    }

    // bind events when no render function provided
    var events = getEvents(el);
    for (var i = events.length - 1; i >= 0; i--) {
      $el.on(events[i], dispatchEvent);
    }
  });
}

module.exports = ComponentView;
