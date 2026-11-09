import { ShieldCheck, Truck, Users, TrendingUp } from 'lucide-react';

const FEATURES = [
  { icon: ShieldCheck, title: 'ضمانت اصالت', desc: 'همه فروشندگان احراز هویت می‌شوند' },
  { icon: Truck, title: 'ارسال سراسری', desc: 'تحویل سریع به همه استان‌ها' },
  { icon: Users, title: 'هزاران فروشنده', desc: 'از کسب‌وکارهای کوچک تا برندها' },
  { icon: TrendingUp, title: 'قیمت شفاف', desc: 'مقایسه قیمت بین فروشگاه‌ها' },
];

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-3xl grid place-items-center font-black text-3xl mx-auto mb-4" style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}>ع</div>
        <h1 className="font-black text-3xl">درباره علی‌بازار</h1>
        <p className="muted mt-3 leading-8 max-w-2xl mx-auto">
          علی‌بازار یک بازارگاه داخلی ایرانی است؛ الهام‌گرفته از علی‌اکسپرس و علی‌بابا، اما بدون واردات و صادرات.
          ما فروشندگان ایرانی را مستقیم به خریداران وصل می‌کنیم.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card rounded-3xl p-6 text-center">
            <f.icon size={30} className="mx-auto mb-3 text-yellow" />
            <div className="font-black">{f.title}</div>
            <div className="text-sm muted mt-1">{f.desc}</div>
          </div>
        ))}
      </div>
      <div className="card rounded-3xl p-8 mt-8 leading-8 muted">
        <h2 className="font-black text-xl mb-3" style={{ color: 'var(--text)' }}>چطور کار می‌کنیم؟</h2>
        <p>
          خریدار کالا را انتخاب می‌کند، سفارش ثبت می‌شود و به‌صورت خودکار بین فروشگاه‌های مختلف تفکیک (ساب‌سفارش) می‌گردد.
          هر فروشنده سفارش خودش را آماده، ارسال و تحویل می‌دهد. پرداخت از طریق درگاه زرین‌پال انجام می‌شود.
        </p>
        <p className="mt-3">
          فروشندگان پس از ثبت درخواست و تأیید ادمین، پلن مناسب انتخاب می‌کنند، فروشگاه می‌سازند و محصولاتشان را مدیریت می‌کنند.
        </p>
      </div>
    </div>
  );
}
