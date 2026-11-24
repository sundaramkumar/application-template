import { useMutation } from '@tanstack/react-query';
import { loginApi, logoutApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore(s => s.setAuth);

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginApi(username, password),
    onSuccess: (res) => {
      setAuth(res.data.user);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore(s => s.clear);
  return async () => {
    await logoutApi().catch(() => {});
    clear();
  };
}
