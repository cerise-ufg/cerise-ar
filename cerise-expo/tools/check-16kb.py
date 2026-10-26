#!/usr/bin/env python3
"""
Verifica a compatibilidade com paginas de memoria de 16 KB (exigencia do Google Play
para apps com alvo Android 15+) nas bibliotecas nativas (.so) de um AAB ou APK.

Para cada .so de 64 bits (arm64-v8a / x86_64) le o cabecalho ELF e confere se TODOS os
segmentos PT_LOAD tem p_align >= 16384. Em APK, tambem confere se o .so esta armazenado
sem compressao e com offset alinhado a 16 KB dentro do zip (o que o `zipalign -c -P 16`
verifica). Gera JSON com o resultado.

Uso: python tools/check-16kb.py app-release.aab [app-release.apk ...] -o resultado.json
"""
import json
import struct
import sys
import zipfile

PT_LOAD = 1


def elf_load_aligns(data: bytes):
    if data[:4] != b"\x7fELF":
        return None, None
    cls = data[4]  # 1 = 32 bits, 2 = 64 bits
    endian = "<" if data[5] == 1 else ">"
    if cls == 2:
        e_phoff = struct.unpack_from(endian + "Q", data, 0x20)[0]
        e_phentsize, e_phnum = struct.unpack_from(endian + "HH", data, 0x36)
        aligns = []
        for i in range(e_phnum):
            off = e_phoff + i * e_phentsize
            p_type = struct.unpack_from(endian + "I", data, off)[0]
            if p_type == PT_LOAD:
                aligns.append(struct.unpack_from(endian + "Q", data, off + 48)[0])
        return 64, aligns
    e_phoff = struct.unpack_from(endian + "I", data, 0x1C)[0]
    e_phentsize, e_phnum = struct.unpack_from(endian + "HH", data, 0x2A)
    aligns = []
    for i in range(e_phnum):
        off = e_phoff + i * e_phentsize
        p_type = struct.unpack_from(endian + "I", data, off)[0]
        if p_type == PT_LOAD:
            aligns.append(struct.unpack_from(endian + "I", data, off + 28)[0])
    return 32, aligns


def zip_data_offset(zf: zipfile.ZipFile, info: zipfile.ZipInfo) -> int:
    zf.fp.seek(info.header_offset)
    hdr = zf.fp.read(30)
    name_len, extra_len = struct.unpack_from("<HH", hdr, 26)
    return info.header_offset + 30 + name_len + extra_len


def check(path: str):
    out = {"arquivo": path.replace("\\", "/").split("/")[-1], "bibliotecas": []}
    is_apk = path.lower().endswith(".apk")
    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            n = info.filename
            if not n.endswith(".so") or "/lib/" not in "/" + n:
                continue
            abi = n.split("lib/")[1].split("/")[0]
            bits, aligns = elf_load_aligns(zf.read(info))
            rec = {
                "abi": abi,
                "lib": n.split("/")[-1],
                "bits": bits,
                "p_align_min": min(aligns) if aligns else None,
                "elf_16kb_ok": bool(aligns) and min(aligns) >= 16384,
            }
            if is_apk:
                rec["armazenado_sem_compressao"] = info.compress_type == zipfile.ZIP_STORED
                rec["offset_zip_16kb_ok"] = info.compress_type == zipfile.ZIP_STORED and zip_data_offset(zf, info) % 16384 == 0
            out["bibliotecas"].append(rec)
    libs64 = [b for b in out["bibliotecas"] if b["bits"] == 64]
    out["resumo"] = {
        "total_so": len(out["bibliotecas"]),
        "so_64bits": len(libs64),
        "so_64bits_elf_16kb_ok": sum(b["elf_16kb_ok"] for b in libs64),
        "so_64bits_fora_do_padrao": sorted({b["lib"] for b in libs64 if not b["elf_16kb_ok"]}),
    }
    if is_apk:
        out["resumo"]["so_offset_zip_16kb_ok"] = sum(bool(b.get("offset_zip_16kb_ok")) for b in libs64)
    return out


def main():
    args = sys.argv[1:]
    dest = None
    if "-o" in args:
        i = args.index("-o")
        dest = args[i + 1]
        del args[i : i + 2]
    results = [check(p) for p in args]
    for r in results:
        s = r["resumo"]
        print(f"{r['arquivo']}: {s['so_64bits_elf_16kb_ok']}/{s['so_64bits']} .so de 64 bits com PT_LOAD >= 16 KB"
              + (f"; offset no zip alinhado: {s['so_offset_zip_16kb_ok']}/{s['so_64bits']}" if "so_offset_zip_16kb_ok" in s else ""))
        if s["so_64bits_fora_do_padrao"]:
            print("  fora do padrao 16 KB:", ", ".join(s["so_64bits_fora_do_padrao"]))
    if dest:
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
