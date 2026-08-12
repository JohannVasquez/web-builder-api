INSERT INTO global_settings (key, value) VALUES
  ('siteName', 'Web Builder Co.'),
  ('tagline', 'Sitios dinámicos ensamblados al vuelo'),
  ('contactEmail', 'contacto@webbuilder.co'),
  ('contactPhone', '+56 9 1234 5678'),
  ('whatsappNumber', '56912345678'),
  ('address', 'Av. Providencia 1234, Santiago, Chile'),
  ('instagramUrl', 'https://instagram.com/webbuilderco'),
  ('facebookUrl', 'https://facebook.com/webbuilderco');

INSERT INTO pages (slug, title, description) VALUES
  ('home', 'Inicio | Web Builder Co.', 'Creamos sitios web dinámicos y escalables para tu negocio.'),
  ('nosotros', 'Nosotros | Web Builder Co.', 'Conoce al equipo detrás de Web Builder Co.'),
  ('servicios', 'Servicios | Web Builder Co.', 'Landing pages, sitios corporativos y más.');

-- Page: home
INSERT INTO page_sections (page_id, type, position, props) VALUES
  (
    (SELECT id FROM pages WHERE slug = 'home'), 'Hero', 1,
    '{
      "title": "Tu sitio web, ensamblado al vuelo",
      "subtitle": "Landing pages dinámicas gestionadas 100% desde una base de datos. Cambia contenido, orden y diseño sin tocar el código.",
      "ctaLabel": "Conoce nuestros servicios",
      "ctaHref": "/servicios"
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'home'), 'Features', 2,
    '{
      "title": "¿Por qué elegirnos?",
      "items": [
        {"icon": "zap", "title": "Rápido", "description": "Renderizado del lado del servidor con Next.js para una carga instantánea."},
        {"icon": "layers", "title": "Flexible", "description": "Bloques visuales reordenables desde la base de datos, sin despliegues."},
        {"icon": "shield", "title": "Confiable", "description": "Arquitectura limpia, validación estricta y pruebas automatizadas."}
      ]
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'home'), 'CallToAction', 3,
    '{
      "title": "¿Listo para empezar?",
      "subtitle": "Cuéntanos tu proyecto y te responderemos a la brevedad.",
      "buttonLabel": "Contáctanos",
      "buttonHref": "/contacto"
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'home'), 'ContactForm', 4,
    '{
      "title": "Hablemos",
      "subtitle": "Completa el formulario y nos pondremos en contacto contigo."
    }'::jsonb
  );

-- Page: nosotros
INSERT INTO page_sections (page_id, type, position, props) VALUES
  (
    (SELECT id FROM pages WHERE slug = 'nosotros'), 'Hero', 1,
    '{
      "title": "Sobre nosotros",
      "subtitle": "Somos un equipo apasionado por construir experiencias web que evolucionan con tu negocio."
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'nosotros'), 'TextBlock', 2,
    '{
      "title": "Nuestra historia",
      "content": "Nacimos con una idea simple: el contenido de un sitio web no debería vivir atrapado en el código. Por eso construimos un motor de renderizado dinámico donde cada página se ensambla a partir de bloques configurables, permitiendo a nuestros clientes evolucionar su presencia digital sin fricción técnica."
    }'::jsonb
  ),
  -- Tipo desconocido a propósito: el frontend debe ignorarlo silenciosamente (AC1.5)
  (
    (SELECT id FROM pages WHERE slug = 'nosotros'), 'VideoGallery', 3,
    '{"videos": []}'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'nosotros'), 'CallToAction', 4,
    '{
      "title": "Trabajemos juntos",
      "subtitle": "Escríbenos y llevemos tu proyecto al siguiente nivel.",
      "buttonLabel": "Ir al contacto",
      "buttonHref": "/contacto"
    }'::jsonb
  );

-- Page: servicios
INSERT INTO page_sections (page_id, type, position, props) VALUES
  (
    (SELECT id FROM pages WHERE slug = 'servicios'), 'Hero', 1,
    '{
      "title": "Nuestros servicios",
      "subtitle": "Soluciones web a la medida de tu negocio."
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'servicios'), 'Features', 2,
    '{
      "title": "Lo que ofrecemos",
      "items": [
        {"icon": "layout", "title": "Landing Pages", "description": "Páginas de aterrizaje optimizadas para conversión, listas en días."},
        {"icon": "globe", "title": "Sitios corporativos", "description": "Presencia digital profesional con contenido gestionable."},
        {"icon": "shopping-cart", "title": "E-commerce (próximamente)", "description": "Tiendas en línea sobre la misma arquitectura headless."}
      ]
    }'::jsonb
  ),
  (
    (SELECT id FROM pages WHERE slug = 'servicios'), 'ContactForm', 3,
    '{
      "title": "Cotiza tu proyecto",
      "subtitle": "Cuéntanos qué necesitas y te enviaremos una propuesta."
    }'::jsonb
  );
