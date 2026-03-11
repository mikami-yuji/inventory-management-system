'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage(): React.ReactNode {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        setStatus('loading')
        setMessage('')

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) {
                setStatus('error')
                setMessage(`エラーが発生しました: ${error.message}`)
            } else {
                setStatus('success')
                setMessage('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。')
            }
        } catch {
            setStatus('error')
            setMessage('予期せぬエラーが発生しました。')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">パスワード再設定</CardTitle>
                    <CardDescription>登録しているメールアドレスを入力してください</CardDescription>
                </CardHeader>
                <CardContent>
                    {status === 'success' ? (
                        <div className="space-y-4">
                            <Alert className="bg-green-50 text-green-800 border-green-200">
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                            <Button
                                className="w-full"
                                onClick={() => router.push('/login')}
                            >
                                ログイン画面に戻る
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (
                                <Alert variant="destructive">
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? '送信中...' : 'リセット用のメールを送信'}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground mt-4">
                                <Link href="/login" className="text-primary hover:underline">
                                    ログイン画面に戻る
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
