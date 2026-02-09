-- Tabla para feedback de beta testers
CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  
  -- Pregunta 1: Frecuencia de uso
  usage_frequency TEXT CHECK (usage_frequency IN ('0', '1-2', '3-5', '6-10', '10+')),
  
  -- Pregunta 2: Facilidad de primera grabación (1-5)
  ease_of_capture INTEGER CHECK (ease_of_capture BETWEEN 1 AND 5),
  
  -- Pregunta 3: Precisión de clasificación
  classification_accuracy TEXT CHECK (classification_accuracy IN ('always', 'sometimes', 'rarely', 'didnt_notice')),
  
  -- Pregunta 4: Lo más frustrante
  most_frustrating TEXT,
  
  -- Pregunta 5: Lo que más gustó
  most_liked TEXT,
  
  -- Pregunta 6: Feature que falta
  missing_feature TEXT,
  
  -- Pregunta 7: NPS (1-10)
  nps INTEGER CHECK (nps BETWEEN 1 AND 10),
  
  -- Pregunta 8: Comentarios adicionales
  additional_comments TEXT
);

-- RLS: usuarios autenticados pueden insertar su propio feedback
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON beta_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON beta_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
