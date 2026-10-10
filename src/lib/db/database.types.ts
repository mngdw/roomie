export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      compatibility_scores: {
        Row: {
          id: string;
          user_low: string;
          user_high: string;
          algo_version: string;
          version_low: number;
          version_high: number;
          final_score: number;
          category_scores: Json;
          dimension_scores: Json;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_low: string;
          user_high: string;
          algo_version: string;
          version_low: number;
          version_high: number;
          final_score: number;
          category_scores: Json;
          dimension_scores: Json;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_low?: string;
          user_high?: string;
          algo_version?: string;
          version_low?: number;
          version_high?: number;
          final_score?: number;
          category_scores?: Json;
          dimension_scores?: Json;
          computed_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          match_id: string;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      geo_units: {
        Row: {
          code: string;
          level: number;
          parent_code: string | null;
          name_vi: string;
          name_en: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          level: number;
          parent_code?: string | null;
          name_vi: string;
          name_en?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          level?: number;
          parent_code?: string | null;
          name_vi?: string;
          name_en?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          status: Database["public"]["Enums"]["match_status_t"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          status?: Database["public"]["Enums"]["match_status_t"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          status?: Database["public"]["Enums"]["match_status_t"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          seq: number;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          seq?: number;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          seq?: number;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type_t"];
          actor_id: string | null;
          payload: Json;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type_t"];
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type_t"];
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      passes: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_views: {
        Row: {
          id: string;
          viewer_id: string;
          viewed_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          viewer_id: string;
          viewed_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          viewer_id?: string;
          viewed_id?: string;
          viewed_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          full_name: string;
          date_of_birth: string;
          gender: Database["public"]["Enums"]["gender_t"];
          school_or_workplace: string | null;
          occupation: string | null;
          city_code: string | null;
          district_code: string | null;
          hometown_code: string | null;
          bio: string | null;
          avatar_path: string | null;
          mbti_type: string | null;
          is_smoker: boolean;
          housing_status: Database["public"]["Enums"]["housing_status_t"];
          verification_status: Database["public"]["Enums"]["verification_status_t"];
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          full_name: string;
          date_of_birth: string;
          gender: Database["public"]["Enums"]["gender_t"];
          school_or_workplace?: string | null;
          occupation?: string | null;
          city_code?: string | null;
          district_code?: string | null;
          hometown_code?: string | null;
          bio?: string | null;
          avatar_path?: string | null;
          mbti_type?: string | null;
          is_smoker?: boolean;
          housing_status: Database["public"]["Enums"]["housing_status_t"];
          verification_status?: Database["public"]["Enums"]["verification_status_t"];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          full_name?: string;
          date_of_birth?: string;
          gender?: Database["public"]["Enums"]["gender_t"];
          school_or_workplace?: string | null;
          occupation?: string | null;
          city_code?: string | null;
          district_code?: string | null;
          hometown_code?: string | null;
          bio?: string | null;
          avatar_path?: string | null;
          mbti_type?: string | null;
          is_smoker?: boolean;
          housing_status?: Database["public"]["Enums"]["housing_status_t"];
          verification_status?: Database["public"]["Enums"]["verification_status_t"];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_categories: {
        Row: {
          id: string;
          code: string;
          name_vi: string;
          name_en: string | null;
          description_vi: string | null;
          weight: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_vi: string;
          name_en?: string | null;
          description_vi?: string | null;
          weight: number;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_vi?: string;
          name_en?: string | null;
          description_vi?: string | null;
          weight?: number;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          value: number;
          code: string | null;
          label_vi: string;
          label_en: string | null;
          sort_order: number;
          allows_other: boolean;
          is_proposed_label: boolean;
        };
        Insert: {
          id?: string;
          question_id: string;
          value: number;
          code?: string | null;
          label_vi: string;
          label_en?: string | null;
          sort_order: number;
          allows_other?: boolean;
          is_proposed_label?: boolean;
        };
        Update: {
          id?: string;
          question_id?: string;
          value?: number;
          code?: string | null;
          label_vi?: string;
          label_en?: string | null;
          sort_order?: number;
          allows_other?: boolean;
          is_proposed_label?: boolean;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          number: number;
          category_id: string;
          code: string;
          type: Database["public"]["Enums"]["question_type_t"];
          text_vi: string;
          text_en: string | null;
          sort_order: number;
          is_required: boolean;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          category_id: string;
          code: string;
          type: Database["public"]["Enums"]["question_type_t"];
          text_vi: string;
          text_en?: string | null;
          sort_order: number;
          is_required?: boolean;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          number?: number;
          category_id?: string;
          code?: string;
          type?: Database["public"]["Enums"]["question_type_t"];
          text_vi?: string;
          text_en?: string | null;
          sort_order?: number;
          is_required?: boolean;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      room_images: {
        Row: {
          id: string;
          room_id: string;
          kind: Database["public"]["Enums"]["media_kind_t"];
          storage_path: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          kind?: Database["public"]["Enums"]["media_kind_t"];
          storage_path: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          kind?: Database["public"]["Enums"]["media_kind_t"];
          storage_path?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      room_preferences: {
        Row: {
          user_id: string;
          preferred_district_codes: string[];
          budget_min: number | null;
          budget_max: number;
          room_types: Database["public"]["Enums"]["room_type_t"][];
          move_in_date: string;
          move_in_flex_days: number;
          must_have_facilities: string[];
          require_media: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_district_codes?: string[];
          budget_min?: number | null;
          budget_max: number;
          room_types?: Database["public"]["Enums"]["room_type_t"][];
          move_in_date: string;
          move_in_flex_days?: number;
          must_have_facilities?: string[];
          require_media?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          preferred_district_codes?: string[];
          budget_min?: number | null;
          budget_max?: number;
          room_types?: Database["public"]["Enums"]["room_type_t"][];
          move_in_date?: string;
          move_in_flex_days?: number;
          must_have_facilities?: string[];
          require_media?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roommate_preferences: {
        Row: {
          user_id: string;
          accepted_genders: Database["public"]["Enums"]["gender_t"][];
          age_min: number | null;
          age_max: number | null;
          age_is_dealbreaker: boolean;
          smoking_policy: Database["public"]["Enums"]["smoking_policy_t"];
          requirement_tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          accepted_genders?: Database["public"]["Enums"]["gender_t"][];
          age_min?: number | null;
          age_max?: number | null;
          age_is_dealbreaker?: boolean;
          smoking_policy?: Database["public"]["Enums"]["smoking_policy_t"];
          requirement_tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          accepted_genders?: Database["public"]["Enums"]["gender_t"][];
          age_min?: number | null;
          age_max?: number | null;
          age_is_dealbreaker?: boolean;
          smoking_policy?: Database["public"]["Enums"]["smoking_policy_t"];
          requirement_tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          owner_id: string;
          city_code: string;
          district_code: string;
          address_line: string | null;
          monthly_rent: number;
          deposit: number | null;
          area_m2: number | null;
          room_type: Database["public"]["Enums"]["room_type_t"];
          capacity_total: number;
          current_occupants: number;
          facilities: string[];
          services: string[];
          utilities: Json;
          available_from: string;
          notes: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          city_code: string;
          district_code: string;
          address_line?: string | null;
          monthly_rent: number;
          deposit?: number | null;
          area_m2?: number | null;
          room_type: Database["public"]["Enums"]["room_type_t"];
          capacity_total: number;
          current_occupants: number;
          facilities?: string[];
          services?: string[];
          utilities?: Json;
          available_from: string;
          notes?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          city_code?: string;
          district_code?: string;
          address_line?: string | null;
          monthly_rent?: number;
          deposit?: number | null;
          area_m2?: number | null;
          room_type?: Database["public"]["Enums"]["room_type_t"];
          capacity_total?: number;
          current_occupants?: number;
          facilities?: string[];
          services?: string[];
          utilities?: Json;
          available_from?: string;
          notes?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_answers: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          option_values: number[];
          other_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          option_values: number[];
          other_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          option_values?: number[];
          other_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          role: string;
          is_searching: boolean;
          answers_version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          role?: string;
          is_searching?: boolean;
          answers_version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          role?: string;
          is_searching?: boolean;
          answers_version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      verification_records: {
        Row: {
          id: string;
          user_id: string;
          method: string;
          status: Database["public"]["Enums"]["verification_status_t"];
          id_number_hmac: string | null;
          id_number_last4: string | null;
          pii_ciphertext: string | null;
          document_path: string | null;
          consent_version: string;
          consent_at: string;
          submitted_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reject_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          method?: string;
          status?: Database["public"]["Enums"]["verification_status_t"];
          id_number_hmac?: string | null;
          id_number_last4?: string | null;
          pii_ciphertext?: string | null;
          document_path?: string | null;
          consent_version: string;
          consent_at: string;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          method?: string;
          status?: Database["public"]["Enums"]["verification_status_t"];
          id_number_hmac?: string | null;
          id_number_last4?: string | null;
          pii_ciphertext?: string | null;
          document_path?: string | null;
          consent_version?: string;
          consent_at?: string;
          submitted_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_lifestyle_answers: {
        Row: {
          user_id: string | null;
          question_number: number | null;
          question_code: string | null;
          question_id: string | null;
          option_values: number[] | null;
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          user_id: string | null;
          display_name: string | null;
          age: number | null;
          gender: Database["public"]["Enums"]["gender_t"] | null;
          school_or_workplace: string | null;
          occupation: string | null;
          city_code: string | null;
          district_code: string | null;
          hometown_code: string | null;
          bio: string | null;
          avatar_path: string | null;
          mbti_type: string | null;
          is_smoker: boolean | null;
          housing_status: Database["public"]["Enums"]["housing_status_t"] | null;
          is_verified: boolean | null;
          created_at: string | null;
        };
        Relationships: [];
      };
      public_room_media: {
        Row: {
          id: string | null;
          room_id: string | null;
          owner_id: string | null;
          kind: Database["public"]["Enums"]["media_kind_t"] | null;
          storage_path: string | null;
          position: number | null;
        };
        Relationships: [];
      };
      public_room_preferences: {
        Row: {
          user_id: string | null;
          preferred_district_codes: string[] | null;
          budget_min: number | null;
          budget_max: number | null;
          room_types: Database["public"]["Enums"]["room_type_t"][] | null;
          move_in_date: string | null;
          must_have_facilities: string[] | null;
          require_media: boolean | null;
          notes: string | null;
        };
        Relationships: [];
      };
      public_roommate_requirements: {
        Row: {
          user_id: string | null;
          accepted_genders: Database["public"]["Enums"]["gender_t"][] | null;
          age_min: number | null;
          age_max: number | null;
          smoking_policy: Database["public"]["Enums"]["smoking_policy_t"] | null;
          requirement_tags: string[] | null;
        };
        Relationships: [];
      };
      public_rooms: {
        Row: {
          id: string | null;
          owner_id: string | null;
          city_code: string | null;
          district_code: string | null;
          monthly_rent: number | null;
          rent_per_person: number | null;
          deposit: number | null;
          area_m2: number | null;
          room_type: Database["public"]["Enums"]["room_type_t"] | null;
          capacity_total: number | null;
          current_occupants: number | null;
          facilities: string[] | null;
          services: string[] | null;
          utilities: Json | null;
          available_from: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      fn_can_view_user: {
        Args: { p_target: string };
        Returns: boolean;
      };
      fn_is_active_match_with: {
        Args: { p_other: string };
        Returns: boolean;
      };
      fn_conversation_access: {
        Args: { p_conversation: string; p_active_only?: boolean };
        Returns: boolean;
      };
      fn_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      rpc_like_user: {
        Args: { p_target: string };
        Returns: Json;
      };
      rpc_pass_user: {
        Args: { p_target: string };
        Returns: Json;
      };
      rpc_record_profile_view: {
        Args: { p_target: string };
        Returns: void;
      };
      rpc_mark_read: {
        Args: { p_conversation: string };
        Returns: number;
      };
      rpc_get_room_address: {
        Args: { p_room: string };
        Returns: string | null;
      };
      rpc_review_verification: {
        Args: { p_record: string; p_approve: boolean; p_reason?: string };
        Returns: Json;
      };
    };
    Enums: {
      gender_t: "male" | "female" | "other";
      housing_status_t: "has_room" | "looking_for_room";
      match_status_t: "active" | "closed";
      media_kind_t: "image" | "video";
      notification_type_t: "mutual_match" | "new_like" | "passed" | "profile_view" | "new_message" | "verification_update";
      question_type_t: "scale_1_5" | "single_choice" | "multi_choice";
      room_type_t: "private" | "shared";
      smoking_policy_t: "any" | "non_smoker_only";
      verification_status_t: "unverified" | "pending" | "verified" | "rejected";
    };
  };
};
