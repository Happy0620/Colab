import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOrderConfirmationEmail = async (toEmail: string, userName: string, order: any) => {
  const itemsList = order.items.map((item: any) =>
    '<tr><td style="padding:8px 0">' + item.name + ' x' + item.quantity + '</td><td style="text-align:right;font-weight:600">$' + (item.price * item.quantity).toFixed(2) + '</td></tr>'
  ).join('');
  const html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto">'
    + '<div style="background:linear-gradient(135deg,#F88435,#FF6B35);padding:32px;text-align:center">'
    + '<h1 style="color:white;margin:0">Feasto</h1>'
    + '<p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Your order is confirmed!</p>'
    + '</div>'
    + '<div style="padding:32px">'
    + '<h2>Hey ' + userName + '!</h2>'
    + '<p style="color:#666">Your order has been placed successfully.</p>'
    + '<table style="width:100%">' + itemsList + '</table>'
    + '<div style="margin-top:16px;padding-top:16px;border-top:2px solid #f0f0f0">'
    + '<strong>Total: $' + order.totalAmount.toFixed(2) + '</strong>'
    + '</div>'
    + '<p style="color:#aaa;font-size:0.8rem">Thank you for ordering with Feasto!</p>'
    + '</div></div>';
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
  try {
    await transporter.sendMail({
      from: '"Feasto" <' + process.env.EMAIL_USER + '>',
      to: toEmail,
      subject: 'Order Update - ' + status + ' | Feasto',
      html: '<div style="font-family:sans-serif;text-align:center;padding:32px"><h1 style="color:#F88435">Feasto</h1><h2>' + msg + '</h2><p style="color:#666">Thank you for choosing Feasto!</p></div>'
    });
    console.log('Status email sent:', status);
  } catch (err: any) {
    console.error('Email error:', err.message);
  }
};