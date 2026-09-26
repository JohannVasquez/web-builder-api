import { UpdateGlobalSettingsUseCase } from './UpdateGlobalSettingsUseCase';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

describe('UpdateGlobalSettingsUseCase', () => {
  let repository: jest.Mocked<GlobalSettingsRepository>;
  let useCase: UpdateGlobalSettingsUseCase;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      upsert: jest.fn(),
    };
    useCase = new UpdateGlobalSettingsUseCase(repository);
  });

  it('guarda los campos parciales correctamente', async () => {
    await useCase.execute('t1', { siteName: 'Nuevo nombre' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', { siteName: 'Nuevo nombre' });
  });

  it('normaliza WhatsApp en sus tres formas', async () => {
    await useCase.execute('t1', { whatsappNumber: '+56 9 1234 5678' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      whatsappNumber: '56912345678',
    });

    await useCase.execute('t1', { whatsappNumber: '56912345678' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      whatsappNumber: '56912345678',
    });

    await useCase.execute('t1', { whatsappNumber: '912345678' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      whatsappNumber: '56912345678',
    });
  });

  it('rechaza WhatsApp inválido', async () => {
    await expect(useCase.execute('t1', { whatsappNumber: '123' })).rejects.toThrow(
      'El número de WhatsApp debe ser un número válido de Chile',
    );
  });

  it('normaliza y acepta varios correos', async () => {
    await useCase.execute('t1', { contactEmail: ' Hola@Test.com , otro@Test.com ' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      contactEmail: 'hola@test.com,otro@test.com',
    });
  });

  it('rechaza un correo sin arroba', async () => {
    await expect(
      useCase.execute('t1', { contactEmail: 'hola@test.com, malcorreo' }),
    ).rejects.toThrow('El correo "malcorreo" no es válido');
  });

  it('rechaza una URL que no es URL', async () => {
    await expect(
      useCase.execute('t1', { instagramUrl: 'instagram.com/hola' }),
    ).rejects.toThrow('Debe ser una URL válida');
  });

  it('rechaza un identificador de medición mal formado', async () => {
    await expect(useCase.execute('t1', { googleAnalyticsId: '12345' })).rejects.toThrow(
      'El ID de Google Analytics debe empezar con G-',
    );
  });

  it('acepta horarios válidos y rechaza los inválidos', async () => {
    const validHours = {
      monday: { isOpen: true, slots: [{ open: '09:00', close: '18:00' }] },
      tuesday: { isOpen: false },
      wednesday: { isOpen: false },
      thursday: { isOpen: false },
      friday: { isOpen: false },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    };
    await useCase.execute('t1', { openingHours: JSON.stringify(validHours) });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      openingHours: JSON.stringify(validHours),
    });

    const invalidHours = {
      monday: { isOpen: true, slots: [{ open: '18:00', close: '09:00' }] },
      tuesday: { isOpen: false },
      wednesday: { isOpen: false },
      thursday: { isOpen: false },
      friday: { isOpen: false },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    };
    await expect(
      useCase.execute('t1', { openingHours: JSON.stringify(invalidHours) }),
    ).rejects.toThrow('La hora de cierre debe ser posterior a la de apertura');
  });

  it('guarda una clave vacía como vacía', async () => {
    await useCase.execute('t1', { siteName: '' });
    expect(repository.upsert).toHaveBeenCalledWith('t1', { siteName: '' });
  });

  it('guarda booleanos como strings "true"/"false"', async () => {
    await useCase.execute('t1', { siteUnderConstruction: true });
    expect(repository.upsert).toHaveBeenCalledWith('t1', {
      siteUnderConstruction: 'true',
    });
  });
});
