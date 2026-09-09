import TopicPage from '@/components/TopicPage';

export default async function TopicPageContainer({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return (
    <main>
      <TopicPage topicId={topicId} />
    </main>
  );
}
