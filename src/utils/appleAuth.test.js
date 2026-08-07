import { authorizeWithApple, nativeAppleAuthBridge } from './appleAuth';
import { authApi } from './api';

jest.mock('./api', () => ({ authApi: { appleStart: jest.fn(), appleVerify: jest.fn() } }));

test('verifies the native Apple identity token against the backend nonce session', async () => {
  window.DreamValleyAppleAuth = {
    isAvailable: true,
    authorize: jest.fn().mockResolvedValue({ success: true, payload: { identityToken: 'token' } }),
  };
  authApi.appleStart.mockResolvedValue({ session_id: 'session', nonce: 'nonce' });
  authApi.appleVerify.mockResolvedValue({ status: 'linked' });

  await expect(authorizeWithApple('purchase')).resolves.toEqual({ status: 'linked' });
  expect(nativeAppleAuthBridge().authorize).toHaveBeenCalledWith('nonce');
  expect(authApi.appleVerify).toHaveBeenCalledWith('session', 'token');
});
