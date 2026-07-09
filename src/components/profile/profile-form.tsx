"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ProfileInitial = {
  full_name: string;
  real_name: string;
  email: string;
  phone: string;
  employee_code: string;
  job_title: string;
  date_of_birth: string;
  address: string;
  role_label: string;
  department_name: string;
};

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    full_name: initial.full_name,
    real_name: initial.real_name,
    phone: initial.phone,
    employee_code: initial.employee_code,
    job_title: initial.job_title,
    date_of_birth: initial.date_of_birth,
    address: initial.address,
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateMyProfile(form);
      if (res.status === "error") toast.error(res.message);
      else {
        toast.success(res.message);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Cập nhật họ tên, số điện thoại và các thông tin liên hệ của bạn.
            Những thông tin này dùng cho báo cáo và danh bạ nội bộ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Thông tin chỉ đọc */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email đăng nhập">
              <Input value={initial.email} disabled readOnly />
            </Field>
            <Field label="Vai trò · Phòng ban">
              <Input
                value={`${initial.role_label}${
                  initial.department_name ? ` · ${initial.department_name}` : ""
                }`}
                disabled
                readOnly
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên hiển thị" htmlFor="full_name" required>
              <Input
                id="full_name"
                value={form.full_name}
                maxLength={120}
                required
                onChange={(e) => set("full_name", e.target.value)}
              />
            </Field>
            <Field label="Họ và tên thật" htmlFor="real_name">
              <Input
                id="real_name"
                value={form.real_name}
                maxLength={120}
                placeholder="Họ và tên đầy đủ theo giấy tờ"
                onChange={(e) => set("real_name", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số điện thoại" htmlFor="phone">
              <Input
                id="phone"
                value={form.phone}
                maxLength={20}
                inputMode="tel"
                placeholder="VD: 0912 345 678"
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Mã nhân viên" htmlFor="employee_code">
              <Input
                id="employee_code"
                value={form.employee_code}
                maxLength={40}
                placeholder="VD: NV001"
                onChange={(e) => set("employee_code", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chức danh" htmlFor="job_title">
              <Input
                id="job_title"
                value={form.job_title}
                maxLength={120}
                placeholder="VD: Chuyên viên khảo thí"
                onChange={(e) => set("job_title", e.target.value)}
              />
            </Field>
            <Field label="Ngày sinh" htmlFor="date_of_birth">
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                max="2100-01-01"
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Địa chỉ" htmlFor="address">
            <Textarea
              id="address"
              value={form.address}
              maxLength={255}
              rows={2}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu hồ sơ"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
