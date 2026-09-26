import type { SiteContent } from './SiteContent';

// Puerto para resolver el contenido inicial de un cliente nuevo. El módulo Tenant no
// conoce los kits por rubro: solo sabe pedir "el contenido del kit X".
// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class SiteContentSource {
  public abstract fromTemplate(templateId: string): Promise<SiteContent | null>;
  public abstract listTemplates(): Promise<
    readonly {
      readonly id: string;
      readonly label: string;
      readonly industry: string;
      readonly description: string;
      readonly pageCount: number;
      readonly visualStyle: string;
    }[]
  >;
}
