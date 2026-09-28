export function mediana(valores: readonly number[]): number {
  if (valores.length === 0) throw new Error('Mediana de lista vazia');
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[meio]!
    : (ordenados[meio - 1]! + ordenados[meio]!) / 2;
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Maior alta acumulada ao longo da série em ordem cronológica: max(p[j] / min(p[0..j]) - 1). */
export function maiorAltaAcumulada(serieCronologica: readonly number[]): number {
  let minimo = Infinity;
  let maior = 0;
  for (const p of serieCronologica) {
    minimo = Math.min(minimo, p);
    maior = Math.max(maior, p / minimo - 1);
  }
  return maior;
}
