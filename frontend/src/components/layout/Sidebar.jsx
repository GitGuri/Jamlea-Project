import { NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const NAV_ITEMS = [
  { to: '/products', label: 'Products', icon: BoxIcon },
  { to: '/cart', label: 'Quote builder', icon: CartIcon, showCount: true },
  { to: '/quotes', label: 'Quotes', icon: DocIcon },
  { to: '/orders', label: 'Orders', icon: TruckIcon },
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
];

export default function Sidebar() {
  const { totalItems } = useCart();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-ink text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500 font-display text-sm font-bold">
          P
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">Portal</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, showCount }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-3">
                  <span className={`h-1 w-1 rounded-full bg-teal-400 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </span>
                {showCount && totalItems > 0 && (
                  <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function BoxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M3 3h2l2.4 12.4a2 2 0 002 1.6h8.2a2 2 0 002-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="21" r="1" /><circle cx="18" cy="21" r="1" />
    </svg>
  );
}
function DocIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M8 3h6l4 4v14H8V3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 9h4M11 13h4M11 17h2" strokeLinecap="round" />
    </svg>
  );
}
function TruckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M2 8h11v9H2zM13 11h4l3 3v3h-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" />
    </svg>
  );
}
function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 004 0" strokeLinecap="round" />
    </svg>
  );
}
