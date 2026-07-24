export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          address: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          final_price: number | null
          id: string
          is_emergency: boolean
          latitude: number | null
          longitude: number | null
          quoted_price: number | null
          scheduled_at: string | null
          service_description: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          worker_id: string
          worker_notes: string | null
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          final_price?: number | null
          id?: string
          is_emergency?: boolean
          latitude?: number | null
          longitude?: number | null
          quoted_price?: number | null
          scheduled_at?: string | null
          service_description: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          worker_id: string
          worker_notes?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          final_price?: number | null
          id?: string
          is_emergency?: boolean
          latitude?: number | null
          longitude?: number | null
          quoted_price?: number | null
          scheduled_at?: string | null
          service_description?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          worker_id?: string
          worker_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_group: string
          created_at: string
          emergency_capable: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_group: string
          created_at?: string
          emergency_capable?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_group?: string
          created_at?: string
          emergency_capable?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          booking_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          booking_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          behaviour: number | null
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          photos: string[]
          punctuality: number | null
          quality: number | null
          rating: number
          value: number | null
          worker_id: string
        }
        Insert: {
          behaviour?: number | null
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          photos?: string[]
          punctuality?: number | null
          quality?: number | null
          rating: number
          value?: number | null
          worker_id: string
        }
        Update: {
          behaviour?: number | null
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          photos?: string[]
          punctuality?: number | null
          quality?: number | null
          rating?: number
          value?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          sort_order: number
          worker_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          worker_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_gallery_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          latitude: number
          longitude: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          latitude: number
          longitude: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          latitude?: number
          longitude?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_locations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          address: string | null
          approx_latitude: number | null
          approx_longitude: number | null
          bio: string | null
          category_id: string | null
          created_at: string
          emergency_available: boolean
          experience_years: number | null
          headline: string | null
          hourly_rate: number | null
          id: string
          is_online: boolean
          is_verified: boolean
          jobs_completed: number
          languages: string[] | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          minimum_charge: number | null
          negotiable: boolean
          rating_avg: number
          rating_count: number
          response_minutes: number | null
          service_radius_km: number
          skills: string[] | null
          status: Database["public"]["Enums"]["worker_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approx_latitude?: number | null
          approx_longitude?: number | null
          bio?: string | null
          category_id?: string | null
          created_at?: string
          emergency_available?: boolean
          experience_years?: number | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_online?: boolean
          is_verified?: boolean
          jobs_completed?: number
          languages?: string[] | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          minimum_charge?: number | null
          negotiable?: boolean
          rating_avg?: number
          rating_count?: number
          response_minutes?: number | null
          service_radius_km?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["worker_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approx_latitude?: number | null
          approx_longitude?: number | null
          bio?: string | null
          category_id?: string | null
          created_at?: string
          emergency_available?: boolean
          experience_years?: number | null
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          is_online?: boolean
          is_verified?: boolean
          jobs_completed?: number
          languages?: string[] | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          minimum_charge?: number | null
          negotiable?: boolean
          rating_avg?: number
          rating_count?: number
          response_minutes?: number | null
          service_radius_km?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["worker_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_booking_participant: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "customer"
      booking_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rejected"
      worker_status: "pending" | "approved" | "suspended" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "worker", "customer"],
      booking_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ],
      worker_status: ["pending", "approved", "suspended", "rejected"],
    },
  },
} as const
