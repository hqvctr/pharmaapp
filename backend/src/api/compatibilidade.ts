// Compara o contrato gerado com o aprovado (openapi/v1-aprovado.json). A v1 só cresce por acréscimo
// (decisão 49): o app construído sobre o contrato aprovado precisa continuar funcionando.
// Resposta: tudo que era obrigatório continua saindo, com o mesmo tipo. Requisição: tudo que o app
// podia mandar continua aceito, e nada novo passa a ser obrigatório.
type No = any;

function tipos(s: No): string[] {
  return s?.type === undefined ? [] : [s.type].flat();
}

export function quebrasDeCompatibilidade(aprovado: No, atual: No): string[] {
  const quebras: string[] = [];
  const resolver = (doc: No, s: No): No => {
    if (typeof s?.$ref !== 'string') return s;
    const [, , secao, nome] = s.$ref.split('/');
    return resolver(doc, doc.components[secao][nome]);
  };

  function resposta(onde: string, a: No, b: No): void {
    a = resolver(aprovado, a);
    b = resolver(atual, b);
    if (b === undefined) return void quebras.push(`${onde}: esquema sumiu`);
    const ta = tipos(a);
    const extra = tipos(b).filter((t) => ta.length > 0 && !ta.includes(t));
    if (extra.length > 0) quebras.push(`${onde}: resposta pode vir como ${extra.join(', ')}`);
    const obrigA: string[] = a.required ?? [];
    const obrigB = new Set<string>(b.required ?? []);
    for (const campo of obrigA) if (!obrigB.has(campo)) quebras.push(`${onde}.${campo}: deixou de ser obrigatório na resposta`);
    for (const [campo, s] of Object.entries(a.properties ?? {})) {
      if (b.properties?.[campo] === undefined) quebras.push(`${onde}.${campo}: sumiu da resposta`);
      else resposta(`${onde}.${campo}`, s, b.properties[campo]);
    }
    if (a.items !== undefined) resposta(`${onde}[]`, a.items, b.items);
  }

  function requisicao(onde: string, a: No, b: No): void {
    a = resolver(aprovado, a);
    b = resolver(atual, b);
    if (b === undefined) return void quebras.push(`${onde}: esquema sumiu`);
    const tb = tipos(b);
    const recusados = tipos(a).filter((t) => tb.length > 0 && !tb.includes(t));
    if (recusados.length > 0) quebras.push(`${onde}: deixou de aceitar ${recusados.join(', ')}`);
    if (Array.isArray(a.enum) && Array.isArray(b.enum)) {
      const fora = a.enum.filter((v: unknown) => !b.enum.includes(v));
      if (fora.length > 0) quebras.push(`${onde}: deixou de aceitar ${fora.join(', ')}`);
    }
    if (a.pattern !== b.pattern) quebras.push(`${onde}: padrão mudou`);
    for (const k of ['maxLength', 'maxItems', 'maximum'] as const) {
      if (b[k] !== undefined && (a[k] === undefined || b[k] < a[k])) quebras.push(`${onde}: ${k} ficou menor`);
    }
    for (const k of ['minLength', 'minItems', 'minimum'] as const) {
      if (b[k] !== undefined && (a[k] === undefined || b[k] > a[k])) quebras.push(`${onde}: ${k} ficou maior`);
    }
    const obrigA = new Set<string>(a.required ?? []);
    for (const campo of b.required ?? []) if (!obrigA.has(campo)) quebras.push(`${onde}.${campo}: passou a ser obrigatório`);
    for (const [campo, s] of Object.entries(a.properties ?? {})) {
      if (b.properties?.[campo] === undefined) quebras.push(`${onde}.${campo}: deixou de ser aceito`);
      else requisicao(`${onde}.${campo}`, s, b.properties[campo]);
    }
    if (a.items !== undefined) requisicao(`${onde}[]`, a.items, b.items);
  }

  for (const [caminho, metodos] of Object.entries<No>(aprovado.paths)) {
    for (const [metodo, opA] of Object.entries<No>(metodos)) {
      const onde = `${metodo.toUpperCase()} ${caminho}`;
      const opB = atual.paths?.[caminho]?.[metodo];
      if (opB === undefined) {
        quebras.push(`${onde}: rota sumiu`);
        continue;
      }
      const params = (op: No, doc: No) =>
        new Map<string, No>((op.parameters ?? []).map((p: No) => resolver(doc, p)).map((p: No) => [`${p.in}:${p.name}`, p]));
      const pa = params(opA, aprovado);
      const pb = params(opB, atual);
      for (const [k, p] of pa) {
        if (!pb.has(k)) quebras.push(`${onde}: parâmetro ${k} sumiu`);
        else requisicao(`${onde} ${k}`, p.schema, pb.get(k).schema);
      }
      for (const [k, p] of pb) if (p.required && !pa.get(k)?.required) quebras.push(`${onde}: parâmetro ${k} passou a ser obrigatório`);
      const corpo = (op: No) => op.requestBody?.content?.['application/json']?.schema;
      if (corpo(opA) !== undefined) requisicao(`${onde} corpo`, corpo(opA), corpo(opB));
      for (const [status, rA] of Object.entries<No>(opA.responses)) {
        const rB = opB.responses?.[status];
        if (rB === undefined) {
          quebras.push(`${onde}: resposta ${status} sumiu`);
          continue;
        }
        const s = rA.content?.['application/json']?.schema;
        if (s !== undefined) resposta(`${onde} ${status}`, s, rB.content?.['application/json']?.schema);
      }
    }
  }
  return quebras;
}
