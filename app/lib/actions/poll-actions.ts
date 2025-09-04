"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeInput, checkRateLimit } from "../utils/security";

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) {
    return { error: userError.message };
  }
  
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }
  
  // Apply rate limiting - 5 polls per minute
  if (!checkRateLimit(`create_poll_${user.id}`, 5, 60000)) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  // Sanitize inputs
  const question = sanitizeInput(formData.get("question") as string);
  const unsanitizedOptions = formData.getAll("options") as string[];
  const options = unsanitizedOptions
    .filter(Boolean)
    .map(option => sanitizeInput(option));

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question,
      options,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require login to vote for security
  if (!user) return { error: 'You must be logged in to vote.' };

  // Check if user has already voted on this poll
  const { data: existingVote, error: checkError } = await supabase
    .from("votes")
    .select("*")
    .eq("poll_id", pollId)
    .eq("user_id", user.id);
  
  if (checkError) return { error: checkError.message };
  
  if (existingVote && existingVote.length > 0) {
    return { error: "You have already voted on this poll" };
  }

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}

// DELETE POLL
export async function deletePoll(id: string) {
  const supabase = await createClient();
  
  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) {
    return { error: userError.message };
  }
  
  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }
  
  // First check if the poll belongs to the user
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();
    
  if (pollError) {
    return { error: pollError.message };
  }
  
  if (!poll) {
    return { error: "Poll not found" };
  }
  
  if (poll.user_id !== user.id) {
    return { error: "You can only delete your own polls" };
  }
  
  // Now delete the poll
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };
  
  revalidatePath("/polls");
  return { error: null };
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) {
    return { error: userError.message };
  }
  
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }
  
  // Apply rate limiting - 10 updates per minute
  if (!checkRateLimit(`update_poll_${user.id}`, 10, 60000)) {
    return { error: "Rate limit exceeded. Please try again later." };
  }

  // Sanitize inputs
  const question = sanitizeInput(formData.get("question") as string);
  const unsanitizedOptions = formData.getAll("options") as string[];
  const options = unsanitizedOptions
    .filter(Boolean)
    .map(option => sanitizeInput(option));

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question, options })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
