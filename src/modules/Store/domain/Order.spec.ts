import { canTransition, nextOrderNumber, ORDER_STATUSES } from './Order';

describe('Order', () => {
  describe('nextOrderNumber', () => {
    it('empieza en 0001 cuando la tienda no tiene pedidos', () => {
      expect(nextOrderNumber(null)).toBe('0001');
    });

    it('sigue el correlativo respetando los ceros', () => {
      expect(nextOrderNumber('0009')).toBe('0010');
      expect(nextOrderNumber('0999')).toBe('1000');
    });

    it('no se queda pegado si el último número quedó corrupto', () => {
      expect(nextOrderNumber('vacío')).toBe('0001');
    });
  });

  describe('canTransition', () => {
    it('deja avanzar en el orden esperado', () => {
      expect(canTransition('pending', 'paid')).toBe(true);
      expect(canTransition('paid', 'preparing')).toBe(true);
      expect(canTransition('shipped', 'delivered')).toBe(true);
    });

    it('no deja retroceder', () => {
      expect(canTransition('shipped', 'paid')).toBe(false);
      expect(canTransition('paid', 'pending')).toBe(false);
    });

    it('cierra el pedido entregado y el cancelado', () => {
      for (const status of ORDER_STATUSES) {
        expect(canTransition('delivered', status)).toBe(false);
        expect(canTransition('cancelled', status)).toBe(false);
      }
    });

    it('deja cancelar mientras no se haya entregado', () => {
      expect(canTransition('pending', 'cancelled')).toBe(true);
      expect(canTransition('preparing', 'cancelled')).toBe(true);
      expect(canTransition('shipped', 'cancelled')).toBe(true);
    });
  });
});
