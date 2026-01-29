/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.lumenlab.lumos',
  productName: 'Lumos',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: ['dist/**/*', 'package.json'],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
  },
};
