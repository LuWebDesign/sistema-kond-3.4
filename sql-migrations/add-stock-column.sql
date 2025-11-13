-- Agregar columnas faltantes a la tabla productos
-- Estas columnas almacenarán información de stock, costo de placa y unidades por placa

-- Agregar columna 'stock'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'stock'
    ) THEN
        ALTER TABLE productos 
        ADD COLUMN stock INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Columna stock agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna stock ya existe';
    END IF;
END $$;

-- Agregar columna 'costo_placa'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'costo_placa'
    ) THEN
        ALTER TABLE productos 
        ADD COLUMN costo_placa NUMERIC(10,2) DEFAULT 0;
        
        RAISE NOTICE 'Columna costo_placa agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna costo_placa ya existe';
    END IF;
END $$;

-- Agregar columna 'unidades_por_placa'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'unidades_por_placa'
    ) THEN
        ALTER TABLE productos 
        ADD COLUMN unidades_por_placa INTEGER DEFAULT 1;
        
        RAISE NOTICE 'Columna unidades_por_placa agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna unidades_por_placa ya existe';
    END IF;
END $$;

-- Actualizar valores NULL
UPDATE productos 
SET stock = 0 
WHERE stock IS NULL;

UPDATE productos 
SET costo_placa = 0 
WHERE costo_placa IS NULL;

UPDATE productos 
SET unidades_por_placa = 1 
WHERE unidades_por_placa IS NULL OR unidades_por_placa = 0;

-- Comentarios descriptivos
COMMENT ON COLUMN productos.stock IS 'Stock disponible del producto (cantidad en inventario)';
COMMENT ON COLUMN productos.costo_placa IS 'Costo de la placa de material utilizada';
COMMENT ON COLUMN productos.unidades_por_placa IS 'Cantidad de unidades que entran por placa';
