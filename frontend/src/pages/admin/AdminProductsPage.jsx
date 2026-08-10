import { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/products';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ProductForm from '../../components/admin/ProductForm';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [modalMode, setModalMode] = useState(null); // null | 'create' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    return getProducts({ search, page, limit })
      .then(({ data }) => {
        setProducts(data.data);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const openCreate = () => {
    setEditingProduct(null);
    setModalMode('create');
  };
  const openEdit = (product) => {
    setEditingProduct(product);
    setModalMode('edit');
  };
  const closeModal = () => setModalMode(null);

  const handleSubmit = async (payload) => {
    if (modalMode === 'edit') {
      await updateProduct(editingProduct.id, payload);
    } else {
      await createProduct(payload);
    }
    closeModal();
    load();
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    setDeleteError('');
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Could not delete this product.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the catalog customers order from.</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={openCreate}>Add product</Button>
        </div>
      </div>

      {deleteError && (
        <p className="mt-4 rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{deleteError}</p>
      )}

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products found"
            description={search ? `Nothing matches "${search}".` : 'Add your first product to get started.'}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{product.name}</p>
                      <p className="font-mono text-xs text-slate-400">{product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{product.category}</td>
                    <td className="px-4 py-3 font-mono text-ink">{formatCurrency(product.unit_price)}</td>
                    <td className="px-4 py-3 text-slate-600">{product.stock_quantity}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{product.availability}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-xs font-medium text-teal-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="ml-3 text-xs font-medium text-bad-500 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {modalMode && (
        <Modal title={modalMode === 'edit' ? 'Edit product' : 'Add product'} onClose={closeModal}>
          <ProductForm initialProduct={editingProduct} onSubmit={handleSubmit} onCancel={closeModal} />
        </Modal>
      )}
    </div>
  );
}
