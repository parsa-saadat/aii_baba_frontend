import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { Smartphone, KeyRound, User, ArrowLeft } from 'lucide-react';
import { validateIRPhoneSyntax, validateOtpSyntax } from '../utils/validators/phone.validator';
import { useShop } from '../context/ShopContext';
import { toFa } from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

// ثبت‌نام = همون OTP بک‌اند (auth/pre + auth/login) + انتخاب نام کاربری (PUT /user/:id)
export default function Register() {
  const navigate = useNavigate();
  const { login } = useShop();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(null);

  const sendCode = (e) => {
    e.preventDefault();
    if (!validateIRPhoneSyntax(phone)) return toast.error('شماره موبایل معتبر نیست');
    axios
      .post(`${API}/auth/pre`, { phone })
      .then((res) => {
        if (res.data.success) {
          setDevCode(res.data.body || '');
          setStep(2);
          toast.success('کد تایید ارسال شد');
        } else toast.error(res.data.message);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'ارتباط با سرور برقرار نشد'));
  };

  const verify = (e) => {
    e.preventDefault();
    if (!validateOtpSyntax(code)) return toast.error('کد ۶ رقمی را وارد کنید');
    axios
      .post(`${API}/auth/login`, { phone, code })
      .then((res) => {
        setPending(res.data.body);
        setStep(3);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'کد نامعتبر است'));
  };

  const finish = (e) => {
    e.preventDefault();
    if (!username.trim()) return toast.error('نام کاربری را وارد کنید');
    axios
      .put(`${API}/user/${pending.user._id}`, { username }, { headers: { Authorization: pending.token } })
      .then(() => {
        login(pending.token, { ...pending.user, username });
        toast.success('ثبت‌نام کامل شد');
        navigate('/');
      })
      .catch((err) => {
        login(pending.token, pending.user);
        toast.warn(err.response?.data?.message || 'نام کاربری ذخیره نشد');
        navigate('/');
      });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-black text-2xl mx-auto mb-3" style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}>ع</div>
          <h1 className="font-black text-2xl">ثبت‌نام در علی‌بازار</h1>
          <p className="text-sm muted mt-1">با شماره موبایل ثبت‌نام کنید</p>
        </div>

        {step === 1 && (
          <form onSubmit={sendCode} className="space-y-4">
            <span className="text-sm font-bold flex items-center gap-1"><Smartphone size={15} /> شماره موبایل</span>
            <input className="input" dir="ltr" type="tel" placeholder="0912xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <button type="submit" className="btn-yellow w-full flex items-center justify-center gap-2">ارسال کد تایید <ArrowLeft size={16} /></button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={verify} className="space-y-4">
            <span className="text-sm font-bold flex items-center gap-1"><KeyRound size={15} /> کد ۶ رقمی</span>
            <input className="input text-center tracking-[.5em] text-xl font-black" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
            {devCode && <div className="text-xs p-2 rounded-lg text-center" className="bg-navy text-brand-yellow">حالت توسعه — کد شما: <b dir="ltr">{toFa(devCode)}</b></div>}
            <button type="submit" className="btn-yellow w-full">تایید و ادامه</button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm muted">تغییر شماره موبایل</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={finish} className="space-y-4">
            <span className="text-sm font-bold flex items-center gap-1"><User size={15} /> نام کاربری</span>
            <input className="input" placeholder="مثلاً: ali_reza" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <button type="submit" className="btn-yellow w-full">تکمیل ثبت‌نام</button>
          </form>
        )}

        <div className="text-center text-sm muted mt-6">
          حساب دارید؟ <Link to="/auth/pre" className="font-bold text-yellow">وارد شوید</Link>
        </div>
      </div>
    </div>
  );
}
