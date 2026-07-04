import type { Metadata } from "next";
import Image from "next/image";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordSignInForm } from "@/components/auth/password-sign-in-form";

export const metadata: Metadata = { title: "Đăng nhập" };

const ERROR_MESSAGES: Record<string, string> = {
  suspended: "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.",
  auth: "Đăng nhập thất bại. Vui lòng thử lại.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth : null;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 rounded-2xl bg-white px-6 py-4 shadow-lg shadow-sky-500/20">
        <Image
          src="/brand/logo-fermat.jpg"
          alt="FermatTech"
          width={1213}
          height={509}
          className="h-12 w-auto"
          priority
        />
      </div>
      <p className="mt-1 text-sm text-slate-300">
        Hệ thống quản lý công việc nội bộ
      </p>

      {errorMessage && (
        <p className="mt-6 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 w-full">
        <PasswordSignInForm />
      </div>

      <div className="my-6 flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-slate-700" />
        <span className="text-xs text-slate-500">hoặc</span>
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      <div className="w-full">
        <GoogleSignInButton />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Tài khoản mới đăng nhập bằng Google cần được quản trị viên duyệt trước khi
        sử dụng.
      </p>
    </div>
  );
}
