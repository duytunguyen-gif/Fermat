/**
 * Kiểu dữ liệu của Postgres schema (khớp với supabase/migrations).
 *
 * File này được viết tay theo schema thiết kế. Sau khi kết nối Supabase thật,
 * có thể tạo lại tự động bằng:
 *   npx supabase gen types typescript --project-id <id> --schema public > src/types/database.types.ts
 */

export type SystemRole =
  | "super_admin"
  | "executive"
  | "admin"
  | "manager"
  | "staff";

export type AccountStatus = "pending" | "active" | "suspended";

export type TaskParticipationRole = "lead" | "collaborator";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_customer"
  | "pending_approval"
  | "needs_revision"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type TaskType = "project" | "routine" | "periodic" | "ad_hoc";

export type NotificationType =
  | "task_assigned"
  | "status_changed"
  | "approval_requested"
  | "approved"
  | "revision_requested"
  | "due_soon"
  | "overdue"
  | "comment_added"
  | "mentioned";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assignee_added"
  | "assignee_removed"
  | "commented"
  | "attachment_added"
  | "attachment_removed"
  | "approved"
  | "revision_requested";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          system_role: SystemRole;
          account_status: AccountStatus;
          department_id: string | null;
          phone: string | null;
          real_name: string | null;
          employee_code: string | null;
          job_title: string | null;
          date_of_birth: string | null;
          address: string | null;
          can_manage_attendance: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          system_role?: SystemRole;
          account_status?: AccountStatus;
          department_id?: string | null;
          phone?: string | null;
          real_name?: string | null;
          employee_code?: string | null;
          job_title?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          can_manage_attendance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          task_type: TaskType;
          department_id: string;
          created_by: string;
          approver_id: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          cancelled_reason: string | null;
          revision_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          task_type?: TaskType;
          department_id: string;
          created_by: string;
          approver_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          cancelled_reason?: string | null;
          revision_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      task_assignees: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          participation_role: TaskParticipationRole;
          assigned_by: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          participation_role?: TaskParticipationRole;
          assigned_by: string;
          assigned_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["task_assignees"]["Insert"]
        >;
        Relationships: [];
      };
      task_daily_updates: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          update_date: string;
          progress_percent: number | null;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          update_date?: string;
          progress_percent?: number | null;
          content: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["task_daily_updates"]["Insert"]
        >;
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["task_comments"]["Insert"]
        >;
        Relationships: [];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          uploaded_by: string;
          attachment_type: "file" | "link";
          file_path: string | null;
          url: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          uploaded_by: string;
          attachment_type: "file" | "link";
          file_path?: string | null;
          url?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["task_attachments"]["Insert"]
        >;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: NotificationType;
          task_id: string | null;
          actor_id: string | null;
          title: string;
          body: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: NotificationType;
          task_id?: string | null;
          actor_id?: string | null;
          title: string;
          body?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          task_id: string | null;
          actor_id: string | null;
          action: ActivityAction;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          task_id?: string | null;
          actor_id?: string | null;
          action: ActivityAction;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["activity_logs"]["Insert"]
        >;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          work_date: string;
          check_in_at: string | null;
          check_out_at: string | null;
          work_hours: number | null;
          is_late: boolean;
          note: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          work_date?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          work_hours?: number | null;
          is_late?: boolean;
          note?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      system_role: SystemRole;
      account_status: AccountStatus;
      task_participation_role: TaskParticipationRole;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      task_type: TaskType;
      notification_type: NotificationType;
      activity_action: ActivityAction;
    };
    CompositeTypes: Record<never, never>;
  };
}
