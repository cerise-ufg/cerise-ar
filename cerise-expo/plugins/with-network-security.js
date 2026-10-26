/**
 * Config plugin: network security config RESTRITA para Android.
 *
 * - Todo trafego em texto puro (http://) fica bloqueado (base-config).
 * - Excecao apenas para hosts de teste local: 10.0.2.2 (host visto pelo emulador),
 *   localhost e 127.0.0.1 — usados com o mock (tools/mock-gen3d-server.js) e com o
 *   encaminhamento SSH local para o servidor 3D. Nenhum dominio da internet recebe
 *   permissao de cleartext; producao usa https://cerise.wenfur.com.br/gen3d.
 *
 * Opcao: { hosts: string[] } para trocar a lista de excecoes ([] = nenhuma).
 */
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const DEFAULT_HOSTS = ['10.0.2.2', 'localhost', '127.0.0.1'];

function xml(hosts) {
  const domains = hosts.map((h) => `    <domain includeSubdomains="false">${h}</domain>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado por plugins/with-network-security.js (nao edite em android/). -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
${hosts.length ? `  <!-- Somente testes locais: emulador (10.0.2.2) e loopback. -->
  <domain-config cleartextTrafficPermitted="true">
${domains}
  </domain-config>
` : ''}</network-security-config>
`;
}

module.exports = function withNetworkSecurity(config, opts = {}) {
  const hosts = Array.isArray(opts.hosts) ? opts.hosts : DEFAULT_HOSTS;
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'network_security_config.xml'), xml(hosts));
      return cfg;
    },
  ]);
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    // Garante que nenhum "usesCleartextTraffic=true" global vaze para o release.
    delete app.$['android:usesCleartextTraffic'];
    return cfg;
  });
  return config;
};
