import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def _send_email_blocking(to: str, subject: str, html: str):
    """Función bloqueante que envía el correo."""
    msg = MIMEMultipart("alternative")
    msg["From"] = os.getenv("FROM_EMAIL")
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(os.getenv("FROM_EMAIL"), os.getenv("PASSWORD_GMAIL"))
            server.send_message(msg)
    except Exception as e:
        print("Error al enviar correo ❌")
        print(e)

async def send_email(to: str, subject: str, html: str):
    """Función asíncrona que envía el correo sin bloquear."""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _send_email_blocking, to, subject, html)

def verification_email_html(
    username: str,
    verify_url: str,
    primary_color: str = "#1F2937",
    secondary_color: str = "#F9FAFB",
    text_color: str = "#111827"
) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Validación de cuenta - EventHub</title>
    </head>
    <body style="margin:0;padding:0;background-color:{secondary_color};font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding:40px 0;">
                    <table width="600" style="background:#ffffff;border-radius:8px;padding:30px;">
                        
                        <tr>
                            <td style="text-align:center;">
                                <h1 style="color:{primary_color};margin-bottom:10px;">
                                    EventHub
                                </h1>
                            </td>
                        </tr>

                        <tr>
                            <td style="color:{text_color};font-size:15px;line-height:1.6;">
                                <p>Estimado/a <strong>{username}</strong>,</p>

                                <p>
                                    Gracias por registrarse en <strong>EventHub</strong>.<br>
                                    Para completar el proceso de creación de su cuenta,
                                    es necesario validar su dirección de correo electrónico.
                                </p>

                                <p style="text-align:center;margin:30px 0;">
                                    <a href="{verify_url}"
                                       style="
                                           background-color:{primary_color};
                                           color:#ffffff;
                                           padding:12px 24px;
                                           text-decoration:none;
                                           border-radius:6px;
                                           font-weight:bold;
                                           display:inline-block;
                                       ">
                                        Validar cuenta
                                    </a>
                                </p>

                                <p style="margin-top:30px;">
                                    Si usted no realizó este registro, puede ignorar este mensaje.
                                </p>

                                <p style="margin-top:20px;">
                                    Atentamente,<br>
                                    <strong>Equipo EventHub</strong>
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

