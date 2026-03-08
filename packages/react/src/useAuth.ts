import { useContext } from 'react';
import { FunctionSpaceContext } from './context.js';

export function useAuth() {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useAuth must be used within FunctionSpaceProvider');

  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    loading: ctx.authLoading,
    error: ctx.authError,
    login: ctx.login,
    signup: ctx.signup,
    logout: ctx.logout,
    refreshUser: ctx.refreshUser,
    passwordlessLogin: ctx.passwordlessLogin,
    showAdminLogin: ctx.showAdminLogin,
    pendingAdminUsername: ctx.pendingAdminUsername,
    clearAdminLogin: ctx.clearAdminLogin,
  };
}
