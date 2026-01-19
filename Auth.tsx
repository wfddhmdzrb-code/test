import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

export function Auth() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { setToken, setUser } = useStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });

  useEffect(() => {
    if (DEV_MODE) {
      console.log('[DEV MODE] تجاوز تسجيل الدخول - جاري تسجيل الدخول التلقائي...');
      handleDevModeLogin();
    }
  }, [navigate, setToken, setUser]);

  const handleDevModeLogin = () => {
    const devToken = 'dev_token_' + Math.random().toString(36).substr(2, 9);
    const devUser = {
      id: 1,
      username: 'admin',
      email: 'admin@system.local',
      role: 'admin' as const
    };

    localStorage.setItem('access_token', devToken);
    localStorage.setItem('refresh_token', devToken);
    
    setToken(devToken);
    setUser(devUser);
    
    console.log('[DEV MODE] ✓ تم تسجيل الدخول التلقائي');
    navigate('/dashboard');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Login attempt to:', `${API_BASE_URL}/auth/login`);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', response.data);
      
      const data = response.data;
      const access_token = data.access_token;
      const refresh_token = data.refresh_token;
      const user = data.user;
      
      if (!access_token || !refresh_token) {
        setError('بيانات الدخول غير كاملة من السيرفر');
        return;
      }
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      setToken(access_token);
      setUser(user);
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'خطأ في تسجيل الدخول';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.passwordConfirm) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      setError('');
      setIsLogin(true);
      setFormData({
        username: formData.username,
        email: '',
        password: '',
        passwordConfirm: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-info-50 flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">{t('common.appName')}</h1>
            <p className="text-gray-600 mt-2">
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </p>
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                name="username"
                placeholder="اسم المستخدم"
                title="Enter your username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="البريد الإلكتروني"
                  title="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                name="password"
                placeholder="كلمة المرور"
                title="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  name="passwordConfirm"
                  placeholder="تأكيد كلمة المرور"
                  title="Confirm your password"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? 'جاري المعالجة...' : (isLogin ? 'دخول' : 'تسجيل')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({
                    username: '',
                    email: '',
                    password: '',
                    passwordConfirm: ''
                  });
                }}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                {isLogin ? ' إنشاء حساب' : ' تسجيل دخول'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
