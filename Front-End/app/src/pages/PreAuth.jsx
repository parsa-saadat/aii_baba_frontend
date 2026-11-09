import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Smartphone, ArrowLeft } from 'lucide-react';
import { validateIRPhoneSyntax } from '../utils/validators/phone.validator';

function PrePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateIRPhoneSyntax(phone)) {
      toast.error('شماره موبایل معتبر نیست');
      return;
    }
    axios
      .post(`${(import.meta.env.VITE_APP_API_URL || 'http://localhost:3000')}/auth/pre`, { phone })
      .then((res) => {
        if (res.data.success) {
          toast.success('کد تایید ارسال شد');
          // در حالت DEV بک‌اند کد رو برمی‌گردونه
          const dev = res.data.body ? `&code=${res.data.body}` : '';
          navigate(`/auth/verify?phone=${phone}${dev}`);
        } else {
          toast.error(res.data.message || 'خطا در ارسال کد');
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'ارتباط با سرور برقرار نشد'));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-black text-2xl mx-auto mb-3" style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}>ع</div>
          <h1 className="font-black text-2xl">ورود به علی‌بازار</h1>
          <p className="text-sm muted mt-1">ورود با شماره موبایل و کد تایید (OTP)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="text-sm font-bold flex items-center gap-1 mb-2"><Smartphone size={15} /> شماره موبایل</span>
            <input
              className="input"
              dir="ltr"
              type="tel"
              placeholder="0912xxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-yellow w-full flex items-center justify-center gap-2">
            ارسال کد تایید <ArrowLeft size={16} />
          </button>
        </form>
        <div className="text-center text-sm muted mt-6">
          حساب ندارید؟{' '}
          <Link to="/auth/register" className="font-bold text-yellow">ثبت‌نام کنید</Link>
        </div>
      </div>
    </div>
  );
}

export default PrePage;
