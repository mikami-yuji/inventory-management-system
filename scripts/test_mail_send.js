const { Resend } = require('resend');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.MAIL_FROM_ADDRESS;
const toAddress = process.env.MAIL_ADMIN_ADDRESS;

if (!apiKey) {
  console.error('RESEND_API_KEY is not set');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function testSend() {
  console.log('Attempting to send test email...');
  console.log(`From: ${fromAddress}`);
  console.log(`To: ${toAddress}`);

  try {
    const { data, error } = await resend.emails.send({
      from: `在庫管理システム <${fromAddress}>`,
      to: [toAddress],
      subject: '【テスト】メール機能設定完了のお知らせ',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0066cc;">メール機能の設定が完了しました</h2>
          <p>このメールは、在庫管理システムの環境変数設定後に送信されたテストメールです。</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            設定内容:<br/>
            - API Key: re_****** (設定済み)<br/>
            - From: ${fromAddress}<br/>
            - To: ${toAddress}
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Send error:', error);
    } else {
      console.log('Test email sent successfully!', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSend();
