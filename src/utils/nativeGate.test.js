import { isAppUser, isLandingHome } from './nativeGate';

test('native never landing', () => {
  expect(isLandingHome({ pathname: '/', isNative: true })).toBe(false);
});

test('native trumps view=landing', () => {
  expect(isLandingHome({ pathname: '/', isNative: true, forceLanding: true })).toBe(false);
});

test('fresh web visitor → landing', () => {
  expect(isLandingHome({ pathname: '/', isNative: false })).toBe(true);
});

test('web source=app → app', () => {
  expect(isLandingHome({ pathname: '/', isNative: false, sourceApp: true })).toBe(false);
});

test('web flag → app', () => {
  expect(isLandingHome({ pathname: '/', isNative: false, nativeFlag: true })).toBe(false);
});

test('onboarded → app', () => {
  expect(isLandingHome({ pathname: '/', isNative: false, onboarded: true })).toBe(false);
});

test('web view=landing → landing', () => {
  expect(isLandingHome({ pathname: '/', isNative: false, forceLanding: true })).toBe(true);
});

test('non-home never landing', () => {
  expect(isLandingHome({ pathname: '/explore', isNative: false })).toBe(false);
});

test('UA alone is enough (iOS durability)', () => {
  expect(isAppUser({ isNative: true })).toBe(true);
});

test('no signals → not app user', () => {
  expect(isAppUser({})).toBe(false);
});
