import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types (will be generated from schema later)
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          admin_id: string;
          lunch_price: number;
          ot_meal_price: number;
          lunch_time_start: string;
          lunch_time_end: string;
          ot_time_start: string;
          ot_time_end: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          admin_id: string;
          lunch_price?: number;
          ot_meal_price?: number;
          lunch_time_start?: string;
          lunch_time_end?: string;
          ot_time_start?: string;
          ot_time_end?: string;
          created_at?: string;
        };
        Update: {
          id: string;
          name?: string;
          admin_id?: string;
          lunch_price?: number;
          ot_meal_price?: number;
          lunch_time_start?: string;
          lunch_time_end?: string;
          ot_time_start?: string;
          ot_time_end?: string;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          pin: string;
          fingerprint_template: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          pin: string;
          fingerprint_template?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id: string;
          company_id?: string;
          name?: string;
          pin?: string;
          fingerprint_template?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_credits: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          lunch_available: boolean;
          ot_meal_available: boolean;
        };
        Insert: {
          id: string;
          employee_id: string;
          date: string;
          lunch_available?: boolean;
          ot_meal_available?: boolean;
        };
        Update: {
          id: string;
          employee_id?: string;
          date?: string;
          lunch_available?: boolean;
          ot_meal_available?: boolean;
        };
      };
      transactions: {
        Row: {
          id: string;
          employee_id: string;
          company_id: string;
          meal_type: 'LUNCH' | 'OT_MEAL';
          amount: number;
          timestamp: string;
          is_override: boolean;
          override_reason: string | null;
          status: 'VALID' | 'FLAGGED';
        };
        Insert: {
          id: string;
          employee_id: string;
          company_id: string;
          meal_type: 'LUNCH' | 'OT_MEAL';
          amount: number;
          timestamp?: string;
          is_override?: boolean;
          override_reason?: string;
          status?: 'VALID' | 'FLAGGED';
        };
      };
      daily_reports: {
        Row: {
          id: string;
          company_id: string;
          date: string;
          lunch_count: number;
          ot_meal_count: number;
          total_cost: number;
          employee_list: any;
        };
        Insert: {
          id: string;
          company_id: string;
          date: string;
          lunch_count?: number;
          ot_meal_count?: number;
          total_cost?: number;
          employee_list?: any;
        };
        Update: {
          id: string;
          company_id?: string;
          date?: string;
          lunch_count?: number;
          ot_meal_count?: number;
          total_cost?: number;
          employee_list?: any;
        };
      };
    };
  };
};
