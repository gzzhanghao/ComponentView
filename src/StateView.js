var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var morphdom = require('morphdom');

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
 * StateView class
 */
var StateView = Backbone.View.extend({

  /**
   * View methods
   */

   /**
    * Instanciate StateView
    *
    * @constructor StateView
    *
    * @inherits Backbone.View
    *
    * @param {Object?} opts
    */
  initialize: function(opts) {
    this.boundMethods = {};
    this.renderTask = null;
    this.renderCallback = [];

    this.state = {};
    if (opts && opts.state) {
      this.state = opts.state;
    }
  },

  /**
   * Enqueue a rendering task
   *
   * @param {Function} callback
   *
   * @return {StateView} self
   */
  render: function(callback) {
    var self = this;

    if (self.renderTask) {
      cancelAnimationFrame(self.renderTask);
    }
    if (callback) {
      self.renderCallback.push(callback);
    }

    self.renderTask = requestAnimationFrame(function() {
      self.renderTask = null;
      var tmpl = self.template;
      if (_.isFunction(tmpl)) {
        tmpl = tmpl.call(self, self.state);
      }
      self.renderElement(self.el, tmpl);
      for (var i = self.renderCallback.length - 1; i >= 0; i--) {
        self.renderCallback[i]();
      }
      self.renderCallback = [];
    });

    return self;
  },

  /**
   * Append the view to a parent element
   *
   * @param {HTMLElement|jQuery} parent
   *
   * @return {StateView} self
   */
  appendTo: function(parent) {
    this.$el.appendTo(parent);
    return this;
  },

  /**
   * Remove the StateView
   *
   * It will remove all sub-views bound on the element
   *
   * @return {StateView} self
   */
  remove: function() {
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
   * @return {StateView} self
   */
  setState: function(nextState, callback) {
    this.state = _.extend({}, this.state, nextState);
    return this.render(callback);
  },

  /**
   * Trigger a render process
   *
   * @alias StateView.prototype.render
   *
   * @param {Function} callback
   *
   * @return {StateView} self
   */
  forceUpdate: function(callback) {
    return this.render(callback);
  },

  /**
   * Internal methods
   */

  /**
   * Bind the template with the StateView instance
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

    $(tmpl).data('StateView.Context', this);
    for (var i = children.length - 1; i >= 0; i--) {
      $(children[i]).data('StateView.Context', this);
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
   * @return {StateView} self
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

        var toRender = $to.attr('c-render');

        if (toRender) {
          renderLevel += 1;
        }

        // update element context

        $from.data('StateView.Context', $to.data('StateView.Context'));

        // update bound view if exists

        var view = $from.data('StateView.SubView#' + self.cid);

        if (view) {
          var data = StateView.getElementData(toEl);

          // update view if it is compatible with the new one

          if (view.update && toRender && view instanceof data.render && view.update(data, $to) !== false) {
            renderLevel -= 1;
            return false;
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
        var $el = $(el);
        if (!$el.attr('c-render')) {
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
   * @return {StateView} self
   */
  discardElement: function(el) {
    var self = this;

    walkTree(el, function(el) {
      var $el = $(el);

      var view = $el.data('StateView.SubView#' + self.cid);
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

    var ctx = $el.data('StateView.Context');
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
  var data = StateView.getElementData(event.currentTarget);
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
  return _.chain(el.attributes)
    .map(function(node) { return node.nodeName })
    .filter(function(name) { return name.slice(0, 3) === 'on-' })
    .map(function(name) { return name.slice(3) })
    .value();
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
 * @param {StateView}   ctx
 * @param {HTMLElement} rootEl
 */
function renderView(ctx, rootEl) {
  walkTree(rootEl, function(el) {
    var $el = $(el);

    if ($el.attr('c-render')) {
      var data = StateView.getElementData(el);
      $el.data('StateView.SubView#' + ctx.cid, new data.render({ el: el, $el: $el, state: data }));
      return false;
    }

    // bind events when no render function provided
    var events = getEvents(el);
    for (var i = events.length - 1; i >= 0; i--) {
      $el.on(events[i], dispatchEvent);
    }
  });
}

module.exports = StateView;
