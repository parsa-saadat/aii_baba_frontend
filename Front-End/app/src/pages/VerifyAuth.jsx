import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { validateIRPhoneSyntax, validateOtpSyntax } from '../utils/validators/phone.validator';
import { useShop } from '../context/ShopContext';
import { toFa } from '../utils/helpers/format';

function VerifyPage() {
  const navigate = useNavigate();
  const { login } = useShop();
  const [code, setCode] = useState('');

  // get phone with querys
  const urlParams = new URLSearchParams(window.location.search);
  const phone = urlParams.get('phone');
  const devCode = urlParams.get('code');

  function handleSubmit(e) {
    e.preventDefault();
    if (!validateIRPhoneSyntax(phone)) {
      toast.error('شماره موبایل نامعتبر است');
      navigate('/auth/pre');
      return;
    }
    if (!validateOtpSyntax(code)) {
      toast.error('کد ۶ رقمی را وارد کنید');
      return;
    }
    axios
      .post(`${(import.meta.env.VITE_APP_API_URL || 'http://localhost:3000')}/auth/login`, { phone, code })
      .then((res) => {
        const { token, user } = res.data.body;
        login(token, user);
        toast.success('خوش آمدید!');
        navigate('/');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'کد نامعتبر است'));
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-black text-2xl mx-auto mb-3" style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}>ع</div>
          <h1 className="font-black text-2xl">کد تایید</h1>
          <p className="text-sm muted mt-1">کد ارسال‌شده به <span dir="ltr">{toFa(phone || '')}</span> را وارد کنید</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="text-sm font-bold flex items-center gap-1 mb-2"><KeyRound size={15} /> کد ۶ رقمی</span>
            <input
              className="input text-center tracking-[.5em] text-xl font-black"
              dir="ltr"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            {devCode && (
              <div className="text-xs mt-2 p-2 rounded-lg text-center" className="bg-navy text-brand-yellow">
                حالت توسعه — کد شما: <b dir="ltr">{toFa(devCode)}</b>
              </div>
            )}
          </div>
          <button type="submit" className="btn-yellow w-full">ورود</button>
          <Link to="/auth/pre" className="block text-center text-sm muted">تغییر شماره موبایل</Link>
        </form>
      </div>
    </div>
  );
}

export default VerifyPage;
