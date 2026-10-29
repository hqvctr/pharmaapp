#!/usr/bin/env python3
"""Gera as fontes do app (app/app/src/main/res/font/inter_*.ttf) a partir da Inter, a fonte do KV.

A Inter é livre (SIL Open Font License 1.1, sem nome reservado): pode ser embutida, recortada e redistribuída no app,
desde que siga com a licença (vai dentro de cada arquivo, na tabela name, e em docs/design/fontes/Inter-OFL.txt).
Recorta para latim + pontuação e símbolos que o app usa (de ~600 KB para ~75 KB por peso) e converte os contornos
CFF para TrueType, o formato que todo Android lê.

Uso: pip install fonttools && python3 scripts/fonte-inter.py <pasta com Inter-Regular.otf, -Medium, -SemiBold, -Bold>
(no Ubuntu/Debian: pacote fonts-inter, pasta /usr/share/fonts/opentype/inter; ou o .zip de https://github.com/rsms/inter/releases)
"""
import io
import os
import sys

from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

PESOS = {"Regular": "regular", "Medium": "medium", "SemiBold": "semibold", "Bold": "bold"}
# Latim básico e Latin-1, Latim estendido A, pontuação (– — ‘ ’ “ ” • … ‹ ›), €, ™, setas, − ★ ☆ ✓ ✕.
CARACTERES = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2199,U+2212,U+2605-2606,U+2713,U+2715"
RECURSOS = ["kern", "liga", "calt", "tnum", "case", "ccmp", "locl", "mark", "mkmk"]
SAIDA = os.path.join(os.path.dirname(__file__), "..", "app", "app", "src", "main", "res", "font")


def recortar(origem: str) -> TTFont:
    op = subset.Options()
    op.layout_features = RECURSOS
    op.name_IDs = ["*"]  # mantém copyright e licença (IDs 0, 13 e 14) dentro do arquivo
    op.name_languages = ["*"]
    op.notdef_outline = True
    op.drop_tables += ["STAT"]
    fonte = subset.load_font(origem, op)
    s = subset.Subsetter(op)
    s.populate(unicodes=subset.parse_unicodes(CARACTERES))
    s.subset(fonte)
    # Grava e relê: a conversão para TrueType precisa das tabelas no estado em que vão para o arquivo.
    memoria = io.BytesIO()
    fonte.save(memoria)
    memoria.seek(0)
    return TTFont(memoria)


def para_truetype(fonte: TTFont) -> None:
    """CFF → glyf (curvas cúbicas viram quadráticas com erro de até 1 unidade de 2048)."""
    glifos = fonte.getGlyphSet()
    ordem = fonte.getGlyphOrder()
    novos = {}
    for nome in ordem:
        caneta = TTGlyphPen(glifos)
        glifos[nome].draw(Cu2QuPen(caneta, 1.0, reverse_direction=True))
        novos[nome] = caneta.glyph()
    glyf = newTable("glyf")
    glyf.glyphOrder = ordem
    glyf.glyphs = novos
    fonte["glyf"] = glyf
    fonte["loca"] = newTable("loca")
    del fonte["CFF "]
    maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    for campo in ("maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
                  "maxStackElements", "maxSizeOfInstructions", "maxPoints", "maxContours", "maxCompositePoints",
                  "maxCompositeContours", "maxComponentElements", "maxComponentDepth"):
        setattr(maxp, campo, 0)
    maxp.maxZones = 1
    maxp.numGlyphs = len(ordem)
    fonte["maxp"] = maxp
    fonte["head"].glyphDataFormat = 0
    fonte["post"].formatType = 2.0
    fonte["post"].extraNames = []
    fonte["post"].mapping = {}
    fonte.sfntVersion = "\x00\x01\x00\x00"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    os.makedirs(SAIDA, exist_ok=True)
    for peso, sufixo in PESOS.items():
        fonte = recortar(os.path.join(sys.argv[1], f"Inter-{peso}.otf"))
        para_truetype(fonte)
        destino = os.path.join(SAIDA, f"inter_{sufixo}.ttf")
        fonte.save(destino)
        licenca = TTFont(destino)["name"].getDebugName(13) or ""
        if "Open Font License" not in licenca:
            sys.exit(f"{destino}: a licença sumiu da tabela name")
        print(f"{os.path.normpath(destino)}: {len(fonte.getGlyphOrder())} glifos, {os.path.getsize(destino) // 1024} KB")


if __name__ == "__main__":
    main()
