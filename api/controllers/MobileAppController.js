import semver from 'semver'

module.exports = {
  checkShouldUpdate: function (req, res) {
    const iosVersion = req.param('ios-version')
    const androidVersion = req.param('android-version')
    const version = iosVersion || androidVersion
    const platform = iosVersion ? IOS : ANDROID
    return res.ok(shouldUpdate(version, platform))
  }
}

const SUGGEST = 'suggest'
const FORCE = 'force'
const IOS = 'ios'
const ANDROID = 'android'

function shouldUpdate (version, platform) {
  // fix incomplete values like 2 or 2.0
  if (!isNaN(Number(version))) {
    if (semver.valid(version + '.0')) {
      version = version + '.0'
    } else if (semver.valid(version + '.0.0')) {
      version = version + '.0.0'
    }
  }

  if (semver.valid(version)) {
    if (semver.lt(version, '2.0.0')) {
      return resultBuilder(FORCE, platform)
    } else {
      return undefined
    }
  }

  switch (version) {
    case 'test-suggest':
      return resultBuilder(SUGGEST, platform)
    default:
      return resultBuilder(FORCE, platform)
  }
}

function resultBuilder (type, platform) {
  var appStoreLink = process.env.IOS_APP_STORE_URL
  var playStoreLink = process.env.ANDROID_APP_STORE_URL
  var title = type === 'suggest' ? 'An update is available' : 'A new version of the app is available'
  var store = platform === 'ios' ? 'App Store' : 'Play Store'
  var suggestUpdateMessage = `The version you are using is no longer up to date. Please go to the ${store} to update.`
  var forceUpdateMessage = `The version you are using is no longer supported. Please go to the ${store} now to update.`
  var message = type === 'suggest' ? suggestUpdateMessage : forceUpdateMessage
  var link = platform === 'ios' ? appStoreLink : playStoreLink
  return {
    type,
    title,
    message,
    link
  }
}
