import { Construction } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  cluster,
}: {
  title: string;
  description: string;
  cluster?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
          <Construction className="size-6" />
        </div>
        <p className="font-medium">Module đang được xây dựng</p>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Phần này sẽ hoàn thiện ở {cluster ?? "giai đoạn tiếp theo"} của lộ trình
          MVP.
        </p>
      </div>
    </div>
  );
}
