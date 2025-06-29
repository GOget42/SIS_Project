export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          admin_id: number
          created_at: string | null
          email: string
          first_name: string | null
          last_name: string | null
          user_id: string | null
        }
        Insert: {
          admin_id?: number
          created_at?: string | null
          email: string
          first_name?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Update: {
          admin_id?: number
          created_at?: string | null
          email?: string
          first_name?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assignment_id: string
          assignment_name: string
          course_id: number | null
          created_at: string | null
          due_date: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          assignment_id?: string
          assignment_name: string
          course_id?: number | null
          created_at?: string | null
          due_date?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          assignment_id?: string
          assignment_name?: string
          course_id?: number | null
          created_at?: string | null
          due_date?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      cards: {
        Row: {
          back_content: string
          card_id: string
          created_at: string
          flashdeck_id: string
          front_content: string
        }
        Insert: {
          back_content: string
          card_id?: string
          created_at?: string
          flashdeck_id: string
          front_content: string
        }
        Update: {
          back_content?: string
          card_id?: string
          created_at?: string
          flashdeck_id?: string
          front_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_flashdeck_id_fkey"
            columns: ["flashdeck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["flashdeck_id"]
          },
        ]
      }
      courses: {
        Row: {
          active: boolean | null
          course_id: number
          course_name: string
          ects: number
          format: string
          hours: number
          instructor_id: number | null
        }
        Insert: {
          active?: boolean | null
          course_id?: number
          course_name: string
          ects: number
          format: string
          hours: number
          instructor_id?: number | null
        }
        Update: {
          active?: boolean | null
          course_id?: number
          course_name?: string
          ects?: number
          format?: string
          hours?: number
          instructor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          description: string | null
          flashdeck_id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flashdeck_id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flashdeck_id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: number
          enrollment_date: string
          enrollment_id: number
          student_id: number
        }
        Insert: {
          course_id: number
          enrollment_date: string
          enrollment_id?: number
          student_id: number
        }
        Update: {
          course_id?: number
          enrollment_date?: string
          enrollment_id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      instructors: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          instructor_id: number
          last_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          instructor_id?: number
          last_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          instructor_id?: number
          last_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_grades: {
        Row: {
          assignment_id: string
          created_at: string | null
          enrollment_id: number
          feedback: string | null
          grade: number | null
          student_grade_id: number
          submission_date: string | null
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          enrollment_id: number
          feedback?: string | null
          grade?: number | null
          student_grade_id?: number
          submission_date?: string | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          enrollment_id?: number
          feedback?: string | null
          grade?: number | null
          student_grade_id?: number
          submission_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "student_grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          last_name: string
          student_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          last_name: string
          student_id?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          last_name?: string
          student_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
