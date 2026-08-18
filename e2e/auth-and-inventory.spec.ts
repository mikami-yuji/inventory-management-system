import { test, expect } from '@playwright/test';

test.describe('認証 & ログイン画面 E2E テスト', () => {
    test('ログイン画面が正常に描画され、フォーム要素が存在すること', async ({ page }) => {
        await page.goto('/login');

        // タイトルまたは見出しの確認
        await expect(page).toHaveTitle(/在庫/);

        // メールアドレスとパスワード入力欄、ログインボタンの存在確認
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"], input[name="password"]');
        const submitButton = page.locator('button[type="submit"]');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();
    });

    test('未ログイン状態で保護されたページ(/inventory)にアクセスした場合、/loginへリダイレクトされること', async ({ page }) => {
        await page.goto('/inventory');
        
        // ログインページにリダイレクトされることを確認
        await expect(page).toHaveURL(/.*login.*/);
    });
});

test.describe('在庫画面 UI 構造 E2E テスト', () => {
    test('未認証時のAPIエンドポイントへのアクセスが401を返すこと', async ({ request }) => {
        const response = await request.get('/api/inventory');
        expect(response.status()).toBe(401);
    });

    test('未認証時のユーザーAPIへのアクセスが401を返すこと', async ({ request }) => {
        const response = await request.get('/api/users');
        expect(response.status()).toBe(401);
    });

    test('未認証時の設定APIへのアクセスが401を返すこと', async ({ request }) => {
        const response = await request.get('/api/settings');
        expect(response.status()).toBe(401);
    });
});
