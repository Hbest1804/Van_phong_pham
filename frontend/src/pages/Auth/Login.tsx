import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Đăng nhập</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu</label>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Đăng nhập</Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <span>Chưa có tài khoản? <Link to="/register" className="text-blue-600 hover:underline">Đăng ký</Link></span>
        </CardFooter>
      </Card>
      
      <div className="mt-6 text-sm text-center text-slate-500 bg-slate-100 p-4 rounded-md">
        <p className="font-semibold mb-1">Tài khoản demo:</p>
        <p>User: user@gmail.com / Pass: 123</p>
        <p>Admin: admin@stationery.com / Pass: 123</p>
      </div>
    </div>
  );
}
