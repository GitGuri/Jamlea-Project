// Chainable mock matching the two query shapes orderStateService.js uses:
//   supabase.from('orders').select(...).eq(...).single()
//   supabase.from('orders').update(...).eq(...).select().single()
function makeSupabaseMock({ selectResult, updateResult }) {
  const builder = {
    select: jest.fn(() => builder),
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(),
  };
  // First .single() call (after select) resolves the find; second (after
  // update) resolves the update -- matches the two sequential calls
  // transitionOrderStatus makes against the same mocked builder.
  builder.single
    .mockResolvedValueOnce(selectResult)
    .mockResolvedValueOnce(updateResult);
  return { from: jest.fn(() => builder), _builder: builder };
}

describe('orderStateService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('ORDER_TRANSITIONS / allowedNextStatuses', () => {
    it('every terminal status allows no further transitions', () => {
      const { allowedNextStatuses } = require('../orderStateService');
      for (const terminal of ['ready_for_collection', 'completed', 'cancelled']) {
        expect(allowedNextStatuses(terminal)).toEqual([]);
      }
    });

    it('returns [] for a status the map has no entry for at all', () => {
      const { allowedNextStatuses } = require('../orderStateService');
      expect(allowedNextStatuses('not_a_real_status')).toEqual([]);
    });

    it('matches the documented manual-approval chain', () => {
      const { allowedNextStatuses } = require('../orderStateService');
      expect(allowedNextStatuses('pending_approval')).toEqual(['approved', 'cancelled']);
      expect(allowedNextStatuses('approved')).toEqual(['processing', 'cancelled']);
      expect(allowedNextStatuses('processing')).toEqual(['completed', 'cancelled']);
    });

    it('matches the documented fast-checkout chain', () => {
      const { allowedNextStatuses } = require('../orderStateService');
      expect(allowedNextStatuses('stock_reserved')).toEqual(['confirmed', 'cancelled']);
      expect(allowedNextStatuses('confirmed')).toEqual(['ready_for_collection', 'cancelled']);
    });

    it('every non-terminal status can reach cancelled', () => {
      const { ORDER_TRANSITIONS, allowedNextStatuses } = require('../orderStateService');
      const nonTerminal = Object.keys(ORDER_TRANSITIONS).filter(
        (status) => allowedNextStatuses(status).length > 0
      );
      for (const status of nonTerminal) {
        expect(allowedNextStatuses(status)).toContain('cancelled');
      }
    });
  });

  describe('transitionOrderStatus', () => {
    it('returns a 404-shaped error when the order does not exist', async () => {
      jest.doMock('../../config/supabase', () =>
        makeSupabaseMock({ selectResult: { data: null, error: { message: 'not found' } } })
      );
      const { transitionOrderStatus } = require('../orderStateService');

      const result = await transitionOrderStatus('missing-id', 'approved');
      expect(result).toEqual({ error: 'Order not found', status: 404 });
    });

    it('refuses an illegal transition without ever calling update', async () => {
      const mock = makeSupabaseMock({
        selectResult: { data: { id: 'o1', status: 'completed' }, error: null },
      });
      jest.doMock('../../config/supabase', () => mock);
      const { transitionOrderStatus } = require('../orderStateService');

      const result = await transitionOrderStatus('o1', 'processing');

      expect(result.status).toBe(400);
      expect(result.error).toMatch(/Cannot move order from "completed" to "processing"/);
      expect(mock._builder.update).not.toHaveBeenCalled();
    });

    it('applies a legal transition and returns the updated order', async () => {
      const updatedOrder = { id: 'o1', status: 'processing' };
      const mock = makeSupabaseMock({
        selectResult: { data: { id: 'o1', status: 'approved' }, error: null },
        updateResult: { data: updatedOrder, error: null },
      });
      jest.doMock('../../config/supabase', () => mock);
      const { transitionOrderStatus } = require('../orderStateService');

      const result = await transitionOrderStatus('o1', 'processing');

      expect(result).toEqual({ order: updatedOrder });
      expect(mock._builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' })
      );
    });

    it('throws if the update itself fails at the database level', async () => {
      const mock = makeSupabaseMock({
        selectResult: { data: { id: 'o1', status: 'approved' }, error: null },
        updateResult: { data: null, error: { message: 'db exploded' } },
      });
      jest.doMock('../../config/supabase', () => mock);
      const { transitionOrderStatus } = require('../orderStateService');

      await expect(transitionOrderStatus('o1', 'processing')).rejects.toEqual({
        message: 'db exploded',
      });
    });
  });
});
