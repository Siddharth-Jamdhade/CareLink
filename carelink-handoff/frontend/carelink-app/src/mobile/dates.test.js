import { calculateEDD } from './dates';
test.each([['2024-05-31','2025-03-07'],['2023-05-31','2024-03-07'],['2024-02-29','2024-12-06'],['2025-12-31','2026-10-07'],['2026-06-15','2027-03-22']])('calendar EDD %s', (lmp, edd) => expect(calculateEDD(lmp)).toBe(edd));
test('unknown and invalid dates stay unavailable', () => { expect(calculateEDD('')).toBeNull(); expect(calculateEDD('2026-02-30')).toBeNull(); });
