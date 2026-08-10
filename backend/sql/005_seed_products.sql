-- Seeds the products catalog with 50 sample products across common
-- industrial-supply categories. Safe to re-run: uses ON CONFLICT (sku)
-- DO NOTHING, so it won't duplicate rows if some SKUs already exist.
-- Run this once in the Supabase SQL Editor, after 003_order_stock_management.sql.

insert into public.products
  (sku, name, category, description, unit_price, stock_quantity, availability, lead_time_days, min_order_qty, image_url)
values
  -- Fasteners
  ('FAS-1001', 'Hex Bolt M8x40 Zinc Plated', 'fasteners', 'Grade 8.8 zinc-plated hex bolt, M8 x 40mm.', 0.35, 5000, 'local', 2, 100, null),
  ('FAS-1002', 'Hex Nut M8 Zinc Plated', 'fasteners', 'Grade 8 zinc-plated hex nut to match M8 bolts.', 0.08, 8000, 'local', 2, 200, null),
  ('FAS-1003', 'Flat Washer M8', 'fasteners', 'Standard flat steel washer, M8.', 0.03, 10000, 'local', 2, 200, null),
  ('FAS-1004', 'Self-Tapping Screw 4x25mm', 'fasteners', 'Pozi-drive self-tapping screw for sheet metal.', 0.06, 12000, 'national', 5, 250, null),
  ('FAS-1005', 'Anchor Bolt M10x100', 'fasteners', 'Wedge anchor bolt for concrete fixing.', 0.90, 2000, 'national', 7, 50, null),
  ('FAS-1006', 'Rivet 4.8x12mm Aluminium', 'fasteners', 'Blind pop rivet, aluminium body.', 0.05, 15000, 'local', 3, 500, null),

  -- Electrical
  ('ELE-2001', 'Cable Tie 200mm Black', 'electrical', 'Nylon cable tie, 200mm, UV-resistant black.', 0.04, 20000, 'local', 2, 500, null),
  ('ELE-2002', 'Twin & Earth Cable 2.5mm 100m', 'electrical', 'PVC-insulated 2.5mm twin and earth cable, 100m coil.', 68.50, 300, 'national', 5, 5, null),
  ('ELE-2003', 'MCB Circuit Breaker 20A', 'electrical', 'Single-pole miniature circuit breaker, 20A, Type B.', 6.75, 800, 'national', 7, 10, null),
  ('ELE-2004', 'LED Panel Light 40W', 'electrical', 'Recessed LED panel, 600x600mm, 40W, 4000K.', 22.00, 400, 'national', 10, 10, null),
  ('ELE-2005', 'Junction Box IP65', 'electrical', 'Weatherproof junction box, IP65 rated.', 3.20, 1500, 'local', 3, 20, null),
  ('ELE-2006', 'Socket Outlet Double 13A', 'electrical', 'Double switched socket outlet, white, 13A.', 4.10, 1200, 'local', 4, 20, null),

  -- Plumbing
  ('PLB-3001', 'Copper Pipe 15mm 3m', 'plumbing', 'Half-hard copper tube, 15mm diameter, 3m length.', 9.80, 900, 'national', 5, 10, null),
  ('PLB-3002', 'PVC Elbow Fitting 32mm', 'plumbing', '90-degree solvent weld elbow, 32mm.', 1.15, 3000, 'local', 3, 50, null),
  ('PLB-3003', 'Brass Ball Valve 1/2"', 'plumbing', 'Full-bore brass ball valve, 1/2 inch BSP.', 5.60, 1000, 'national', 5, 20, null),
  ('PLB-3004', 'PTFE Thread Seal Tape', 'plumbing', 'High-density PTFE tape for pipe thread sealing.', 0.60, 5000, 'local', 2, 100, null),
  ('PLB-3005', 'Compression Coupling 15mm', 'plumbing', 'Straight compression coupling for copper pipe.', 1.40, 2500, 'local', 3, 50, null),

  -- Tools
  ('TLS-4001', 'Claw Hammer 16oz', 'tools', 'Fibreglass-handled claw hammer, 16oz head.', 12.50, 350, 'local', 4, 5, null),
  ('TLS-4002', 'Adjustable Wrench 250mm', 'tools', 'Chrome vanadium adjustable wrench, 10 inch.', 9.90, 400, 'local', 4, 5, null),
  ('TLS-4003', 'Cordless Drill Driver 18V', 'tools', '18V brushless drill driver with 2 batteries.', 89.00, 150, 'national', 10, 2, null),
  ('TLS-4004', 'Angle Grinder 115mm', 'tools', '750W corded angle grinder, 115mm disc.', 45.00, 200, 'national', 10, 2, null),
  ('TLS-4005', 'Tape Measure 8m', 'tools', 'Locking tape measure with magnetic hook, 8m.', 6.20, 600, 'local', 3, 10, null),
  ('TLS-4006', 'Utility Knife Retractable', 'tools', 'Retractable utility knife with spare blades.', 3.50, 900, 'local', 2, 20, null),
  ('TLS-4007', 'Screwdriver Set 6-Piece', 'tools', 'Slotted and Phillips screwdriver set, 6 pieces.', 14.75, 500, 'local', 4, 5, null),
  ('TLS-4008', 'Socket Set 40-Piece', 'tools', 'Metric socket and ratchet set, 40 pieces.', 38.00, 250, 'national', 8, 3, null),
  ('TLS-4009', 'Pipe Wrench 350mm', 'tools', 'Cast-iron pipe wrench, 14 inch.', 16.40, 300, 'local', 4, 5, null),

  -- Safety Equipment
  ('SAF-5001', 'Safety Helmet White', 'safety', 'ABS shell safety helmet, EN397 certified.', 5.90, 1000, 'local', 3, 10, null),
  ('SAF-5002', 'Hi-Vis Vest Orange', 'safety', 'Class 2 hi-visibility vest with reflective strips.', 3.20, 2000, 'local', 3, 20, null),
  ('SAF-5003', 'Safety Goggles Clear', 'safety', 'Anti-fog polycarbonate safety goggles.', 2.10, 2500, 'local', 2, 20, null),
  ('SAF-5004', 'Work Gloves Cut-Resistant', 'safety', 'Cut-resistant level 5 work gloves, pair.', 4.50, 1800, 'national', 5, 20, null),
  ('SAF-5005', 'Steel Toe Safety Boots', 'safety', 'Steel toe-cap safety boots, S3 rated.', 32.00, 500, 'national', 7, 5, null),

  -- Adhesives & Sealants
  ('ADH-6001', 'Silicone Sealant Clear 300ml', 'adhesives', 'General-purpose clear silicone sealant cartridge.', 3.80, 1200, 'local', 3, 20, null),
  ('ADH-6002', 'Contact Adhesive 500ml', 'adhesives', 'High-strength contact adhesive, tin, 500ml.', 6.90, 700, 'local', 3, 10, null),
  ('ADH-6003', 'Epoxy Resin 2-Part 50ml', 'adhesives', 'Fast-cure two-part epoxy adhesive.', 4.20, 900, 'national', 5, 10, null),
  ('ADH-6004', 'Duct Tape 48mm', 'adhesives', 'Heavy-duty cloth duct tape, silver, 48mm x 25m.', 2.60, 2000, 'local', 2, 30, null),

  -- HVAC
  ('HVC-7001', 'Air Filter Panel 592x592', 'hvac', 'Pleated panel air filter for HVAC units.', 8.40, 400, 'national', 7, 5, null),
  ('HVC-7002', 'Duct Tape Foil 50mm', 'hvac', 'Aluminium foil tape for ductwork sealing, 50mm.', 3.10, 900, 'local', 3, 20, null),
  ('HVC-7003', 'Thermostat Digital Programmable', 'hvac', 'Programmable digital room thermostat.', 24.50, 300, 'national', 10, 5, null),
  ('HVC-7004', 'Flexible Duct Hose 150mm 3m', 'hvac', 'Insulated flexible ducting, 150mm diameter, 3m.', 15.90, 250, 'national', 8, 5, null),

  -- Cleaning Supplies
  ('CLN-8001', 'Industrial Degreaser 5L', 'cleaning', 'Heavy-duty industrial degreaser concentrate, 5L.', 11.20, 600, 'local', 3, 5, null),
  ('CLN-8002', 'Microfibre Cloth Pack of 10', 'cleaning', 'Lint-free microfibre cleaning cloths, pack of 10.', 5.50, 1000, 'local', 2, 20, null),
  ('CLN-8003', 'Floor Cleaner Concentrate 5L', 'cleaning', 'Multi-surface floor cleaner concentrate, 5L.', 9.80, 700, 'local', 3, 5, null),
  ('CLN-8004', 'Industrial Paper Towel Roll', 'cleaning', 'Heavy-duty blue paper towel roll, 6 rolls per case.', 14.30, 500, 'national', 5, 10, null),

  -- Packaging
  ('PKG-9001', 'Cardboard Box 300x200x200mm', 'packaging', 'Double-wall cardboard shipping box.', 0.95, 4000, 'local', 3, 50, null),
  ('PKG-9002', 'Bubble Wrap Roll 500mm x 50m', 'packaging', 'Small-bubble protective wrap roll.', 12.00, 300, 'national', 5, 5, null),
  ('PKG-9003', 'Packing Tape Clear 48mm', 'packaging', 'Acrylic packing tape, 48mm x 66m.', 1.80, 2500, 'local', 2, 30, null),
  ('PKG-9004', 'Stretch Wrap Film 500mm', 'packaging', 'Pallet stretch wrap film, 500mm x 300m.', 8.60, 400, 'national', 5, 10, null),

  -- Hardware
  ('HDW-1101', 'Door Hinge 100mm Stainless', 'hardware', 'Stainless steel butt hinge, 100mm.', 2.90, 1500, 'local', 3, 20, null),
  ('HDW-1102', 'Padlock Brass 50mm', 'hardware', 'Solid brass padlock with 2 keys, 50mm body.', 7.40, 800, 'national', 5, 10, null),
  ('HDW-1103', 'Cabinet Handle Steel', 'hardware', 'Brushed steel cabinet pull handle, 128mm centres.', 2.30, 1200, 'local', 3, 20, null)
on conflict (sku) do nothing;
