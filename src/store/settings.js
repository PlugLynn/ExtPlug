define(function (require, exports, module) {

  const _ = require('underscore');
  const plugSettings = require('plug/store/settings');
  const Settings = require('../models/Settings');

  const settings = new Settings();

  function sync() {
    let newSettings = _.extend({}, plugSettings.settings);
    let muted = $('#volume .icon').hasClass('icon-volume-off');
    // when you mute a song using the volume button, plug.dj does not change the associated setting.
    // here we fake a volume of 0% anyway if the volume is muted, so ExtPlug modules can just
    // use volume throughout and have it work.
    if (newSettings.volume !== 0 && muted) {
      newSettings.volume = 0;
    }
    newSettings.muted = muted;
    settings.set(newSettings);
  }

  settings.update = sync;

  module.exports = settings;

});