import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to, name, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"mdnotes" <${process.env.SMTP_FROM || 'no-reply@mdnotes.app'}>`,
    to,
    subject: 'Reset your mdnotes password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #eee; margin: 0; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 12px; padding: 40px; }
          h1 { font-size: 24px; color: #6366f1; margin: 0 0 8px; }
          p { color: #aaa; line-height: 1.6; margin: 16px 0; }
          .btn { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { color: #555; font-size: 12px; margin-top: 32px; border-top: 1px solid #222; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✨ mdnotes</h1>
          <p>Hi ${name},</p>
          <p>You requested a password reset. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
          <a class="btn" href="${resetUrl}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <div class="footer">
            <p>This link will expire in 1 hour. For security, do not share this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (err) {
    console.error('Email send error:', err);
    throw err;
  }
}
export async function sendVerificationEmail(to, name, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"mdnotes" <${process.env.SMTP_FROM || 'no-reply@mdnotes.app'}>`,
    to,
    subject: 'Verify your mdnotes email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #eee; margin: 0; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 12px; padding: 40px; }
          h1 { font-size: 24px; color: #6366f1; margin: 0 0 8px; }
          p { color: #aaa; line-height: 1.6; margin: 16px 0; }
          .btn { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { color: #555; font-size: 12px; margin-top: 32px; border-top: 1px solid #222; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✨ mdnotes</h1>
          <p>Hi ${name},</p>
          <p>Thanks for joining mdnotes! Please verify your email address to start creating and sharing notes.</p>
          <a class="btn" href="${verifyUrl}">Verify Email Address</a>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    console.error('Email verify error:', err);
    throw err;
  }
}
