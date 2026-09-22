import {
  chainsToCollapse,
  normalizePath,
  Redirect,
  RedirectInputSchema,
  resolveFinalTarget,
  wouldCycle,
} from './Redirect';

const redirect = (fromPath: string, toPath: string): Redirect =>
  new Redirect(`${fromPath}->${toPath}`, fromPath, toPath, 301, new Date());

describe('normalizePath', () => {
  it.each([
    ['servicios', '/servicios'],
    ['/servicios/', '/servicios'],
    ['/Servicios', '/servicios'],
    ['  /servicios  ', '/servicios'],
    ['/servicios///', '/servicios'],
    ['/', '/'],
  ])('%s se guarda como %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe('validación de entrada', () => {
  it('normaliza las dos rutas al validar', () => {
    const parsed = RedirectInputSchema.parse({
      fromPath: 'Servicios/',
      toPath: '/Nuevos-Servicios',
    });

    expect(parsed.fromPath).toBe('/servicios');
    expect(parsed.toPath).toBe('/nuevos-servicios');
  });

  it('rechaza una redirección a sí misma: sería un bucle en cada visita', () => {
    const result = RedirectInputSchema.safeParse({
      fromPath: '/servicios',
      toPath: '/servicios/',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza una ruta que sube de directorio', () => {
    expect(
      RedirectInputSchema.safeParse({ fromPath: '/../etc', toPath: '/inicio' }).success,
    ).toBe(false);
  });

  it('por omisión es permanente: un cambio de slug no es temporal', () => {
    expect(RedirectInputSchema.parse({ fromPath: '/a', toPath: '/b' }).statusCode).toBe(
      301,
    );
  });
});

describe('resolveFinalTarget', () => {
  it('sin cadena, el destino es el que se pide', () => {
    expect(resolveFinalTarget([], '/nuevo')).toBe('/nuevo');
  });

  it('salta los intermedios: si B va a C, apuntar a B es apuntar a C', () => {
    const existing = [redirect('/b', '/c'), redirect('/c', '/d')];

    expect(resolveFinalTarget(existing, '/b')).toBe('/d');
  });

  it('un círculo entre redirecciones viejas no cuelga la resolución', () => {
    const existing = [redirect('/a', '/b'), redirect('/b', '/a')];

    expect(resolveFinalTarget(existing, '/a')).toBe('/b');
  });
});

describe('chainsToCollapse', () => {
  it('reapunta lo que llegaba al origen viejo', () => {
    // A→B ya existía; ahora B pasa a C, así que A tiene que apuntar a C.
    const existing = [redirect('/a', '/b')];

    const toFix = chainsToCollapse(existing, '/b', '/c');

    expect(toFix.map((item) => item.fromPath)).toEqual(['/a']);
  });

  it('no toca lo que apunta a otra parte', () => {
    const existing = [redirect('/a', '/otra')];

    expect(chainsToCollapse(existing, '/b', '/c')).toHaveLength(0);
  });

  it('no reapunta una redirección hacia sí misma', () => {
    // C→B existía y ahora B pasa a C: reapuntar dejaría C→C.
    const existing = [redirect('/c', '/b')];

    expect(chainsToCollapse(existing, '/b', '/c')).toHaveLength(0);
  });
});

describe('wouldCycle', () => {
  it('detecta la vuelta directa', () => {
    expect(wouldCycle([redirect('/b', '/a')], '/a', '/b')).toBe(true);
  });

  it('detecta la vuelta a través de una cadena', () => {
    const existing = [redirect('/b', '/c'), redirect('/c', '/a')];

    expect(wouldCycle(existing, '/a', '/b')).toBe(true);
  });

  it('una redirección normal no es un ciclo', () => {
    expect(wouldCycle([redirect('/x', '/y')], '/a', '/b')).toBe(false);
  });

  it('apuntar a sí misma cuenta como ciclo', () => {
    expect(wouldCycle([], '/a', '/a')).toBe(true);
  });
});
