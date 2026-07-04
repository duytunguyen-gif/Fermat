import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Hồ sơ cá nhân" };

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="Hồ sơ cá nhân"
      description="Xem và cập nhật thông tin cá nhân của bạn."
      cluster="Cụm 1"
    />
  );
}
