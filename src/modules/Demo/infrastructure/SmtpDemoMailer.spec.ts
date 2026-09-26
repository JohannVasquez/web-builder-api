import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import { SmtpDemoMailer } from './SmtpDemoMailer';

interface SentMail {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

describe('aviso de vencimiento de una demo', () => {
  // 02:00 UTC del 10 es todavía el 9 en Chile: la fecha tiene que ser la del prospecto.
  const EXPIRES = new Date('2026-10-10T02:00:00Z');

  // El transporte se reemplaza para leer lo que se habría enviado, sin levantar SMTP.
  const buildMailer = (replyTo: string): { mailer: SmtpDemoMailer; sent: SentMail[] } => {
    const sent: SentMail[] = [];
    const mailer = new SmtpDemoMailer(
      new SmtpConfig('localhost', 1025, false, '', '', 'no-reply@agencia.cl', 'x@x.cl'),
      replyTo,
    );
    (
      mailer as unknown as {
        transporter: { sendMail: (mail: SentMail) => Promise<void> };
      }
    ).transporter = {
      sendMail: (mail: SentMail): Promise<void> => {
        sent.push(mail);
        return Promise.resolve();
      },
    };
    return { mailer, sent };
  };

  const send = async (
    businessName: string,
    replyTo = 'ventas@agencia.cl',
  ): Promise<SentMail> => {
    const { mailer, sent } = buildMailer(replyTo);
    await mailer.sendExpiryWarning({
      to: 'luna@ejemplo.cl',
      businessName,
      expiresAt: EXPIRES,
    });
    const [mail] = sent;
    if (mail === undefined) {
      throw new Error('No salió ningún correo');
    }
    return mail;
  };

  it('va al prospecto con el negocio y la fecha, en hora de Chile, en el asunto', async () => {
    const mail = await send('Pastelería Luna');

    expect(mail.to).toBe('luna@ejemplo.cl');
    expect(mail.subject).toBe(
      'Tu propuesta de sitio para Pastelería Luna vence el 9 de octubre de 2026',
    );
    expect(mail.text).toContain('disponible hasta el 9 de octubre de 2026');
    expect(mail.text).toContain('mismo enlace que te enviamos');
    expect(mail.text).toContain('responde este correo');
  });

  it('la respuesta va a DEMO_REPLY_TO, o a la casilla de envío si está vacío', async () => {
    expect((await send('Luna')).replyTo).toBe('ventas@agencia.cl');
    expect((await send('Luna', '')).replyTo).toBe('no-reply@agencia.cl');
  });

  it('no incluye ningún enlace ni token', async () => {
    const mail = await send('Pastelería Luna');
    const content = `${mail.subject}\n${mail.text}\n${mail.html}`;

    expect(content).not.toMatch(/demo_[0-9a-f]/);
    expect(content).not.toMatch(/https?:\/\//);
    expect(content).not.toContain('/demo/');
  });

  it('escapa el nombre del negocio en el HTML', async () => {
    const mail = await send('Luna <script>alert("x")</script> & Cía');

    expect(mail.html).toContain(
      'Luna &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cía',
    );
    expect(mail.html).not.toContain('<script>');
  });

  it('un salto de línea en el nombre no parte el asunto ni inventa líneas', async () => {
    const mail = await send('Luna\r\nBcc: otro@ejemplo.cl');

    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.subject).toContain('Luna Bcc: otro@ejemplo.cl');
    expect(mail.text.split('\n')).not.toContain('Bcc: otro@ejemplo.cl');
  });
});
