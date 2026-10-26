"""Consolida os tempos do teste ponta a ponta do app contra o servidor 3D real (26/10/2026).

Entradas:
  - logcat do app (linhas "[gen3d] modelo pronto {...}" emitidas por src/gen3d/jobs.ts ao fim de cada download)
  - real-jobs-servidor.json (estado final de cada job consultado em GET /api/v1/jobs/{id})
Saidas: real-tempos-app.csv e real-tempos-app.json (mesma pasta do JSON do servidor).

uso: python tempos_e2e.py logcat-rnjs.txt real-jobs-servidor.json
"""
import csv
import json
import os
import re
import sys

ROTULOS = {  # job_id -> (objeto, cenario)
    '9033f74d7f5546abafd4f9846fd75fb3': ('Pato de borracha', 'fila vazia'),
    '8f5e71a84fab4c4c918700eae9dd50ab': ('Bule de prata', 'fila vazia'),
    '45ee03a9fb7546099c9cae7c1ba97a04': ('Gato (estatueta)', 'fila vazia'),
    '9fd846994a144975b3ee1c9065448366': ('Burro (estatueta)', 'fila vazia'),
    'aae988cf77de4301a6d9caeb79a8523e': ('Gato (estatueta)', 'atrás de 1 job Alto de outro cliente'),
    'b4868ae4171e4cfebfd12e1eb0bcf64c': ('Pato de borracha', 'reenvio da mesma foto (cache)'),
}

logcat, srv_path = sys.argv[1], sys.argv[2]
srv = json.load(open(srv_path, encoding='utf-8'))
srv_by_id = {v.get('job_id'): v for v in srv.values()}
rows = []
for line in open(logcat, encoding='utf-8', errors='replace'):
    m = re.search(r'^(\S+ \S+).*\[gen3d\] modelo pronto (\{.*\})\s*$', line)
    if not m:
        continue
    d = json.loads(m.group(2))
    t = d['timings']
    job = d['job']
    s = srv_by_id.get(job, {})
    st = ((s.get('result') or {}).get('stats')) or {}
    obj, cen = ROTULOS.get(job, ('?', '?'))
    rows.append({
        'hora_logcat_utc': m.group(1),
        'objeto': obj,
        'cenario': cen,
        'preset': d['options']['preset'],
        'job_id': job,
        'envio_s': round(t.get('uploadMs', 0) / 1000, 3),
        'fila_app_s': round(t.get('queueMs', 0) / 1000, 3),
        'geracao_app_s': round(t.get('generationMs', 0) / 1000, 3),
        'download_s': round(t.get('downloadMs', 0) / 1000, 3),
        'total_app_s': round(t.get('totalMs', 0) / 1000, 3),
        'fila_servidor_s': (s.get('timings') or {}).get('queue_s'),
        'execucao_servidor_s': (s.get('timings') or {}).get('run_s'),
        'gpu_pipeline_s': st.get('seconds'),
        'cache': d.get('cached'),
        'glb_bytes': d.get('glb_bytes'),
        'triangulos': st.get('triangles') or st.get('faces'),
        'textura': ','.join(st.get('texture_mime') or []),
        'dims_m': 'x'.join(f'{v:.3f}' for v in (st.get('dims_m') or [])),
    })
out_dir = os.path.dirname(os.path.abspath(srv_path))
with open(os.path.join(out_dir, 'real-tempos-app.json'), 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=1)
with open(os.path.join(out_dir, 'real-tempos-app.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)
for r in rows:
    print(f"{r['objeto']:18s} {r['preset']:7s} envio={r['envio_s']:.2f} fila={r['fila_app_s']:.2f} "
          f"ger={r['geracao_app_s']:.2f} down={r['download_s']:.2f} total={r['total_app_s']:.2f} | "
          f"srv fila={r['fila_servidor_s']} run={r['execucao_servidor_s']} glb={r['glb_bytes']} cache={r['cache']}")
