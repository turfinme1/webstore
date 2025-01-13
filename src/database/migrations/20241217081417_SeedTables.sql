-- Migration: SeedTables
-- Created at: 2024-12-17T08:14:17.496Z

INSERT INTO genders(type) VALUES ('Male'), ('Female');
INSERT INTO session_types(type) VALUES ('Anonymous'), ('Authenticated'), ('Email Verification');
INSERT INTO attempt_types(type) VALUES ('Login'), ('Captcha');
INSERT INTO categories(name) VALUES 
('T-shirts'), ('Jackets'), ('Pants'), ('Shoes'), ('Hats'), ('Accessories'), ('Dresses'),
('Sunglasses'), ('Watches'), ('Belts'), ('Socks'), ('Underwear'), ('Scarves'), ('Gloves'),
('Bags'), ('Wallets'), ('Jewelry'), ('Ties'), ('Boots'), ('Sneakers');

INSERT INTO email_templates (type, subject, placeholders, template, table_border_width, table_border_color) VALUES
('Email verification', 'Email verification', '["{first_name}", "{last_name}", "{address}"]', 'Hello, {first_name} {last_name}! Please verify your email address by clicking the link below: {address}', NULL, NULL),
('Order created', 'Order created', '["{first_name}", "{last_name}", "{order_table}", "{order_number}"]', 'Hello, {first_name} {last_name}! Your order has been created. Your order number is {order_number}: {order_table}', 2, 'black'),
('Order paid', 'Order paid', '["{first_name}", "{last_name}", "{order_table}", "{order_number}", "{payment_number}"]', 'Hello, {first_name} {last_name}! Your order has been paid. Your order number is {order_number} and your payment number is {payment_number}: {order_table} ', 2, 'green'),
('Forgot password', 'Forgot password', '["{address}"]', 'Hello! Please reset your password by clicking the link below: {address}', NULL, NULL);

INSERT INTO roles (name) VALUES
('admin'),
('product manager'),
('order manager'),
('customer service');

INSERT INTO interfaces (name) VALUES
('products'),
('users'),
('admin-users'),
('orders'),
('report-logs'),
('report-orders'),
('roles'),
('site-settings'),
('email-templates'),
('promotions'),
('target-groups');

INSERT INTO permissions (name, interface_id) VALUES
('view', 1),
('create', 1),
('read', 1),
('update', 1),
('delete', 1),
('view', 2),
('create', 2),
('read', 2),
('update', 2),
('delete', 2),
('view', 3),
('create', 3),
('read', 3),
('update', 3),
('delete', 3),
('view', 4),
('create', 4),
('read', 4),
('update', 4),
('delete', 4),
('view', 5),
('create', 5),
('read', 5),
('update', 5),
('delete', 5),
('view', 6),
('create', 6),
('read', 6),
('update', 6),
('delete', 6),
('view', 7),
('create', 7),
('read', 7),
('update', 7),
('delete', 7),
('view', 8),
('create', 8),
('read', 8),
('update', 8),
('delete', 8),
('view', 9),
('create', 9),
('read', 9),
('update', 9),
('delete', 9),
('view', 10),
('create', 10),
('read', 10),
('update', 10),
('delete', 10),
('view', 11),
('create', 11),
('read', 11),
('update', 11),
('delete', 11);

INSERT INTO role_permissions (role_id, permission_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),   -- crud_products
    (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),  -- crud_users
    (1, 11), (1, 12), (1, 13), (1, 14), (1, 15), -- crud_admin_users
    (1, 16), (1, 17), (1, 18), (1, 19), (1, 20), -- crud_orders
    (1, 21), (1, 22),                          -- report_logs (view, create)
    (1, 23), (1, 24);                          -- report_orders (view, create)

-- Product Manager Role (2) - All permissions on crud_products
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5);  -- crud_products

-- Order Manager Role (3) - All permissions on crud_orders
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (3, 16), (3, 17), (3, 18), (3, 19), (3, 20);  -- crud_orders

-- Customer Service Role (4) - Limited permissions on orders and reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (4, 16), (4, 18),  -- crud_orders (view, read)
    (4, 23), (4, 24);  -- report_orders (view, read)

-- INSERT INTO inventories(product_id, quantity) 
-- VALUES (1, 5), (2, 10), (3, 3), (4, 12), (5, 7), (6, 13), (7, 5), (8, 2), (9, 3), (10, 4), (11, 5), 
-- (12, 50), (13, 75), (14, 200), (15, 150), (16, 100), (17, 50), (18, 75), (19, 200), (20, 150);

-- INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES
--     (1, 1), (1, 2), (1, 3), (1, 4), 
--     (2, 2), (3, 3), (4, 4); 