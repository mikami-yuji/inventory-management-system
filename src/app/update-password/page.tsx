'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage(): React.ReactNode {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    useEffect(() => {
        // ハッシュフラグメントを処理してセッションを確立する
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // 自動的にセッションがセットされるので特に何もしなくてよい
            }
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        setStatus('loading')
        setMessage('')

        if (password !== confirmPassword) {
            setStatus('error')
            setMessage('パスワードが一致しません')
            return
        }

        if (password.length < 6) {
            setStatus('error')
            setMessage('パスワードは6文字以上で入力してください')
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                setStatus('error')
                setMessage(`エラーが発生しました: ${error.message}`)
            } else {
                setStatus('success')
                setMessage('パスワードの再設定が完了しました。すぐにログイン画面へ移動します...')
                
                // 少し待ってからログイン画面へ
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
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
                    <CardTitle className="text-2xl font-bold">新しいパスワードの設定</CardTitle>
                    <CardDescription>新しいパスワードを2回入力してください</CardDescription>
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
                                ログイン画面へ進む
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
                                <Label htmlFor="password">新しいパスワード</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="6文字以上のパスワード"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">新しいパスワード（確認用）</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="もう一度入力してください"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? '設定中...' : 'パスワードを変更する'}
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
