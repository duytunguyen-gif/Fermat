"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TaskDailyUpdates,
  type DailyUpdateItem,
} from "./task-daily-updates";
import { TaskComments, type CommentItem } from "./task-comments";
import { TaskAttachments, type AttachmentItem } from "./task-attachments";

export function TaskActivityTabs({
  taskId,
  updates,
  comments,
  attachments,
  currentUserId,
  isAdmin,
  canReport,
}: {
  taskId: string;
  updates: DailyUpdateItem[];
  comments: CommentItem[];
  attachments: AttachmentItem[];
  currentUserId: string;
  isAdmin: boolean;
  canReport: boolean;
}) {
  return (
    <Tabs defaultValue="updates" className="w-full">
      <TabsList>
        <TabsTrigger value="updates">Tiến độ ({updates.length})</TabsTrigger>
        <TabsTrigger value="comments">Bình luận ({comments.length})</TabsTrigger>
        <TabsTrigger value="files">Tệp ({attachments.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="updates" className="pt-4">
        <TaskDailyUpdates taskId={taskId} updates={updates} canReport={canReport} />
      </TabsContent>
      <TabsContent value="comments" className="pt-4">
        <TaskComments
          taskId={taskId}
          comments={comments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </TabsContent>
      <TabsContent value="files" className="pt-4">
        <TaskAttachments
          taskId={taskId}
          attachments={attachments}
          currentUserId={currentUserId}
          canManage={isAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}
