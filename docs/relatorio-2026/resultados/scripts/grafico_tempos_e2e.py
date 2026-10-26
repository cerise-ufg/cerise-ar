"""Grafico dos tempos por etapa medidos pelo app contra o servidor 3D real (26/10/2026).

Fonte: resultados/real-tempos-app.json (gerado por tempos_e2e.py a partir do logcat do app).
Saida: evidencias/fig19-grafico-tempos-real.png (150 dpi).
uso: python grafico_tempos_e2e.py <pasta APP_CERISE_AR>
"""
import json
import os
import sys

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402

base = sys.argv[1]
rows = json.load(open(os.path.join(base, 'resultados', 'real-tempos-app.json'), encoding='utf-8'))
PRESET = {'rapido': 'Rápido', 'padrao': 'Padrão', 'alto': 'Alto'}
OBJ = {'Pato de borracha': 'Pato', 'Bule de prata': 'Bule', 'Gato (estatueta)': 'Gato', 'Burro (estatueta)': 'Burro'}


def label(r):
    extra = ''
    if r['cache']:
        extra = '\n(reenvio: cache do servidor)'
    elif 'atrás' in r['cenario']:
        extra = '\n(atrás de 1 job Alto de outro cliente)'
    return f"{OBJ.get(r['objeto'], r['objeto'])} · {PRESET[r['preset']]}{extra}"


order = sorted(range(len(rows)), key=lambda i: rows[i]['total_app_s'])
rows = [rows[i] for i in order]
SEG = [('envio_s', 'Envio', '#2a78d6'), ('fila_app_s', 'Fila', '#eb6834'),
       ('geracao_app_s', 'Geração', '#1baf7a'), ('download_s', 'Download', '#eda100')]

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10})
fig, ax = plt.subplots(figsize=(10, 4.8), dpi=150)
fig.patch.set_facecolor('#fcfcfb')
ax.set_facecolor('#fcfcfb')
y = list(range(len(rows)))
left = [0.0] * len(rows)
for key, name, color in SEG:
    vals = [r[key] for r in rows]
    ax.barh(y, vals, left=left, height=0.56, color=color, label=name, edgecolor='#fcfcfb', linewidth=1.5)
    left = [a + b for a, b in zip(left, vals)]
for yi, r in zip(y, rows):
    srv = f" · execução no servidor {r['execucao_servidor_s']:.1f} s".replace('.', ',') if not r['cache'] else ''
    ax.text(r['total_app_s'] + 0.6, yi, f"{r['total_app_s']:.1f} s".replace('.', ',') + srv,
            va='center', ha='left', fontsize=9, color='#0b0b0b')
ax.set_yticks(y)
ax.set_yticklabels([label(r) for r in rows], fontsize=9, color='#0b0b0b')
ax.set_xlabel('tempo medido no app (s)', color='#52514e')
ax.set_xlim(0, max(r['total_app_s'] for r in rows) * 1.42)
ax.grid(axis='x', color='#e4e3df', linewidth=0.8)
ax.set_axisbelow(True)
for side in ('top', 'right', 'left'):
    ax.spines[side].set_visible(False)
ax.spines['bottom'].set_color('#c3c2b7')
ax.tick_params(axis='y', length=0)
ax.tick_params(axis='x', colors='#52514e')
ax.legend(loc='lower right', ncol=4, frameon=False, fontsize=9)
ax.set_title('App Android (emulador) × servidor 3D real: tempo por etapa de cada pedido', fontsize=11, color='#0b0b0b', loc='left')
fig.tight_layout()
out = os.path.join(base, 'evidencias', 'fig19-grafico-tempos-real.png')
fig.savefig(out, dpi=150, facecolor=fig.get_facecolor())
print(out)
