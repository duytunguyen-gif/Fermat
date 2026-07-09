"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Đổi mật khẩu đăng nhập của chính người dùng hiện tại.
 * Gọi supabase.auth.updateUser({ password }) từ trình duyệt (áp cho phiên đang đăng nhập).
 */
export function PasswordChangeCard() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (pwd !== confirm) {
      toast.error("Mật khẩu nhập lại không khớp.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) {
      toast.error("Đổi mật khẩu thất bại", { description: error.message });
      return;
    }
    toast.success("Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.");
    setPwd("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu đăng nhập</CardTitle>
          <CardDescription>
            Đặt mật khẩu mới cho tài khoản email của bạn. Tối thiểu 6 ký tự.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">Mật khẩu mới</Label>
              <Input
                id="new-pwd"
                type="password"
                value={pwd}
                autoComplete="new-password"
                placeholder="Ít nhất 6 ký tự"
                onChange={(e) => setPwd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd">Nhập lại mật khẩu mới</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirm}
                autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !pwd || !confirm}>
              {loading ? "Đang cập nhật…" : "Đổi mật khẩu"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
