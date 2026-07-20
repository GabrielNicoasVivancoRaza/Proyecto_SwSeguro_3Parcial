import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { cargarSesion, guardarSesion, limpiarSesion } from '../auth/storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

// Adjunta el AccessToken a toda petición (el backend es Zero Trust:
// sin token válido, todo endpoint responde 401).
api.interceptors.request.use((config) => {
  const sesion = cargarSesion();
  if (sesion && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${sesion.accessToken}`;
  }
  return config;
});

// Ante un 401 intenta UNA rotación del refresh token y reintenta la
// petición. Si el refresh también falla, la sesión se limpia y se
// redirige al login.
api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _reintentado?: boolean })
      | undefined;
    const sesion = cargarSesion();

    const esAuthEndpoint = original?.url?.includes('/auth/');
    if (
      error.response?.status !== 401 ||
      !original ||
      original._reintentado ||
      esAuthEndpoint ||
      !sesion
    ) {
      return Promise.reject(error);
    }

    original._reintentado = true;
    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${api.defaults.baseURL}/auth/refresh-token`, {
        refreshToken: sesion.refreshToken,
      });
      guardarSesion({
        ...sesion,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      limpiarSesion();
      window.location.assign('/login');
      return Promise.reject(error);
    }
  },
);
