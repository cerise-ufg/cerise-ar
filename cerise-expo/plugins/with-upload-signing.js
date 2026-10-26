/**
 * Config plugin: assina o build release (APK/AAB) com o keystore de UPLOAD da
 * Play Store, lido de cerise-expo/keystore/upload.properties (fora do git):
 *
 *   storeFile=cerise-upload.jks      (relativo a cerise-expo/keystore/)
 *   storePassword=...
 *   keyAlias=cerise-upload
 *   keyPassword=...
 *
 * Se o arquivo nao existir, o release cai para a chave de debug (com aviso),
 * como no template do Expo. Com Play App Signing, o Google guarda a chave de
 * assinatura do app; esta e so a chave de upload (pode ser redefinida no Console).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// [cerise] upload signing';

module.exports = function withUploadSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(MARK)) return cfg;
    g = g.replace(
      /signingConfigs \{\n(\s+)debug \{/,
      (m, indent) => `signingConfigs {
${indent}${MARK}
${indent}def ceriseUploadProps = new Properties()
${indent}def ceriseUploadFile = new File(rootDir, '../keystore/upload.properties')
${indent}if (ceriseUploadFile.exists()) { ceriseUploadFile.withInputStream { ceriseUploadProps.load(it) } }
${indent}if (ceriseUploadProps['storeFile']) {
${indent}    upload {
${indent}        storeFile new File(rootDir, '../keystore/' + ceriseUploadProps['storeFile'])
${indent}        storePassword ceriseUploadProps['storePassword']
${indent}        keyAlias ceriseUploadProps['keyAlias']
${indent}        keyPassword ceriseUploadProps['keyPassword']
${indent}    }
${indent}} else {
${indent}    logger.warn('[cerise] keystore/upload.properties ausente: release sera assinado com a chave de DEBUG')
${indent}}
${indent}debug {`,
    );
    g = g.replace(
      /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
      `$1signingConfig (signingConfigs.findByName('upload') ?: signingConfigs.debug)`,
    );
    cfg.modResults.contents = g;
    return cfg;
  });
};
