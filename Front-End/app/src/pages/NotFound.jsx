import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <div className="text-7xl font-black text-yellow">۴۰۴</div>
      <p className="muted mt-3">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
      <Link to="/" className="btn-yellow inline-block mt-6">بازگشت به خانه</Link>
    </div>
  );
}
