-- Allow higher-resolution product photos in Storage.
UPDATE storage.buckets
SET file_size_limit = 12582912
WHERE id = 'product-images';
