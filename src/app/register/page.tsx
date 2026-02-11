'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage(): React.ReactNode {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        setError('')

        // バリデーション
        if (!name.trim()) {
            setError('名前を入力してください')
            return
        }
        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください')
            return
        }
        if (password !== confirmPassword) {
            setError('パスワードが一致しません')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.message || '登録に失敗しました')
                return
            }

            setSuccess(true)
            // 3秒後にログインページにリダイレクト
            setTimeout(() => {
                router.push('/login')
            }, 3000)

        } catch {
            setError('通信エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">登録完了</h2>
                        <p className="text-muted-foreground mb-4">
                            ユーザー登録が完了しました。ログインページに移動します…
                        </p>
                        <Button asChild>
                            <Link href="/login">ログインページへ</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">ユーザー登録</CardTitle>
                    <CardDescription>在庫管理システムのアカウントを作成してください</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">名前</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="見上 祐司"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="6文字以上"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="パスワードを再入力"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                minLength={6}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? '登録中...' : 'アカウント作成'}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground">
                            既にアカウントをお持ちの方は{' '}
                            <Link href="/login" className="text-primary hover:underline">
                                ログイン
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
