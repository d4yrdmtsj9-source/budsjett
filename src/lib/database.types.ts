export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
        }
      }
      renovation_projects: {
        Row: {
          id: string
          name: string
          invite_code: string
          total_budget: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          total_budget?: number
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          total_budget?: number
          created_by?: string
          created_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          project_id: string
          name: string
          budget: number
          sort_order: number
          archived: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          budget?: number
          sort_order?: number
          archived?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          budget?: number
          sort_order?: number
          archived?: boolean
          deleted_at?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          project_id: string
          name: string
          budget: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          budget?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          budget?: number
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          project_id: string
          room_id: string | null
          category_id: string | null
          description: string
          quantity: number
          unit: string | null
          unit_price: number
          total_override: number | null
          discount_percent: number | null
          discount_amount: number | null
          supplier: string | null
          expense_date: string | null
          status: string
          who_paid: string | null
          notes: string | null
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          room_id?: string | null
          category_id?: string | null
          description: string
          quantity?: number
          unit?: string | null
          unit_price?: number
          total_override?: number | null
          discount_percent?: number | null
          discount_amount?: number | null
          supplier?: string | null
          expense_date?: string | null
          status?: string
          who_paid?: string | null
          notes?: string | null
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          room_id?: string | null
          category_id?: string | null
          description?: string
          quantity?: number
          unit?: string | null
          unit_price?: number
          total_override?: number | null
          discount_percent?: number | null
          discount_amount?: number | null
          supplier?: string | null
          expense_date?: string | null
          status?: string
          who_paid?: string | null
          notes?: string | null
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      expense_attachments: {
        Row: {
          id: string
          expense_id: string
          file_path: string
          file_name: string
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          file_path: string
          file_name: string
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          file_path?: string
          file_name?: string
          created_at?: string
        }
      }
      activity_events: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          event_type: string
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          event_type?: string
          payload?: Json
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
