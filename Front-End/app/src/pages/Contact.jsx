import { useState } from 'react';
import { toast } from 'react-toastify';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { validateEmailSyntax } from '../utils/validators/email.validator';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(EMPTY);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.message) return toast.error('نام و متن پیام الزامی است');
    if (form.email && !validateEmailSyntax(form.email)) return toast.error('ایمیل معتبر نیست');
    toast.success('پیام شما ارسال شد');
    setForm(EMPTY);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-black text-3xl text-center">تماس با ما</h1>
      <p className="muted text-center mt-2">پشتیبانی علی‌بازار ۲۴ ساعته پاسخ‌گوست</p>
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {[
          { icon: Phone, title: 'تلفن پشتیبانی', value: '۰۲۱-۹۱۰۰۹۱۰۰' },
          { icon: Mail, title: 'ایمیل', value: 'support@alibazar.ir' },
          { icon: MapPin, title: 'نشانی', value: 'تهران، خیابان ولیعصر، برج بازار' },
        ].map((c) => (
          <div key={c.title} className="card rounded-3xl p-6 text-center">
            <c.icon size={26} className="mx-auto mb-2 text-yellow" />
            <div className="font-black">{c.title}</div>
            <div className="text-sm muted mt-1">{c.value}</div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="card rounded-3xl p-6 mt-6">
        <h2 className="font-black text-lg mb-4">ارسال پیام</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="نام و نام خانوادگی" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" dir="ltr" placeholder="ایمیل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="موضوع" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea className="input sm:col-span-2" rows={5} placeholder="متن پیام…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <button type="submit" className="btn-yellow mt-4 flex items-center gap-2"><Send size={16} /> ارسال پیام</button>
      </form>
    </div>
  );
}
