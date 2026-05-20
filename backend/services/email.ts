import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const getBaseHtml = (title: string, subtitle: string, content: string) => `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#F88435,#FF6B35);padding:32px;text-align:center">
    <h1 style="color:white;margin:0">Feasto</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">${subtitle}</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#333;margin-top:0">${title}</h2>
    ${content}
    <div style="margin-top:24px;padding-top:16px;border-top:2px solid #f0f0f0;text-align:center">
      <p style="color:#aaa;font-size:0.8rem;margin:0">Thank you for choosing Feasto!</p>
    </div>
  </div>
</div>
`;

export const sendOrderConfirmationEmail = async (toEmail: string, userName: string, order: any) => {
  const itemsList = order.items.map((item: any) =>
    `<tr>
      <td style="padding:8px 0;color:#555">${item.name} x${item.quantity}</td>
      <td style="text-align:right;font-weight:600;color:#333">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="color:#666">Your order has been placed successfully. Here are the details:</p>
    <table style="width:100%;margin-top:16px;border-collapse:collapse">${itemsList}</table>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;text-align:right">
      <strong style="color:#333;font-size:1.1rem">Total: $${order.totalAmount.toFixed(2)}</strong>
    </div>
  `;

  const html = getBaseHtml(`Hey ${userName}!`, 'Your order is confirmed!', content);

  try {
    await transporter.sendMail({
      from: '"Feasto" <' + process.env.EMAIL_USER + '>',
      to: toEmail,
      subject: 'Order Confirmed - Feasto',
      html
    });
    console.log('Email sent to', toEmail);
  } catch (err: any) {
    console.error('Email error:', err.message);
  }
};

export const sendStatusUpdateEmail = async (toEmail: string, userName: string, status: string) => {
  const messages: Record<string, string> = {
    'Confirmed': 'Your order has been confirmed!',
    'Preparing': 'Your food is being prepared!',
    'On the way': 'Your order is on the way!',
    'Delivered': 'Your order has been delivered! Enjoy your meal!'
  };
  const msg = messages[status] || 'Your order status has been updated.';
  
  const content = `<p style="color:#666;font-size:1.1rem;text-align:center">${msg}</p>`;
  const html = getBaseHtml(`Hello ${userName},`, 'Order Status Update', content);

  try {
    await transporter.sendMail({
      from: '"Feasto" <' + process.env.EMAIL_USER + '>',
      to: toEmail,
      subject: `Order Update - ${status} | Feasto`,
      html
    });
    console.log('Status email sent:', status);
  } catch (err: any) {
    console.error('Email error:', err.message);
  }
};

export const sendAdminNewOrderEmail = async (order: any) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return;

  const itemsList = order.items.map((item: any) =>
    `<tr>
      <td style="padding:8px 0;color:#555">${item.name} x${item.quantity}</td>
      <td style="text-align:right;font-weight:600;color:#333">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="color:#666">A new order has been placed on Feasto. Order total is <strong>$${order.totalAmount.toFixed(2)}</strong>.</p>
    <h3 style="color:#333;margin-top:24px">Order Summary</h3>
    <table style="width:100%;margin-top:8px;border-collapse:collapse">${itemsList}</table>
    <div style="margin-top:24px;text-align:center">
      <a href="http://localhost:5173/admin" style="background:#F88435;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block">View Dashboard</a>
    </div>
  `;

  const html = getBaseHtml('New Order Alert', 'Action Required', content);

  try {
    await transporter.sendMail({
      from: '"Feasto" <' + process.env.EMAIL_USER + '>',
      to: adminEmail,
      subject: 'New Order Received - Feasto',
      html
    });
    console.log('Admin new order email sent to:', adminEmail);
  } catch (err: any) {
    console.error('Admin email error:', err.message);
  }
};