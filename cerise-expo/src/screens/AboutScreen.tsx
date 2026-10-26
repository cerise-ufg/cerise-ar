import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Colors, Space } from '../theme';
import { Button, Card, ScreenHeader, SOFT } from '../ui';
import { MODELS, SOFTWARE_LICENSES } from '../catalog';
import { HUNT_CHARACTERS } from '../game';

export const PRIVACY_URL = 'https://cerise.wenfur.com.br/privacidade.html';

export default function AboutScreen({ onBack }: { onBack: () => void }) {
  const version = Constants.expoConfig?.version ?? '—';
  const build = Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber ?? '';
  const update = Updates.updateId ? Updates.updateId.slice(0, 8) : 'embutida';
  const hunt = HUNT_CHARACTERS.filter((c, i, a) => a.findIndex((x) => x.author === c.author && x.license === c.license) === i);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <ScreenHeader title="Sobre" onBack={onBack} />
      <ScrollView contentContainerStyle={{ gap: Space.md, paddingBottom: Space.xl }} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <Image source={require('../../assets/emblem.png')} style={st.logo} resizeMode="contain" />
          <Text style={st.name}>CERISE <Text style={{ color: Colors.cerise }}>AR</Text></Text>
          <Text style={st.ver}>Versão {version}{build ? ` (${build})` : ''} · runtime {Updates.runtimeVersion ?? version} · atualização {update}</Text>
        </View>

        <Card>
          <Text style={st.h}>O projeto</Text>
          <Text style={st.p}>
            Aplicativo de realidade aumentada do CERISE — Centro de Excelência em Redes Inteligentes Sem Fio e Serviços
            Avançados, Escola de Engenharia Elétrica, Mecânica e de Computação (EMC) da Universidade Federal de Goiás (UFG).
            Permite ver modelos 3D no ambiente real, jogar a Caça CERISE e criar modelos 3D texturizados a partir de uma
            foto, gerados por IA no servidor do CERISE.
          </Text>
          <Text style={[st.p, { marginTop: Space.sm }]}>
            Coordenação: Prof. Dr. Carlos Galvão Pinheiro Junior (Realidade Aumentada) e Prof. Dr. Alisson Assis Cardoso.{'\n'}
            Desenvolvimento: Eduardo Martins de Carvalho Caixeta (bolsista).
          </Text>
        </Card>

        <Card>
          <Text style={st.h}>Privacidade</Text>
          <Text style={st.p}>
            Sem anúncios, sem rastreamento e sem cadastro. As fotos enviadas para gerar modelos 3D são usadas só para isso e
            apagadas do servidor depois de alguns dias. Os modelos gerados ficam guardados neste aparelho.
          </Text>
          <Button small variant="outline" color={Colors.cyan} label="Política de privacidade" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ marginTop: Space.sm }} />
        </Card>

        <Card>
          <Text style={st.h}>Modelos 3D do catálogo</Text>
          {MODELS.map((m) => (
            <Text key={m.id} style={st.li}>• {m.title} — {m.author} ({m.license})</Text>
          ))}
          <Text style={[st.h, { marginTop: Space.md }]}>Personagens da Caça CERISE</Text>
          {hunt.map((c) => (
            <Text key={c.id} style={st.li}>
              • {c.author.includes(c.license) ? c.author : `${c.author} (${c.license === 'sample' ? 'modelo de exemplo do 8th Wall' : c.license})`}
            </Text>
          ))}
        </Card>

        <Card>
          <Text style={st.h}>Software livre</Text>
          {SOFTWARE_LICENSES.map((l) => (
            <Text key={l.name} style={st.li}>• {l.name} — {l.license}</Text>
          ))}
        </Card>

        <Text style={st.foot}>© {new Date().getFullYear()} CERISE / EMC / UFG</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, paddingHorizontal: Space.lg },
  hero: { alignItems: 'center', paddingVertical: Space.md },
  logo: { width: 72, height: 72 },
  name: { color: Colors.white, fontSize: 26, fontWeight: '800', letterSpacing: 1, marginTop: Space.sm },
  ver: { color: SOFT, fontSize: 12, marginTop: 4, textAlign: 'center' },
  h: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  p: { color: SOFT, lineHeight: 20 },
  li: { color: SOFT, fontSize: 13, marginTop: 3 },
  foot: { color: SOFT, fontSize: 11, textAlign: 'center', opacity: 0.7 },
});
