import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { initialUsers } from '../lib/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  register: (name: string, email: string, password?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [usersDb, setUsersDb] = useState<User[]>(() => {
    const stored = localStorage.getItem('db_users');
    return stored ? JSON.parse(stored) : initialUsers;
  });

  useEffect(() => {
    localStorage.setItem('db_users', JSON.stringify(usersDb));
  }, [usersDb]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const login = (email: string, password?: string) => {
    const found = usersDb.find(u => u.email === email && (!password || u.password === password));
    if (found) {
      if (found.status === 'locked') {
        alert('Tài khoản của bạn đã bị khóa!');
        return;
      }
      setUser(found);
    } else {
      alert('Sai email hoặc mật khẩu');
    }
  };

  const register = (name: string, email: string, password?: string) => {
    if (usersDb.some(u => u.email === email)) {
      alert('Email đã tồn tại!');
      return;
    }
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      role: 'user',
      status: 'active'
    };
    setUsersDb([...usersDb, newUser]);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    setUsersDb(usersDb.map(u => u.id === updated.id ? updated : u));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
