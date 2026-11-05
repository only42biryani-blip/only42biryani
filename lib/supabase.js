import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pubtyadwysqdozzhgzyz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YnR5YWR3eXNxZG96emhnenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDgxNDEsImV4cCI6MjA5NDk4NDE0MX0.uj4V8SXb5sCouvVRq6E8GZNsvefSg0QpbsARqVQAFTk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
