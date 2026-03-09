import { Resend } from 'resend';

// resend instance is initialized on demand to prevent build errors
// if env variables are not present at build time


interface OrderEmailParams {
    orderId: string;
    clientName: string;
    items: {
        productName: string;
        quantity: number;
        unit: string;
    }[];
    shipmentSource: string;
    deliveryName?: string;
    deliveryAddress?: string;
    deliveryPhone?: string;
    toAddresses?: string[];
}

export async function sendOrderNotificationEmail(params: OrderEmailParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping email notification.');
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev';

    let toAddresses: string[] = [];

    if (params.toAddresses && params.toAddresses.length > 0) {
        toAddresses = params.toAddresses;
    } else {
        const toAddressStr = process.env.MAIL_ADMIN_ADDRESS;
        if (toAddressStr) {
            toAddresses = toAddressStr.split(',').map(email => email.trim()).filter(Boolean);
        }
    }

    if (toAddresses.length === 0) {
        console.error('Email sending failed: No valid recipient addresses (MAIL_ADMIN_ADDRESS or users with receives_order_emails=true)');
        return { success: false, error: 'No recipients found' };
    }

    console.log(`Attempting to send order notification email to: ${toAddresses.join(', ')} from: ${fromAddress}`);

    try {
        const itemsListHtml = params.items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity.toLocaleString()} ${item.unit}</td>
            </tr>
        `).join('');

        const sourceLabel = {
            'supplier': 'メーカー在庫（直送）',
            'wip': '仕掛中',
            'wip-request': '新規手配依頼',
            'inventory': '自社在庫'
        }[params.shipmentSource] || params.shipmentSource;

        const { data, error } = await resend.emails.send({
            from: `在庫管理システム <${fromAddress}>`,
            to: toAddresses,
            subject: `【新規出荷依頼】注文ID: ${params.orderId.substring(0, 8)} - ${params.clientName}様`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">新規出荷依頼のお知らせ</h2>
                    
                    <p>管理画面から新しい出荷依頼が送信されました。</p>
                    
                    <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; background-color: #f9f9f9; font-weight: bold; width: 30%;">注文ID</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${params.orderId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; background-color: #f9f9f9; font-weight: bold;">依頼元ユーザー</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${params.clientName} 様</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; background-color: #f9f9f9; font-weight: bold;">出荷元</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><span style="background-color: #e6f7ff; color: #0050b3; padding: 3px 8px; border-radius: 4px; border: 1px solid #91d5ff;">${sourceLabel}</span></td>
                        </tr>
                    </table>

                    <h3 style="margin-top: 30px; color: #444;">納品先情報</h3>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px;">
                        <p style="margin: 0 0 8px 0;"><strong>納品場所名:</strong> ${params.deliveryName || '-'}</p>
                        <p style="margin: 0 0 8px 0;"><strong>住所:</strong> ${params.deliveryAddress || '-'}</p>
                        <p style="margin: 0 0 0 0;"><strong>TEL:</strong> ${params.deliveryPhone || '-'}</p>
                    </div>

                    <h3 style="margin-top: 30px; color: #444;">注文内容</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">商品名</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">数量</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsListHtml}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                        <p>このメールは在庫管理システムから自動送信されています。</p>
                        <p>システムにログインして詳細を確認してください。</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Unexpected error sending email:', error);
        return { success: false, error };
    }
}
