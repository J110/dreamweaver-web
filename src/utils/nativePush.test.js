import { enableNativePush } from './nativePush';
import { pushApi } from './api';

jest.mock('./api', () => ({ pushApi: { register: jest.fn(), unregister: jest.fn() } }));

test('registers an authorized native push target with the backend', async () => {
  window.DreamValleyPush = {
    isAvailable: true,
    requestPermission: jest.fn().mockResolvedValue({
      success: true,
      value: { permission: 'authorized', token: 'device-token' },
    }),
  };
  pushApi.register.mockResolvedValue({ registered: true });

  await expect(enableNativePush()).resolves.toEqual({ status: 'registered' });
  expect(pushApi.register).toHaveBeenCalledWith('device-token', 'authorized');
});
