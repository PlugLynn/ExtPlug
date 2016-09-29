import jQuery from 'jquery';
import { each, extend, has, partial } from 'underscore';
import Backbone from 'backbone';
import debug from 'debug';
import quote from 'regexp-quote';
import Settings from './models/Settings';
import Style from './util/Style';
import SettingsView from './views/users/settings/DefaultSettingsView';

function isWebpackStyle(v) {
  return Array.isArray(v) && typeof v.i === 'function';
}

const commandsSymbol = Symbol.for('extplug:commands');
const stylesSymbol = Symbol.for('extplug:styles');

const hooks = ['enable', 'disable'];

function configProp(instance, prop) {
  // Prototype properties defined by Backbone-style `.extend()`s
  if (has(instance.constructor.prototype, prop)) {
    return instance[prop];
  }
  // Static properties for ES6 classes.
  if (has(instance.constructor, prop)) {
    return instance.constructor[prop];
  }
  // Give up otherwise.
  return null;
}

export default class Plugin {
  constructor(id, ext) {
    extend(this, Backbone.Events);

    this.id = id;
    this.ext = ext;

    this.debug = debug(`extplug:plugin:${id}`);

    const settingsDescriptor = configProp(this, 'settings');
    const settings = new Settings({}, {
      meta: settingsDescriptor,
    });
    if (settingsDescriptor) {
      each(settingsDescriptor, (setting, name) => {
        settings.set(name, setting.default);
      });
      this._settings = settingsDescriptor; // eslint-disable-line no-underscore-dangle
    }
    this.settings = settings;

    this.refresh = this.refresh.bind(this);
    this.$ = this.$.bind(this);

    // dis/enable hooks used to require _super() calls which were easy to
    // forget. now, we attach events if the methods have been defined.
    // it's all a bit ugly but...
    hooks.forEach((hookName) => {
      this.on(hookName, this[hookName], this);
      // prevent overwriting dis/enable hooks later
      // use the events if you need to do additional work
      Object.defineProperty(this, hookName, {
        value: () => {
          this.trigger(hookName);
          Plugin.trigger(hookName, this);
        },
      });
    });

    // auto-remove event handlers added by the plugin, if the plugin
    // used `.listenTo()`
    this.on('disable', this.stopListening);

    // Styles API
    this[stylesSymbol] = [];
    if (this.style) {
      // declarative `style: {}` API
      this.on('enable', () => {
        this.createStyle(this.style);
      });
    }
    this.on('disable', () => {
      this.removeStyles();
    });

    // Chat Commands API
    this[commandsSymbol] = [];
    if (this.commands) {
      // declarative `commands: {}` API
      this.on('enable', () => {
        each(this.commands, (method, name) => {
          this.addCommand(name, this[method].bind(this));
        });
      });
    }
    this.on('disable', () => {
      this.removeCommands();
    });
  }

  $(sel) {
    this.debug('Plugin#$ is deprecated. Use require(\'jquery\') instead.');
    return jQuery(sel || document);
  }

  // obsolete, but some plugins call _super()
  disable() {} // eslint-disable-line class-methods-use-this
  enable() {} // eslint-disable-line class-methods-use-this

  refresh() {
    this.disable();
    this.enable();
  }

  // Styles API
  createStyle(defaults = {}) {
    const style = new Style();
    if (typeof defaults === 'string') {
      style.raw(defaults);
    } else if (isWebpackStyle(defaults)) {
      style.raw(defaults.toString());
    } else {
      style.set(defaults);
    }
    this[stylesSymbol].push(style);
    return style;
  }
  Style(defaults) {
    this.debug('Plugin#Style is deprecated. Use Plugin#createStyle instead.');
    return this.createStyle(defaults);
  }
  removeStyles() {
    if (this[stylesSymbol]) {
      this[stylesSymbol].forEach(style => style.remove());
    }
    this[stylesSymbol] = [];
  }

  // Chat Commands API
  addCommand(name, cb) {
    const rx = new RegExp(`^/${quote(name)}\\b`);
    const fn = (text) => {
      if (rx.test(text)) {
        cb(text.slice(name.length + 2));
      }
    };
    this[commandsSymbol].push(fn);
    API.on(API.CHAT_COMMAND, fn);
  }
  removeCommands() {
    this[commandsSymbol].forEach(partial(API.off, API.CHAT_COMMAND), API);
    this[commandsSymbol] = [];
  }

  // Settings API
  getSettingsView() {
    return new SettingsView({ model: this.settings });
  }
}

extend(Plugin, Backbone.Events);
