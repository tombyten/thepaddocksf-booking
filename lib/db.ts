import { sql } from "@vercel/postgres";

export { sql };

export type Role = "admin" | "member";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
};

export type Booking = {
  id: string;
  user_id: string;
  bay_id: number;
  start_time: string;
  end_time: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
};
