import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
// Import the client component
import EditPollForm from './EditPollForm';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    notFound();
  }
  
  // Check if the current user is the owner of the poll
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || poll.user_id !== user.id) {
    // Redirect to unauthorized page or polls list
    redirect('/polls');
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  );
}