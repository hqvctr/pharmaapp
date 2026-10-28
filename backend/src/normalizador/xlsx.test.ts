import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { indiceDaColuna, lerPlanilha } from './xlsx.js';

function montar(abas: Record<string, string>, compartilhados: string[] = []): Uint8Array {
  const nomes = Object.keys(abas);
  const arquivos: Record<string, Uint8Array> = {
    'xl/workbook.xml': strToU8(`<workbook><sheets>${nomes.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<Relationships>${nomes.map((_n, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`),
    'xl/sharedStrings.xml': strToU8(`<sst>${compartilhados.map((t) => `<si><t>${t}</t></si>`).join('')}</sst>`),
  };
  nomes.forEach((n, i) => { arquivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<worksheet><sheetData>${abas[n]}</sheetData></worksheet>`); });
  return zipSync(arquivos);
}

describe('leitor de .xlsx', () => {
  it('converte letras de coluna em índice', () => {
    expect([indiceDaColuna('A'), indiceDaColuna('Z'), indiceDaColuna('AA'), indiceDaColuna('BU')]).toEqual([0, 25, 26, 72]);
  });

  it('lê textos compartilhados, textos diretos, números e células fora de ordem ou ausentes', () => {
    const xml = `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>
      <row r="2"><c r="A2" t="inlineStr"><is><t>direto</t></is></c><c r="B2"><v>19.9</v></c><c r="D2" t="str"><v>fórmula</v></c></row>`;
    const { linhas } = lerPlanilha(montar({ Dados: xml }, ['Nome', 'Preço']), 'Dados');
    expect([...linhas[0]!]).toEqual([[0, 'Nome'], [2, 'Preço']]);
    expect([...linhas[1]!]).toEqual([[0, 'direto'], [1, '19.9'], [3, 'fórmula']]);
  });

  it('decodifica entidades e junta texto rico', () => {
    const xml = '<row><c r="A1" t="inlineStr"><is><r><t>R&amp;D </t></r><r><t>&lt;ok&gt; &#233;</t></r></is></c></row>';
    const { linhas } = lerPlanilha(montar({ A: xml }), 'A');
    expect(linhas[0]!.get(0)).toBe('R&D <ok> é');
  });

  it('célula vazia não aparece e linha vazia continua existindo', () => {
    const { linhas } = lerPlanilha(montar({ A: '<row r="1"><c r="A1"/><c r="B1" t="inlineStr"><is><t></t></is></c></row><row r="2"/>' }), 'A');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]!.size).toBe(0);
  });

  it('escolhe a aba pelo nome', () => {
    const arq = montar({ Um: '<row><c r="A1" t="inlineStr"><is><t>um</t></is></c></row>', Dois: '<row><c r="A1" t="inlineStr"><is><t>dois</t></is></c></row>' });
    expect(lerPlanilha(arq, 'Dois').linhas[0]!.get(0)).toBe('dois');
    expect(() => lerPlanilha(arq, 'Tres')).toThrow('Aba "Tres" não encontrada');
  });

  it('arquivo que não é xlsx dá erro claro', () => {
    expect(() => lerPlanilha(zipSync({ 'a.txt': strToU8('oi') }), 'A')).toThrow(/não parece um .xlsx/);
  });
});
