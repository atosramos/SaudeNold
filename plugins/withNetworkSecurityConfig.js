const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RESOURCE_NAME = 'network_security_config';
const DEFAULT_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

const ensureNetworkConfigFile = async (projectRoot) => {
  const sourcePath = path.join(projectRoot, `${RESOURCE_NAME}.xml`);
  try {
    await fs.promises.access(sourcePath);
  } catch {
    await fs.promises.writeFile(sourcePath, DEFAULT_XML, 'utf8');
  }

  const destDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
  await fs.promises.mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, `${RESOURCE_NAME}.xml`);
  await fs.promises.copyFile(sourcePath, destPath);
};

const withNetworkSecurityConfig = (config) => {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$['android:usesCleartextTraffic'] = 'true';
      application.$['android:networkSecurityConfig'] = `@xml/${RESOURCE_NAME}`;
    }
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      await ensureNetworkConfigFile(config.modRequest.projectRoot);
      return config;
    },
  ]);

  return config;
};

module.exports = withNetworkSecurityConfig;
