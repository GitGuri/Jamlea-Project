import { useEffect, useState } from 'react';
import { getProducts } from '../api/products';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      getProducts({ search, page, limit })
        .then(({ data }) => {
          setProducts(data.data);
          setTotal(data.total);
        })
        .finally(() => setLoading(false));
    }, 300); // debounce search input

    return () => clearTimeout(timeout);
  }, [search, page]);

  const handleAdd = (product) => {
    addItem(product, 1);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 1200);
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Browse the catalog and add items to your quote.</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by name or SKU"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products found"
            description={search ? `Nothing matches "${search}".` : 'The catalog is empty right now.'}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">{product.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{product.sku}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.stock_quantity > 0 ? 'bg-good-50 text-good-500' : 'bg-bad-50 text-bad-500'
                    }`}
                  >
                    {product.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">{product.category}</span>
                  <span>{product.lead_time_days}d lead time</span>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="font-mono text-lg font-semibold text-ink">{formatCurrency(product.unit_price)}</p>
                  </div>
                  <Button
                    variant={justAdded === product.id ? 'secondary' : 'primary'}
                    onClick={() => handleAdd(product)}
                    disabled={product.stock_quantity === 0}
                  >
                    {justAdded === product.id ? 'Added ✓' : 'Add to quote'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
