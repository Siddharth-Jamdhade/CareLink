// CareLink Mobile - weekInfo.test.js - 2026-11-05
import { getWeekInfo } from './weekInfo';

test.each([12, 16, 20, 24, 28, 32, 36, 40])('week %i returns a valid info object', (week) => {
  const info = getWeekInfo(week);
  expect(typeof info.title).toBe('string');
  expect(info.title.length).toBeGreaterThan(0);
  expect(typeof info.body).toBe('string');
  expect(info.body.length).toBeGreaterThan(0);
  expect(typeof info.size).toBe('string');
  expect(typeof info.nhs_url).toBe('string');
  expect(info.nhs_url).toMatch(/^https:\/\//);
});

test('clamps values below 12 to week 12', () => {
  const info = getWeekInfo(8);
  expect(info).toEqual(getWeekInfo(12));
});

test('clamps values above 40 to week 40', () => {
  const info = getWeekInfo(45);
  expect(info).toEqual(getWeekInfo(40));
});

test('rounds fractional weeks', () => {
  const info = getWeekInfo(20.5);
  expect(info).toEqual(getWeekInfo(21));
});

test('all weeks 12-40 have entries', () => {
  for (let w = 12; w <= 40; w++) {
    const info = getWeekInfo(w);
    expect(info.title).toBeTruthy();
    expect(info.body).toBeTruthy();
  }
});

test('no entry implies AI diagnosis or health claim', () => {
  for (let w = 12; w <= 40; w++) {
    const info = getWeekInfo(w);
    // These phrases must not appear — they imply clinical interpretation
    expect(info.body).not.toMatch(/healthy/i);
    expect(info.body).not.toMatch(/normal heartbeat/i);
    expect(info.body).not.toMatch(/scan result/i);
  }
});
