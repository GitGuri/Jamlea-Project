const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// Product browsing: search by name/sku, filter by category, paginated.
// unit_price and stock_quantity are always included so customers can see
// price and availability up front.
const getAllProducts = asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return res.json({ data, page: pageNum, limit: limitNum, total: count });
});

const getProductById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found' });
  return res.json(data);
});

const createProduct = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

const updateProduct = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Product not found' });
  return res.json(data);
});

module.exports = { getAllProducts, getProductById, createProduct, updateProduct };
