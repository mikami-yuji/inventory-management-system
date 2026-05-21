"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// 価格改定インポートダイアログのprops型定義
type PriceRevisionImportDialogProps = {
  onSuccess?: () => void
}

export function PriceRevisionImportDialog({ onSuccess }: PriceRevisionImportDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [effectiveDate, setEffectiveDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; successCount: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // インポートが成功したかどうかを追跡するフラグ
  const [importSucceeded, setImportSucceeded] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('ファイルを選択してください')
      return
    }
    if (!effectiveDate) {
      setError('改定日を選択してください')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('effectiveDate', effectiveDate)

    try {
      const response = await fetch('/api/prices/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      setResult(data)
      if (data.successCount > 0) {
        setImportSucceeded(true)
        onSuccess?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = (): void => {
    setFile(null)
    setEffectiveDate('')
    setResult(null)
    setError(null)
    setImportSucceeded(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // ダイアログを閉じる際、インポート成功済みならデータを再取得
        if (importSucceeded) {
          onSuccess?.()
        }
        resetForm()
      }
      setIsOpen(open)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          価格改定アップロード
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>価格改定の一括予約</DialogTitle>
            <DialogDescription>
              Excelファイル（.xlsx）をアップロードして、指定した日付以降の価格を一括で予約します。
              1行目はヘッダーとし、「受注№」「単価」の列が必要です。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="effectiveDate">改定日（有効開始日）</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="file">Excelファイル</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">アップロード完了</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p>{result.message}</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-semibold text-red-600">一部エラーがありました:</p>
                      <ul className="list-disc pl-4 max-h-32 overflow-y-auto text-red-600">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              閉じる
            </Button>
            <Button type="submit" disabled={isLoading || !file || !effectiveDate}>
              {isLoading ? '処理中...' : 'アップロード'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
